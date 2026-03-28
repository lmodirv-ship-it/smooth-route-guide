import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Bike, CheckCircle, Clock, MapPin, Navigation, Package,
  Store, XCircle, Phone, MessageSquare, Banknote, Route, Radar,
  ChevronUp, ChevronDown, Wallet, Star, TrendingUp, Crown, Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LiveOrderMap from "@/components/LiveOrderMap";
import { useDriverGeolocation } from "@/hooks/useDriverGeolocation";
import { useDriverSubscription } from "@/hooks/useDriverSubscription";
import { notifyNewOrder, unlockAudio } from "@/lib/notificationSound";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

type OrderStatus = string;

interface DeliveryOrder {
  id: string;
  status: OrderStatus;
  store_name: string | null;
  pickup_address: string | null;
  delivery_address: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  estimated_price: number | null;
  total_price: number | null;
  subtotal: number | null;
  delivery_fee: number | null;
  user_id: string;
  driver_id: string | null;
  created_at: string;
  city: string | null;
  items: any;
  notes: string | null;
}

const STATUS_FLOW: { key: string; label: string; icon: typeof Clock; color: string }[] = [
  { key: "driver_assigned", label: "تم القبول", icon: CheckCircle, color: "text-blue-400" },
  { key: "on_the_way_to_vendor", label: "في الطريق للمطعم", icon: Navigation, color: "text-cyan-400" },
  { key: "picked_up", label: "تم الاستلام", icon: Store, color: "text-amber-400" },
  { key: "on_the_way_to_customer", label: "في الطريق للزبون", icon: Bike, color: "text-emerald-400" },
  { key: "delivered", label: "تم التسليم", icon: CheckCircle, color: "text-emerald-500" },
];

