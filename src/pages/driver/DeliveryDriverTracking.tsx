import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bike, CheckCircle, Clock, MapPin, Navigation, Package,
  Store, XCircle, PhoneCall,
} from "lucide-react";
import TrackingInfoTable from "@/components/TrackingInfoTable";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import LeafletMap from "@/components/LeafletMap";
import { useSmoothedPosition } from "@/hooks/useSmoothedPosition";
import { useI18n } from "@/i18n/context";
import { useInAppCall } from "@/hooks/useInAppCall";
import InAppCallDialog from "@/components/calls/InAppCallDialog";
import RatingDialog from "@/components/RatingDialog";
import { toast } from "@/hooks/use-toast";

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

interface OrderData {
  id: string;
  status: string;
  store_name: string | null;
  store_id: string | null;
  pickup_address: string | null;
  delivery_address: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  estimated_price: number | null;
  total_price: number | null;
  delivery_fee: number | null;
  user_id: string;
  driver_id: string | null;
  order_code: string | null;
  items: any;
  distance: number | null;
}

const STATUS_FLOW = [
  { key: "driver_assigned", label: "تم القبول", icon: CheckCircle, colors: "from-blue-500 to-cyan-500" },
  { key: "on_the_way_to_vendor", label: "في الطريق للمطعم", icon: Navigation, colors: "from-cyan-500 to-blue-500" },
  { key: "picked_up", label: "تم الاستلام من المطعم", icon: Store, colors: "from-amber-500 to-orange-500" },
  { key: "on_the_way_to_customer", label: "في الطريق للزبون", icon: Bike, colors: "from-emerald-500 to-teal-500" },
  { key: "delivered", label: "تم التسليم", icon: CheckCircle, colors: "from-emerald-500 to-green-500" },
];

