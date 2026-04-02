import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Package, CheckCircle, Bike, MapPin, Clock, Store, Phone, PhoneCall, Headphones, Navigation, User, XCircle, Star, Route as RouteIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import LeafletMap from "@/components/LeafletMap";
import { useSmoothedPosition } from "@/hooks/useSmoothedPosition";
import { useInAppCall } from "@/hooks/useInAppCall";
import InAppCallDialog from "@/components/calls/InAppCallDialog";

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

const steps = [
  { key: "pending_call_center", label: "بانتظار مركز الاتصال", icon: Headphones },
  { key: "confirmed", label: "تم تأكيد الطلب", icon: CheckCircle },
  { key: "ready_for_driver", label: "جاهز للسائق", icon: User },
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
  const [driverRating, setDriverRating] = useState<number | null>(null);
  const [driverPhone, setDriverPhone] = useState<string | null>(null);
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const [throttledDriverPos, setThrottledDriverPos] = useState<{ lat: number; lng: number } | null>(null);
  const lastRouteFetchRef = useRef(0);

  useEffect(() => {
    const fetchOrder = async () => {
      if (id) {
        const { data } = await supabase.from("delivery_orders").select("*").eq("id", id).single();
        if (data) setOrder(data);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("delivery_orders")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (data) setOrder(data);
      }
    };
    fetchOrder();

    const channel = supabase
      .channel(`delivery-tracking-${Date.now()}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "delivery_orders" }, (payload) => {
        setOrder((prev: any) => {
          if (!prev) return prev;
          if (prev.id === payload.new.id) return payload.new;
          return prev;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // Driver location tracking
  useEffect(() => {
    if (!order?.driver_id) {
      setDriverLocation(null); setDriverRefCode(null); setDriverRating(null); setDriverPhone(null);
      return;
    }
    const fetchDriver = async () => {
      const { data: driver } = await supabase
        .from("drivers").select("user_id, current_lat, current_lng, driver_code, rating")
        .eq("id", order.driver_id).single();
      if (!driver) return;
      if (driver.driver_code) setDriverRefCode(driver.driver_code);
      if (driver.rating) setDriverRating(Number(driver.rating));
      if (driver.current_lat && driver.current_lng) {
        setDriverLocation({ lat: Number(driver.current_lat), lng: Number(driver.current_lng) });
      }
      const { data: profile } = await supabase.from("profiles").select("phone").eq("id", driver.user_id).single();
      if (profile) setDriverPhone(profile.phone || null);
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

  // Throttle driver position for OSRM route fetching (every 30s)
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

  // Target: before pickup → vendor, after pickup → customer
  const targetPos = useMemo(() => {
    if (!order) return null;
    const postPickup = ["on_the_way_to_customer", "delivered"];
    if (postPickup.includes(order.status)) return deliveryPos;
    return pickupPos;
  }, [order, pickupPos, deliveryPos]);

  // Use throttled position for route to avoid OSRM rate limits
  const mapRoute = useMemo(() => {
    if (throttledDriverPos && targetPos) return { pickup: throttledDriverPos, destination: targetPos };
    if (pickupPos && deliveryPos) return { pickup: pickupPos, destination: deliveryPos };
    return null;
  }, [throttledDriverPos, targetPos, pickupPos, deliveryPos]);

  // Route color: blue → to restaurant, green → to customer
  const routeColor = useMemo(() => {
    if (!order) return "#3b82f6";
    const toCustomer = ["picked_up", "on_the_way_to_customer"];
    return toCustomer.includes(order.status) ? "#10b981" : "#3b82f6";
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

  const currentStep = steps.findIndex((s) => s.key === (order?.status || "pending_call_center"));
  const isCancelled = order?.status === "cancelled" || order?.status === "canceled";
  const isDelivered = order?.status === "delivered";
  const hasDriver = !!order?.driver_id;
  const isActive = order && !isCancelled && !isDelivered;

  const renderItems = (items: any) => {
    if (!items || !Array.isArray(items)) return null;
    return (
      <div className="space-y-1">
        {items.map((item: any, i: number) => (
          <div key={i} className="flex justify-between text-xs">
            <span className="text-primary font-bold">{(item.price * (item.qty || item.quantity || 1)).toFixed(0)} DH</span>
            <span className="text-foreground">{item.name} × {item.qty || item.quantity || 1}</span>
          </div>
        ))}
      </div>
    );
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
      {/* ═══ القسم الأول: الخريطة مع مسار حقيقي ═══ */}
      <div className="h-[50%] relative">
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

        {/* Back button */}
        <button onClick={() => navigate("/delivery")}
          className="absolute top-3 right-3 z-[1001] w-10 h-10 bg-card/90 backdrop-blur-xl rounded-full flex items-center justify-center border border-border shadow-lg">
          <ArrowRight className="w-5 h-5 text-foreground" />
        </button>

        {/* Status pill */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1001]">
          <div className="bg-card/90 backdrop-blur-xl text-foreground px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg border border-border">
            <div className={`w-2 h-2 rounded-full ${isActive ? "bg-primary animate-pulse" : isCancelled ? "bg-destructive" : "bg-emerald-500"}`} />
            {isCancelled ? "ملغي" : steps[currentStep]?.label || order.status}
          </div>
        </div>

        {/* Distance + ETA overlay */}
        {distToTarget != null && hasDriver && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1001] flex items-center gap-2">
            <div className="bg-card/90 backdrop-blur-xl px-3 py-2 rounded-xl text-xs flex items-center gap-2 border border-border shadow-lg">
              <Bike className="w-3.5 h-3.5 text-primary" />
              <span className="font-bold text-foreground">{distToTarget.toFixed(1)} كم</span>
            </div>
            {etaMinutes && (
              <div className="bg-card/90 backdrop-blur-xl px-3 py-2 rounded-xl text-xs flex items-center gap-2 border border-border shadow-lg">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span className="font-bold text-foreground">{etaMinutes} د</span>
              </div>
            )}
          </div>
        )}

        {/* Yellow progress bar */}
        <div className="absolute bottom-0 left-0 right-0 z-[1002] h-1.5 bg-muted/50">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
            initial={{ width: "0%" }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

        {/* Map legend */}
        <div className="absolute bottom-5 right-3 z-[1001] bg-card/90 backdrop-blur-xl rounded-xl p-2 border border-border shadow-lg">
          <div className="space-y-1 text-[10px]">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 border border-white" />
              <span className="text-foreground/80">السائق</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-red-400 to-red-600 border border-white" />
              <span className="text-foreground/80">المطعم</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border border-white" />
              <span className="text-foreground/80">موقعك</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ القسم الثاني: معلومات الطلب ═══ */}
      <div className="h-[50%] bg-card border-t-2 border-primary/20 overflow-y-auto">
        {/* Status progress steps */}
        {!isCancelled && (
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center gap-0.5">
              {steps.map((step, i) => (
                <div key={step.key} className="flex flex-col items-center flex-1">
                  <div className={`h-1.5 w-full rounded-full transition-all duration-500 ${
                    i <= currentStep ? "bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.4)]" : "bg-muted"
                  }`} />
                </div>
              ))}
            </div>
            {/* Current step label */}
            <p className="text-center text-xs font-bold text-primary mt-2 flex items-center justify-center gap-1.5">
              {(() => { const StepIcon = steps[currentStep]?.icon; return StepIcon ? <StepIcon className="w-3.5 h-3.5" /> : null; })()}
              {steps[currentStep]?.label}
            </p>
          </div>
        )}

        {/* Order info */}
        <div className="px-4 py-3 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-mono">#{order.order_code || order.id?.slice(0, 8)}</span>
            <span className="text-lg font-black text-primary">{order.total_price || order.estimated_price || "—"} DH</span>
          </div>

          {/* Store name */}
          {order.store_name && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30 border border-border">
              <Store className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-bold text-foreground">{order.store_name}</span>
            </div>
          )}

          {/* Driver card */}
          {hasDriver && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
              <div className="flex items-center gap-2">
                {driverPhone && (
                  <a href={`tel:${driverPhone}`} className="w-9 h-9 rounded-full bg-blue-500/15 flex items-center justify-center border border-blue-500/25">
                    <Phone className="w-4 h-4 text-blue-400" />
                  </a>
                )}
              </div>
              <div className="text-right flex items-center gap-2">
                <Bike className="w-4 h-4 text-primary" />
                {driverRefCode && (
                  <span className="font-mono text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded-md border border-primary/30">
                    {driverRefCode}
                  </span>
                )}
                {driverRating != null && driverRating > 0 && (
                  <span className="flex items-center gap-0.5 text-amber-400 text-xs">
                    <Star className="w-3 h-3 fill-amber-400" />
                    {driverRating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Route summary */}
          {(order.pickup_address || order.delivery_address) && (
            <div className="flex items-center gap-2 text-xs">
              {order.pickup_address && (
                <div className="flex-1 flex items-center gap-2 p-2 rounded-lg bg-emerald-500/8 border border-emerald-500/10">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-foreground/70 truncate">{order.pickup_address}</span>
                </div>
              )}
              <RouteIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              {order.delivery_address && (
                <div className="flex-1 flex items-center gap-2 p-2 rounded-lg bg-blue-500/8 border border-blue-500/10">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <span className="text-foreground/70 truncate">{order.delivery_address}</span>
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          {hasDriver && (
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-xl bg-muted/20 border border-border">
                <p className="text-[10px] text-muted-foreground">المسافة</p>
                <p className="text-primary font-black text-base mt-0.5">{distToTarget?.toFixed(1) || order.distance || "—"} <span className="text-[9px] font-normal">كم</span></p>
              </div>
              <div className="text-center p-2 rounded-xl bg-muted/20 border border-border">
                <p className="text-[10px] text-muted-foreground">الوقت</p>
                <p className="text-blue-500 font-black text-base mt-0.5">{etaMinutes || order.estimated_time || "—"} <span className="text-[9px] font-normal">دقيقة</span></p>
              </div>
              <div className="text-center p-2 rounded-xl bg-muted/20 border border-border">
                <p className="text-[10px] text-muted-foreground">التوصيل</p>
                <p className="text-amber-500 font-black text-base mt-0.5">{order.delivery_fee || "—"} <span className="text-[9px] font-normal">DH</span></p>
              </div>
            </div>
          )}

          {/* Items */}
          {renderItems(order.items)}

          {/* Price breakdown */}
          <div className="pt-2 border-t border-border space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-foreground">{order.subtotal || "—"} DH</span>
              <span className="text-muted-foreground">المنتجات</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-foreground">{order.delivery_fee || "—"} DH</span>
              <span className="text-muted-foreground">التوصيل</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span className="text-primary">{order.total_price || order.estimated_price || "—"} DH</span>
              <span className="text-foreground">المجموع</span>
            </div>
          </div>

          {/* Cancel reason */}
          {order.cancel_reason && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3">
              <p className="text-xs text-destructive">سبب الإلغاء: {order.cancel_reason}</p>
            </div>
          )}

          {/* Delivered */}
          {isDelivered && (
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
              <p className="text-foreground font-bold">تم التوصيل بنجاح! 🎉</p>
              <Button onClick={() => navigate("/delivery")} className="mt-3 w-full rounded-xl font-bold">
                العودة للرئيسية
              </Button>
            </motion.div>
          )}

          {/* Cancelled */}
          {isCancelled && (
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="text-center py-4">
              <XCircle className="w-12 h-12 text-destructive mx-auto mb-2" />
              <p className="text-foreground font-bold">تم إلغاء الطلب ❌</p>
              <Button onClick={() => navigate("/delivery")} variant="outline" className="mt-3 rounded-xl">
                طلب جديد
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryTracking;