const DriverDelivery = () => {
  const navigate = useNavigate();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverCity, setDriverCity] = useState<string | null>(null);
  const [driverName, setDriverName] = useState("السائق");
  const [pendingOrders, setPendingOrders] = useState<DeliveryOrder[]>([]);
  const [activeOrder, setActiveOrder] = useState<DeliveryOrder | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [todayStats, setTodayStats] = useState({ deliveries: 0, earnings: 0 });
  const { location: driverLocation } = useDriverGeolocation(true);
  const { isExpired: subscriptionExpired } = useDriverSubscription();
  const prevCountRef = useRef(0);
  const initialRef = useRef(true);

  // Init driver
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: driver } = await supabase.from("drivers").select("id").eq("user_id", user.id).maybeSingle();
      if (driver) setDriverId(driver.id);
      const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).single();
      if (profile?.name) setDriverName(profile.name);

      // Today stats
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: completed } = await supabase
        .from("delivery_orders").select("id, total_price, delivery_fee")
        .eq("driver_id", driver?.id).eq("status", "delivered")
        .gte("created_at", todayStart.toISOString());
      setTodayStats({
        deliveries: completed?.length || 0,
        earnings: completed?.reduce((s, o) => s + (Number(o.delivery_fee) || Number(o.total_price) || 0), 0) || 0,
      });

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=fr`);
            const geo = await res.json();
            setDriverCity(geo?.address?.city || geo?.address?.town || "Tanger");
          } catch { setDriverCity("Tanger"); }
        }, () => setDriverCity("Tanger"), { timeout: 8000 });
      }
    });
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!driverId) return;
    const { data: active } = await supabase
      .from("delivery_orders").select("*")
      .eq("driver_id", driverId)
      .in("status", ["driver_assigned", "on_the_way_to_vendor", "picked_up", "on_the_way_to_customer"])
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    setActiveOrder(active as DeliveryOrder | null);
    if (!active) {
      let query = supabase.from("delivery_orders").select("*")
        .eq("status", "ready_for_driver").order("created_at", { ascending: false }).limit(20);
      if (driverCity) query = query.ilike("city", `%${driverCity}%`);
      const { data: pending } = await query;
      const newCount = pending?.length || 0;
      if (!initialRef.current && newCount > prevCountRef.current && soundEnabled) notifyNewOrder();
      initialRef.current = false;
      prevCountRef.current = newCount;
      setPendingOrders((pending || []) as DeliveryOrder[]);
    } else {
      setPendingOrders([]);
    }
  }, [driverId, driverCity, soundEnabled]);

  useEffect(() => {
    if (!driverId) return;
    fetchOrders();
    const ch = supabase.channel("driver-delivery-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_orders" }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [driverId, driverCity, fetchOrders]);

  const acceptOrder = async (orderId: string) => {
    if (!driverId) return;
    if (subscriptionExpired) {
      toast({ title: "اشتراك مطلوب", description: "يجب الاشتراك في باقة لقبول الطلبات", variant: "destructive" });
      navigate("/driver/subscription");
      return;
    }
    const { error } = await supabase.from("delivery_orders")
      .update({ status: "driver_assigned", driver_id: driverId, accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", orderId).eq("status", "ready_for_driver");
    if (error) toast({ title: "خطأ", description: "تم قبول الطلب من سائق آخر", variant: "destructive" });
    else toast({ title: "تم قبول الطلب ✅" });
    fetchOrders();
  };

  const targetPosition = useMemo(() => {
    if (!activeOrder) return null;
    if (["driver_assigned", "on_the_way_to_vendor"].includes(activeOrder.status) && activeOrder.pickup_lat != null)
      return { lat: Number(activeOrder.pickup_lat), lng: Number(activeOrder.pickup_lng) };
    if (["picked_up", "on_the_way_to_customer"].includes(activeOrder.status) && activeOrder.delivery_lat != null)
      return { lat: Number(activeOrder.delivery_lat), lng: Number(activeOrder.delivery_lng) };
    return null;
  }, [activeOrder]);

  const setStatus = async (status: string) => {
    if (!activeOrder) return;
    const updates: Record<string, any> = { status, updated_at: new Date().toISOString() };
    if (status === "picked_up") updates.picked_up_at = new Date().toISOString();
    if (status === "delivered") updates.delivered_at = new Date().toISOString();
    await supabase.from("delivery_orders").update(updates).eq("id", activeOrder.id);
    if (status === "delivered") toast({ title: "تم التسليم بنجاح ✅" });
    fetchOrders();
  };

  const currentStepIdx = activeOrder ? STATUS_FLOW.findIndex(s => s.key === activeOrder.status) : -1;

  return (
    <div className="h-screen flex flex-col bg-background" dir="rtl" onClick={() => unlockAudio()}>
      {/* Map Section */}
      <div className={`relative shrink-0 transition-all duration-500 ${mapExpanded ? "h-[55vh]" : "h-[30vh] min-h-[200px]"}`}>
        <LiveOrderMap
          driverPosition={driverLocation}
          targetPosition={targetPosition}
          showRouteInfo={!!activeOrder}
          targetLabel={activeOrder ? (["driver_assigned", "on_the_way_to_vendor"].includes(activeOrder.status) ? (activeOrder.pickup_address || "") : (activeOrder.delivery_address || "")) : undefined}
        />

        {/* Top overlay */}
        <div className="absolute top-0 inset-x-0 z-[1000] bg-gradient-to-b from-black/80 via-black/40 to-transparent px-4 pt-3 pb-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center">
                <Bike className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">{driverName}</p>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-emerald-400 text-[11px]">متصل</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-full backdrop-blur-sm border ${soundEnabled ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-white/10 border-white/20 text-white/40"}`}>
                <Volume2 className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                <Radar className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="text-xs text-white/90">{driverCity || "..."}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Map toggle button */}
        <button onClick={() => setMapExpanded(!mapExpanded)}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[1000] bg-card/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-border flex items-center gap-1.5 text-xs text-muted-foreground">
          {mapExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {mapExpanded ? "تصغير الخريطة" : "تكبير الخريطة"}
        </button>
      </div>

      {/* Stats bar */}
      <div className="shrink-0 px-4 py-2 border-b border-border bg-card/50">
        <div className="grid grid-cols-3 gap-2">
          <StatPill icon={TrendingUp} label="توصيلات اليوم" value={`${todayStats.deliveries}`} color="text-emerald-400" />
          <StatPill icon={Wallet} label="أرباح اليوم" value={`${todayStats.earnings} DH`} color="text-amber-400" />
          <StatPill icon={Package} label="طلبات متاحة" value={`${pendingOrders.length}`} color="text-blue-400" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {!activeOrder ? (
            <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Subscription warning */}
              {subscriptionExpired && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="mx-4 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                  <Button size="sm" onClick={() => navigate("/driver/subscription")}
                    className="h-8 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-bold">
                    <Crown className="w-3.5 h-3.5 ml-1" />اشترك الآن
                  </Button>
                  <div className="text-right">
                    <p className="text-amber-400 font-bold text-sm">اشتراك مطلوب</p>
                    <p className="text-muted-foreground text-[11px]">اشترك لقبول الطلبات</p>
                  </div>
                </motion.div>
              )}

              {pendingOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/15">
                    <Package className="w-10 h-10 text-emerald-500/30" />
                  </div>
                  <p className="text-foreground/70 font-medium">لا توجد طلبات جاهزة حالياً</p>
                  <p className="text-muted-foreground text-sm mt-1">ستظهر الطلبات الجديدة تلقائياً</p>
                </div>
              ) : (
                <div className="p-3 space-y-3">
                  {pendingOrders.map((order, idx) => (
                    <motion.div key={order.id}
                      initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="rounded-2xl border border-border bg-card overflow-hidden">
                      {/* Order header */}
                      <div className="px-4 py-3 flex items-center justify-between bg-emerald-500/5 border-b border-border">
                        <span className="text-emerald-400 font-bold text-base">{order.total_price || order.estimated_price || "—"} DH</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{order.city}</span>
                          <span className="font-bold text-foreground text-sm">{order.store_name || "طلب توصيل"}</span>
                        </div>
                      </div>

                      {/* Addresses */}
                      <div className="px-4 py-3 space-y-2.5">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                            <Store className="w-3.5 h-3.5 text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-muted-foreground">استلام من</p>
                            <p className="text-sm text-foreground truncate">{order.pickup_address || "—"}</p>
                          </div>
                        </div>
                        <div className="mr-3 border-r-2 border-dashed border-border h-3" />
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 w-6 h-6 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0">
                            <MapPin className="w-3.5 h-3.5 text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-muted-foreground">توصيل إلى</p>
                            <p className="text-sm text-foreground truncate">{order.delivery_address || "—"}</p>
                          </div>
                        </div>
                      </div>

                      {/* Items */}
                      {order.items && Array.isArray(order.items) && order.items.length > 0 && (
                        <div className="px-4 pb-2">
                          <div className="flex flex-wrap gap-1.5">
                            {order.items.slice(0, 4).map((item: any, i: number) => (
                              <span key={i} className="text-[11px] bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
                                {item.name} ×{item.qty || item.quantity || 1}
                              </span>
                            ))}
                            {order.items.length > 4 && (
                              <span className="text-[11px] bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">+{order.items.length - 4}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Accept button */}
                      <div className="px-4 pb-3 pt-1">
                        <Button onClick={() => acceptOrder(order.id)}
                          className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold gap-2 shadow-lg shadow-emerald-500/20">
                          <CheckCircle className="w-4.5 h-4.5" />قبول الطلب
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
              {/* Progress steps */}
              <div className="glass-card rounded-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-emerald-400 font-bold">{activeOrder.total_price || activeOrder.estimated_price} DH</span>
                  <h3 className="font-bold text-foreground">{activeOrder.store_name || "طلب توصيل"}</h3>
                </div>

                {/* Status stepper */}
                <div className="flex items-center justify-between mb-4 relative">
                  <div className="absolute top-3 right-3 left-3 h-0.5 bg-border" />
                  <div className="absolute top-3 right-3 h-0.5 bg-emerald-500 transition-all"
                    style={{ width: `${Math.max(0, (currentStepIdx / (STATUS_FLOW.length - 1)) * 100)}%` }} />
                  {STATUS_FLOW.map((step, idx) => {
                    const StepIcon = step.icon;
                    const done = idx <= currentStepIdx;
                    const current = idx === currentStepIdx;
                    return (
                      <div key={step.key} className="relative z-10 flex flex-col items-center gap-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                          done ? "bg-emerald-500 border-emerald-500" : current ? "bg-background border-emerald-500" : "bg-background border-border"
                        }`}>
                          <StepIcon className={`w-3 h-3 ${done ? "text-white" : "text-muted-foreground"}`} />
                        </div>
                        <span className={`text-[9px] whitespace-nowrap ${current ? "text-emerald-400 font-bold" : "text-muted-foreground"}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Addresses */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="flex items-center gap-3">
                    <Store className="w-4 h-4 text-emerald-400 shrink-0" />
                    <p className="text-sm text-foreground">{activeOrder.pickup_address || "—"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                    <p className="text-sm text-foreground">{activeOrder.delivery_address || "—"}</p>
                  </div>
                </div>

                {/* Items */}
                {activeOrder.items && Array.isArray(activeOrder.items) && (
                  <div className="bg-secondary/40 rounded-xl p-3 mt-3 space-y-1">
                    <p className="text-xs text-muted-foreground font-bold mb-1">المنتجات:</p>
                    {activeOrder.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-emerald-400">{((item.price || 0) * (item.qty || 1)).toFixed(0)} DH</span>
                        <span className="text-foreground">{item.name} ×{item.qty || item.quantity || 1}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeOrder.notes && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 mt-3">
                    <p className="text-xs text-foreground">📝 {activeOrder.notes}</p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="space-y-2.5">
                {activeOrder.status === "driver_assigned" && (
                  <ActionBtn icon={Navigation} label="في الطريق للمطعم" onClick={() => setStatus("on_the_way_to_vendor")} color="from-cyan-500 to-blue-500" />
                )}
                {activeOrder.status === "on_the_way_to_vendor" && (
                  <ActionBtn icon={Store} label="وصلت للمطعم — استلام الطلب" onClick={() => setStatus("picked_up")} color="from-amber-500 to-orange-500" />
                )}
                {activeOrder.status === "picked_up" && (
                  <ActionBtn icon={Bike} label="في الطريق للزبون" onClick={() => setStatus("on_the_way_to_customer")} color="from-emerald-500 to-teal-500" />
                )}
                {activeOrder.status === "on_the_way_to_customer" && (
                  <ActionBtn icon={CheckCircle} label="تم التسليم ✅" onClick={() => setStatus("delivered")} color="from-emerald-500 to-green-500" />
                )}
                {!["delivered", "cancelled"].includes(activeOrder.status) && (
                  <Button variant="outline" className="w-full h-11 border-destructive/50 text-destructive rounded-xl" onClick={() => setStatus("cancelled")}>
                    <XCircle className="w-4 h-4 ml-2" />إلغاء الطلب
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav role="delivery" />
    </div>
  );
};

const ActionBtn = ({ icon: Icon, label, onClick, color }: { icon: typeof Clock; label: string; onClick: () => void; color: string }) => (
  <Button onClick={onClick} className={`w-full h-12 rounded-xl bg-gradient-to-r ${color} text-white font-bold gap-2 shadow-lg`}>
    <Icon className="w-5 h-5" />{label}
  </Button>
);

const StatPill = ({ icon: Icon, label, value, color }: { icon: typeof Clock; label: string; value: string; color: string }) => (
  <div className="bg-card/80 rounded-xl p-2 border border-border text-center">
    <Icon className={`w-3.5 h-3.5 ${color} mx-auto mb-0.5`} />
    <p className={`text-sm font-bold ${color}`}>{value}</p>
    <p className="text-[9px] text-muted-foreground">{label}</p>
  </div>
);

export default DriverDelivery;