const DeliveryDriverTracking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderIdParam = searchParams.get("id");
  const [orderId, setOrderId] = useState<string | null>(orderIdParam);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [customerRefCode, setCustomerRefCode] = useState<string | null>(null);
  const [storePhone, setStorePhone] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [driverId, setDriverId] = useState<string | null>(null);
  const { dir } = useI18n();
  const inAppCall = useInAppCall();

  // Auto-find active delivery order
  useEffect(() => {
    if (orderIdParam) { setOrderId(orderIdParam); return; }
    const findActive = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: driver } = await supabase.from("drivers").select("id").eq("user_id", user.id).single();
      if (!driver) { setLoading(false); return; }
      setDriverId(driver.id);
      const { data } = await supabase
        .from("delivery_orders").select("id")
        .eq("driver_id", driver.id)
        .in("status", ["driver_assigned", "on_the_way_to_vendor", "picked_up", "on_the_way_to_customer"])
        .order("created_at", { ascending: false }).limit(1);
      if (data && data.length > 0) setOrderId(data[0].id);
      else setLoading(false);
    };
    findActive();
  }, [orderIdParam]);

  // GPS watch
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watcher = navigator.geolocation.watchPosition(
      (pos) => setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000 }
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  // Sync location to DB
  useEffect(() => {
    if (!driverLocation) return;
    const updateLoc = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("drivers").update({
        current_lat: driverLocation.lat, current_lng: driverLocation.lng,
        location_updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);
    };
    const t = setTimeout(updateLoc, 4000);
    return () => clearTimeout(t);
  }, [driverLocation]);

  // Fetch order data
  const fetchOrder = useCallback(async () => {
    if (!orderId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from("delivery_orders").select("*").eq("id", orderId).single();
    if (data) {
      setOrder(data as OrderData);
      // Get customer ref code
      const { data: profile } = await supabase.from("profiles").select("user_code").eq("id", data.user_id).maybeSingle();
      if (profile) setCustomerRefCode((profile as any).user_code || null);
      // Get store phone
      if (data.store_id) {
        const { data: store } = await supabase.from("stores").select("phone").eq("id", data.store_id).single();
        setStorePhone(store?.phone || null);
      }
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
    if (!orderId) return;
    const channel = supabase
      .channel(`del-track-${orderId}-${Date.now()}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "delivery_orders", filter: `id=eq.${orderId}` },
        (payload) => setOrder(payload.new as OrderData))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orderId, fetchOrder]);

  const smoothedDriver = useSmoothedPosition(driverLocation);

  // Target position: before pickup → vendor, after pickup → customer
  const targetPosition = useMemo(() => {
    if (!order) return null;
    if (["driver_assigned", "on_the_way_to_vendor"].includes(order.status) && order.pickup_lat != null)
      return { lat: Number(order.pickup_lat), lng: Number(order.pickup_lng) };
    if (["picked_up", "on_the_way_to_customer"].includes(order.status) && order.delivery_lat != null)
      return { lat: Number(order.delivery_lat), lng: Number(order.delivery_lng) };
    return null;
  }, [order]);

  const distanceToTarget = useMemo(() => {
    if (!driverLocation || !targetPosition) return null;
    return haversineKm(driverLocation, targetPosition);
  }, [driverLocation, targetPosition]);

  useEffect(() => {
    if (distanceToTarget != null && initialDistance == null) setInitialDistance(distanceToTarget);
  }, [distanceToTarget, initialDistance]);

  useEffect(() => { setInitialDistance(null); }, [order?.status]);

  const progress = useMemo(() => {
    if (initialDistance == null || initialDistance === 0 || distanceToTarget == null) return 0;
    return Math.min(1, Math.max(0, 1 - distanceToTarget / initialDistance));
  }, [distanceToTarget, initialDistance]);

  const etaMinutes = distanceToTarget ? Math.max(1, Math.round(distanceToTarget * 2.5)) : null;

  const mapCenter = useMemo(
    () => smoothedDriver || targetPosition || { lat: 35.7595, lng: -5.834 },
    [smoothedDriver, targetPosition]
  );

  // Show route from store → customer so both locations are always visible
  const storePosition = useMemo(() => {
    if (order?.pickup_lat != null && order?.pickup_lng != null)
      return { lat: Number(order.pickup_lat), lng: Number(order.pickup_lng) };
    return null;
  }, [order?.pickup_lat, order?.pickup_lng]);

  const customerPosition = useMemo(() => {
    if (order?.delivery_lat != null && order?.delivery_lng != null)
      return { lat: Number(order.delivery_lat), lng: Number(order.delivery_lng) };
    return null;
  }, [order?.delivery_lat, order?.delivery_lng]);

  // Throttled route: only update pickup point every 30s to avoid OSRM rate limits
  const lastRouteFetchRef = useRef<number>(0);
  const [throttledDriverPos, setThrottledDriverPos] = useState(smoothedDriver);

  useEffect(() => {
    if (!smoothedDriver) return;
    const now = Date.now();
    // Always update on first position or when status changes
    if (!throttledDriverPos || now - lastRouteFetchRef.current > 30000) {
      setThrottledDriverPos(smoothedDriver);
      lastRouteFetchRef.current = now;
    }
  }, [smoothedDriver, order?.status]);

  // Reset throttled position on status change to force route re-fetch
  useEffect(() => {
    if (smoothedDriver) {
      setThrottledDriverPos(smoothedDriver);
      lastRouteFetchRef.current = Date.now();
    }
  }, [order?.status]);

  const mapRoute = useMemo(() => {
    if (throttledDriverPos && targetPosition) return { pickup: throttledDriverPos, destination: targetPosition };
    if (storePosition && customerPosition) return { pickup: storePosition, destination: customerPosition };
    return null;
  }, [throttledDriverPos, storePosition, customerPosition, targetPosition]);

  // Blue when heading to store, green when heading to customer
  const routeColor = useMemo(() => {
    if (!order) return "#3b82f6";
    if (["driver_assigned", "on_the_way_to_vendor"].includes(order.status)) return "#3b82f6";
    return "#10b981";
  }, [order?.status]);

  const currentStepIdx = order ? STATUS_FLOW.findIndex(s => s.key === order.status) : -1;
  const currentStep = STATUS_FLOW[currentStepIdx] || null;
  const isFinished = order?.status === "delivered" || order?.status === "cancelled";

  const handleStatusUpdate = async (newStatus: string) => {
    if (!orderId || updating) return;
    setUpdating(true);
    try {
      const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === "picked_up") updates.picked_up_at = new Date().toISOString();
      if (newStatus === "delivered") updates.delivered_at = new Date().toISOString();
      await supabase.from("delivery_orders").update(updates).eq("id", orderId);
      if (newStatus === "delivered") {
        toast({ title: "تم التسليم بنجاح ✅" });
        setShowRating(true); // Show rating dialog before navigating
      }
    } catch (err: any) { console.error(err); }
    finally { setUpdating(false); }
  };

  const nextAction = order?.status === "driver_assigned"
    ? { label: "🏍️ في الطريق للمطعم", status: "on_the_way_to_vendor", colors: "from-cyan-500 to-blue-500" }
    : order?.status === "on_the_way_to_vendor"
    ? { label: "📦 تم الاستلام من المطعم", status: "picked_up", colors: "from-amber-500 to-orange-500" }
    : order?.status === "picked_up"
    ? { label: "🏍️ في الطريق للزبون", status: "on_the_way_to_customer", colors: "from-emerald-500 to-teal-500" }
    : order?.status === "on_the_way_to_customer"
    ? { label: "✅ تم التسليم", status: "delivered", colors: "from-emerald-500 to-green-500" }
    : null;

  // Loading state
  if (loading) return (
    <div className="h-[calc(100dvh-2.75rem)] bg-background flex items-center justify-center" dir={dir}>
      <div className="text-primary animate-pulse text-lg">جارٍ التحميل...</div>
    </div>
  );
  if (!orderId || !order) return (
    <div className="h-[calc(100dvh-2.75rem)] bg-background flex flex-col items-center justify-center gap-4" dir={dir}>
      <MapPin className="w-14 h-14 text-muted-foreground/30" />
      <p className="text-muted-foreground text-lg">لا توجد طلبية نشطة</p>
      <Button onClick={() => navigate("/delivery")} className="rounded-xl">العودة</Button>
    </div>
  );

  const targetLabel = ["driver_assigned", "on_the_way_to_vendor"].includes(order.status)
    ? order.store_name || order.pickup_address || "المطعم"
    : order.delivery_address || "الزبون";

  return (
    <div className="h-[calc(100dvh-2.75rem)] flex flex-col bg-background overflow-hidden" dir={dir}>
      {/* ── Fullscreen Map ── */}
      <div className="flex-1 relative min-h-0">
        {/* Glossy black borders */}
        <div className="absolute top-0 bottom-0 left-0 w-1 z-[1002] bg-gradient-to-b from-zinc-700 via-zinc-900 to-zinc-700 shadow-[0_0_6px_rgba(0,0,0,0.8)]" />
        <div className="absolute top-0 bottom-0 right-0 w-1 z-[1002] bg-gradient-to-b from-zinc-700 via-zinc-900 to-zinc-700 shadow-[0_0_6px_rgba(0,0,0,0.8)]" />

        <LeafletMap
          center={mapCenter}
          zoom={16}
          className="w-full h-full"
          showMarker={!!targetPosition}
          markerPosition={targetPosition || undefined}
          driverLocation={smoothedDriver}
          driverIconType="motorcycle"
          route={mapRoute}
          routeColor={routeColor}
          hideControls
        />

        {/* Distance/ETA shown in bottom panel only */}

        {/* Back button */}
        <button
          onClick={() => navigate("/delivery")}
          className="absolute top-4 right-4 z-[1001] w-10 h-10 bg-card/90 backdrop-blur-xl rounded-full flex items-center justify-center border border-border shadow-lg"
        >
          <Navigation className="w-5 h-5 text-foreground" />
        </button>

        {/* Customer ref shown in bottom panel */}

        {/* Target label */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1001] bg-card/90 backdrop-blur-xl px-4 py-2 rounded-xl text-xs flex items-center gap-2 border border-border shadow-lg">
          <Store className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{targetLabel}</span>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 z-[1002] h-1.5 bg-muted/50">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
            initial={{ width: "0%" }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* ── Bottom Action Panel ── */}
      <div className="shrink-0 bg-card border-t border-border safe-area-bottom">
        {/* Status steps */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-1">
            {STATUS_FLOW.map((step, i) => (
              <div key={step.key} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                i <= currentStepIdx ? "bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.4)]" : "bg-muted"
              }`} />
            ))}
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {currentStep ? `${currentStep.label}` : order.status}
            </span>
            <span className="text-lg font-black text-primary">
              {order.total_price || order.estimated_price || order.delivery_fee || "—"} DH
            </span>
          </div>
        </div>

        {/* ── Info Table + Actions ── */}
        {!isFinished && (
          <div className="px-4 pb-3">
            <TrackingInfoTable
              distanceKm={distanceToTarget ?? null}
              etaMinutes={etaMinutes}
              price={order.total_price || order.estimated_price || order.delivery_fee}
              pickupLabel={order.pickup_address || "المطعم"}
              destinationLabel={order.delivery_address || "الزبون"}
              referenceCode={customerRefCode}
              referenceLabel="رمز الزبون"
              storeName={order.store_name}
              storePhone={storePhone}
              onCallClient={() => inAppCall.startCall({ id: order.user_id, name: customerRefCode || "الزبون" })}
              onCallStore={storePhone ? () => window.open(`tel:${storePhone}`) : undefined}
              callDisabled={inAppCall.busy}
              nextAction={nextAction}
              onNextAction={nextAction ? () => handleStatusUpdate(nextAction.status) : undefined}
              onCancel={() => handleStatusUpdate("cancelled")}
              updating={updating}
              orderCode={order.order_code}
            />
          </div>
        )}

        {/* Completed */}
        {order.status === "delivered" && (
          <div className="px-4 pb-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="text-center p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-2" />
              <p className="text-foreground font-bold text-lg">تم التسليم بنجاح! 🎉</p>
              <p className="text-primary font-black text-2xl mt-1">{order.total_price || order.delivery_fee || "—"} DH</p>
              <Button onClick={() => navigate("/delivery")}
                className="mt-3 w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold">
                العودة
              </Button>
            </motion.div>
          </div>
        )}

        {/* Cancelled */}
        {order.status === "cancelled" && (
          <div className="px-4 pb-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="text-center p-5 rounded-2xl bg-destructive/10 border border-destructive/20">
              <XCircle className="w-14 h-14 text-destructive mx-auto mb-2" />
              <p className="text-foreground font-bold text-lg">تم إلغاء الطلب</p>
              <Button onClick={() => navigate("/delivery")} variant="outline" className="mt-3 rounded-xl">
                العودة
              </Button>
            </motion.div>
          </div>
        )}
      </div>

      {/* In-App Call Dialog */}
      <InAppCallDialog
        incomingCall={inAppCall.incomingCall}
        activeCall={inAppCall.activeCall}
        localStream={inAppCall.localStream}
        remoteStream={inAppCall.remoteStream}
        isMuted={inAppCall.isMuted}
        isVideoEnabled={inAppCall.isVideoEnabled}
        onAccept={inAppCall.acceptCall}
        onEnd={inAppCall.endCall}
        onToggleMute={inAppCall.toggleMute}
        onToggleVideo={inAppCall.toggleVideo}
        busy={inAppCall.busy}
        callDuration={inAppCall.callDuration}
        connectionQuality={inAppCall.connectionQuality}
      />

      {/* Rating Dialog for driver to rate customer */}
      {order && driverId && (
        <RatingDialog
          open={showRating}
          onClose={() => {
            setShowRating(false);
            navigate("/delivery");
          }}
          targetUserId={order.user_id}
          driverId={driverId}
          orderId={order.id}
          ratingType="driver_to_customer"
          targetName={customerRefCode ? `الزبون ${customerRefCode}` : "الزبون"}
        />
      )}
    </div>
  );
};

export default DeliveryDriverTracking;
