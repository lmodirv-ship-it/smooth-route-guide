import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, CheckCircle, Bike, MapPin, Clock, Store, Navigation, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import LeafletMap from "@/components/LeafletMap";
import TrackingInfoTable from "@/components/TrackingInfoTable";
import { useSmoothedPosition } from "@/hooks/useSmoothedPosition";
import { useInAppCall } from "@/hooks/useInAppCall";
import InAppCallDialog from "@/components/calls/InAppCallDialog";
import TipDialog from "@/components/driver/TipDialog";
import RatingDialog from "@/components/RatingDialog";
import { toast } from "@/hooks/use-toast";

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

const steps = [
  { key: "pending", label: "بانتظار سائق", icon: Clock },
  { key: "driver_assigned", label: "السائق قبل الطلب", icon: Bike },
  { key: "on_the_way_to_vendor", label: "في الطريق للمطعم", icon: Navigation },
  { key: "picked_up", label: "تم استلام الطلب", icon: Package },
  { key: "on_the_way_to_customer", label: "في الطريق إليك", icon: Bike },
  { key: "delivered", label: "تم التوصيل", icon: MapPin },
];

const DeliveryTracking = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [driverRefCode, setDriverRefCode] = useState<string | null>(null);
  const [driverUserId, setDriverUserId] = useState<string | null>(null);
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const [throttledDriverPos, setThrottledDriverPos] = useState<{ lat: number; lng: number } | null>(null);
  const [updating, setUpdating] = useState(false);
  const lastRouteFetchRef = useRef(0);
  const inAppCall = useInAppCall();

  useEffect(() => {
    const fetchOrder = async () => {
      if (id) {
        const { data } = await supabase.from("delivery_orders").select("*").eq("id", id).single();
        if (data) setOrder(data);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("delivery_orders").select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1).single();
        if (data) setOrder(data);
      }
    };
    fetchOrder();

    const channel = supabase
      .channel(`delivery-tracking-${Date.now()}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "delivery_orders" }, (payload) => {
        setOrder((prev: any) => prev?.id === payload.new.id ? payload.new : prev);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // Driver location tracking
  useEffect(() => {
    if (!order?.driver_id) {
      setDriverLocation(null); setDriverRefCode(null); setDriverUserId(null);
      return;
    }
    const fetchDriver = async () => {
      const { data: driver } = await supabase
        .from("drivers").select("user_id, current_lat, current_lng, driver_code")
        .eq("id", order.driver_id).single();
      if (!driver) return;
      if (driver.driver_code) setDriverRefCode(driver.driver_code);
      if (driver.user_id) setDriverUserId(driver.user_id);
      if (driver.current_lat && driver.current_lng)
        setDriverLocation({ lat: Number(driver.current_lat), lng: Number(driver.current_lng) });
    };
    fetchDriver();
    const channel = supabase
      .channel(`del-driver-loc-${order.driver_id}-${Date.now()}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "drivers", filter: `id=eq.${order.driver_id}` },
        (payload) => {
          const d = payload.new as any;
          if (d.current_lat && d.current_lng) setDriverLocation({ lat: Number(d.current_lat), lng: Number(d.current_lng) });
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [order?.driver_id]);

  const smoothedDriver = useSmoothedPosition(driverLocation);

  useEffect(() => {
    if (!smoothedDriver) return;
    const now = Date.now();
    if (!throttledDriverPos || now - lastRouteFetchRef.current > 30000) {
      setThrottledDriverPos(smoothedDriver);
      lastRouteFetchRef.current = now;
    }
  }, [smoothedDriver, throttledDriverPos]);

  const pickupPos = useMemo(() => {
    if (order?.pickup_lat && order?.pickup_lng) return { lat: Number(order.pickup_lat), lng: Number(order.pickup_lng) };
    return null;
  }, [order?.pickup_lat, order?.pickup_lng]);

  const deliveryPos = useMemo(() => {
    if (order?.delivery_lat && order?.delivery_lng) return { lat: Number(order.delivery_lat), lng: Number(order.delivery_lng) };
    return null;
  }, [order?.delivery_lat, order?.delivery_lng]);

  const targetPos = useMemo(() => {
    if (!order) return null;
    if (["on_the_way_to_customer", "delivered"].includes(order.status)) return deliveryPos;
    return pickupPos;
  }, [order, pickupPos, deliveryPos]);

  const mapRoute = useMemo(() => {
    if (throttledDriverPos && targetPos) return { pickup: throttledDriverPos, destination: targetPos };
    if (pickupPos && deliveryPos) return { pickup: pickupPos, destination: deliveryPos };
    return null;
  }, [throttledDriverPos, targetPos, pickupPos, deliveryPos]);

  const routeColor = useMemo(() => {
    if (!order) return "#3b82f6";
    return ["picked_up", "on_the_way_to_customer"].includes(order.status) ? "#10b981" : "#3b82f6";
  }, [order?.status]);

  const distToTarget = useMemo(() => {
    if (!smoothedDriver || !targetPos) return null;
    return haversineKm(smoothedDriver, targetPos);
  }, [smoothedDriver, targetPos]);

  useEffect(() => {
    if (distToTarget != null && initialDistance == null) setInitialDistance(distToTarget);
  }, [distToTarget, initialDistance]);

  useEffect(() => { setInitialDistance(null); }, [order?.status]);

  const progress = useMemo(() => {
    if (initialDistance == null || initialDistance === 0 || distToTarget == null) return 0;
    return Math.min(1, Math.max(0, 1 - distToTarget / initialDistance));
  }, [distToTarget, initialDistance]);

  const etaMinutes = distToTarget ? Math.max(1, Math.round(distToTarget * 2.5)) : null;

  const mapCenter = useMemo(
    () => smoothedDriver || pickupPos || deliveryPos || { lat: 35.7595, lng: -5.834 },
    [smoothedDriver, pickupPos, deliveryPos]
  );

  const currentStep = steps.findIndex((s) => s.key === (order?.status || "pending"));
  const isCancelled = order?.status === "cancelled" || order?.status === "canceled";
  const isDelivered = order?.status === "delivered";
  const isActive = order && !isCancelled && !isDelivered;

  // Cancel order → reassign to another driver
  const handleCancel = async () => {
    if (!order || updating) return;
    setUpdating(true);
    try {
      await supabase.from("delivery_orders").update({
        status: "pending",
        driver_id: null,
        cancel_reason: "إلغاء من طرف الزبون",
        updated_at: new Date().toISOString(),
      }).eq("id", order.id);
      toast({ title: "تم إلغاء الطلب وإعادة توجيهه لسائق آخر" });
      navigate("/delivery");
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  if (!order) {
    return (
      <div className="h-[calc(100dvh-2.75rem)] flex items-center justify-center bg-background" dir="rtl">
        <div className="text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">لا يوجد طلب نشط</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-2.75rem)] flex flex-col bg-background overflow-hidden" dir="rtl">
      {/* ── Map ── */}
      <div className="flex-1 relative min-h-0">
        <div className="absolute top-0 bottom-0 left-0 w-1 z-[1002] bg-gradient-to-b from-zinc-700 via-zinc-900 to-zinc-700 shadow-[0_0_6px_rgba(0,0,0,0.8)]" />
        <div className="absolute top-0 bottom-0 right-0 w-1 z-[1002] bg-gradient-to-b from-zinc-700 via-zinc-900 to-zinc-700 shadow-[0_0_6px_rgba(0,0,0,0.8)]" />

        <LeafletMap
          center={mapCenter}
          zoom={14}
          className="w-full h-full"
          showMarker={!!deliveryPos}
          markerPosition={deliveryPos || undefined}
          driverLocation={smoothedDriver}
          driverIconType="motorcycle"
          route={mapRoute}
          routeColor={routeColor}
          expandable={false}
          hideControls
        />

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

      {/* ── Bottom Panel ── */}
      <motion.div
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        className="shrink-0 bg-card border-t border-border max-h-[48%] overflow-y-auto"
      >
        {/* Status progress */}
        {!isCancelled && (
          <div className="px-4 pt-3 pb-1">
            <div className="flex items-center gap-1">
              {steps.map((step, i) => (
                <div key={step.key} className="flex-1 relative">
                  <div className={`h-1.5 rounded-full transition-all duration-700 ${
                    i <= currentStep
                      ? "bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
                      : "bg-muted"
                  }`} />
                  {i === currentStep && i > 0 && (
                    <motion.div
                      layoutId="delivery-step-glow"
                      className="absolute -top-0.5 right-0 w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.6)]"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                {(() => { const StepIcon = steps[currentStep]?.icon; return StepIcon ? <StepIcon className="w-3 h-3" /> : null; })()}
                {steps[currentStep]?.label || order.status}
              </span>
              <span className="text-sm font-black text-primary">{order.total_price || order.estimated_price || "—"} DH</span>
            </div>
          </div>
        )}

        {/* TrackingInfoTable */}
        {isActive && (
          <div className="px-3 pb-3">
            <TrackingInfoTable
              title="تفاصيل الطلب"
              distanceKm={distToTarget ?? null}
              etaMinutes={etaMinutes}
              price={order.total_price || order.estimated_price || order.delivery_fee}
              pickupLabel={order.pickup_address || order.store_name || "المطعم"}
              destinationLabel={order.delivery_address || "موقعك"}
              referenceCode={driverRefCode || (order.status === "pending" ? "⏳ بحث..." : null)}
              referenceLabel={order.status === "pending" ? "الحالة" : "السائق"}
              storeName={order.store_name}
              orderCode={order.order_code}
              onCallClient={driverUserId ? () => inAppCall.startCall({ id: driverUserId, name: driverRefCode || "السائق" }) : undefined}
              callDisabled={inAppCall.busy}
              onCancel={handleCancel}
              updating={updating}
            />
          </div>
        )}

        {/* Delivered */}
        {isDelivered && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="mx-4 mb-4 text-center p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-3" />
            <p className="text-foreground font-bold text-lg">تم التوصيل بنجاح! 🎉</p>
            <p className="text-primary font-black text-2xl mt-1">{order.total_price || order.estimated_price || "—"} DH</p>
            <Button onClick={() => navigate("/delivery")}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-bold">
              العودة للرئيسية
            </Button>
          </motion.div>
        )}

        {/* Cancelled */}
        {isCancelled && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="mx-4 mb-4 text-center p-5 rounded-2xl bg-destructive/5 border border-destructive/20">
            <XCircle className="w-16 h-16 text-destructive/60 mx-auto mb-3" />
            <p className="text-foreground font-bold text-lg">تم إلغاء الطلب</p>
            {order.cancel_reason && <p className="text-xs text-muted-foreground mt-1">{order.cancel_reason}</p>}
            <Button onClick={() => navigate("/delivery")} variant="outline" className="mt-4 rounded-xl w-full">
              طلب جديد
            </Button>
          </motion.div>
        )}
      </motion.div>

      <InAppCallDialog
        incomingCall={inAppCall.incomingCall}
        activeCall={inAppCall.activeCall}
        localStream={inAppCall.localStream}
        remoteStream={inAppCall.remoteStream}
        isMuted={inAppCall.isMuted}
        isVideoEnabled={inAppCall.isVideoEnabled}
        busy={inAppCall.busy}
        callDuration={inAppCall.callDuration}
        connectionQuality={inAppCall.connectionQuality}
        onAccept={inAppCall.acceptCall}
        onEnd={inAppCall.endCall}
        onToggleMute={inAppCall.toggleMute}
        onToggleVideo={inAppCall.toggleVideo}
      />
    </div>
  );
};

export default DeliveryTracking;
