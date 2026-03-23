import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Bike, CheckCircle, Clock, MapPin, Navigation, Package, Phone, Store, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import LiveOrderMap from "@/components/LiveOrderMap";
import { useDriverGeolocation } from "@/hooks/useDriverGeolocation";
import NavigationLinks from "@/components/NavigationLinks";
import { supabase } from "@/integrations/supabase/client";

type OrderStatus = "pending" | "accepted" | "on_the_way" | "arrived" | "delivering" | "delivered" | "completed" | "canceled";

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
  user_id: string;
  driver_id: string | null;
  created_at: string;
}

const STATUS_META: Record<string, { label: string; badge: string }> = {
  pending: { label: "بانتظار سائق", badge: "bg-warning/10 text-warning" },
  accepted: { label: "تم قبول الطلب", badge: "bg-info/10 text-info" },
  on_the_way: { label: "في الطريق", badge: "bg-info/10 text-info" },
  arrived: { label: "وصل السائق", badge: "bg-primary/10 text-primary" },
  delivering: { label: "بدأ التوصيل", badge: "bg-accent/10 text-accent" },
  delivered: { label: "تم التسليم", badge: "bg-success/10 text-success" },
  completed: { label: "مكتمل", badge: "bg-success/10 text-success" },
  canceled: { label: "ملغي", badge: "bg-destructive/10 text-destructive" },
};

const DriverDelivery = () => {
  const navigate = useNavigate();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [pendingOrders, setPendingOrders] = useState<DeliveryOrder[]>([]);
  const [activeOrder, setActiveOrder] = useState<DeliveryOrder | null>(null);
  const { location: driverLocation } = useDriverGeolocation(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: driver } = await supabase.from("drivers").select("id").eq("user_id", user.id).maybeSingle();
      if (driver) setDriverId(driver.id);
    });
  }, []);

  const fetchOrders = async () => {
    if (!driverId) return;

    const { data: active } = await supabase
      .from("delivery_orders")
      .select("*")
      .eq("driver_id", driverId)
      .in("status", ["accepted", "on_the_way", "arrived", "delivering", "delivered"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setActiveOrder(active as DeliveryOrder | null);

    if (!active) {
      const { data: pending } = await supabase
        .from("delivery_orders")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20);
      setPendingOrders((pending || []) as DeliveryOrder[]);
    } else {
      setPendingOrders([]);
    }
  };

  useEffect(() => {
    if (!driverId) return;
    fetchOrders();

    const channel = supabase
      .channel("driver-delivery-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_orders" }, () => fetchOrders())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [driverId]);

  const targetPosition = useMemo(() => {
    if (!activeOrder) return null;
    if (["accepted", "on_the_way"].includes(activeOrder.status) && activeOrder.pickup_lat != null) {
      return { lat: Number(activeOrder.pickup_lat), lng: Number(activeOrder.pickup_lng) };
    }
    if (["arrived", "delivering"].includes(activeOrder.status) && activeOrder.delivery_lat != null) {
      return { lat: Number(activeOrder.delivery_lat), lng: Number(activeOrder.delivery_lng) };
    }
    return null;
  }, [activeOrder]);

  const setStatus = async (status: OrderStatus) => {
    if (!activeOrder) return;
    const updates: Record<string, any> = { status, updated_at: new Date().toISOString() };
    if (status === "delivered") updates.delivered_at = new Date().toISOString();
    await supabase.from("delivery_orders").update(updates).eq("id", activeOrder.id);
    fetchOrders();
  };

  const meta = (s: string) => STATUS_META[s] || STATUS_META.pending;

  return (
    <div className="min-h-screen gradient-dark pb-6" dir="rtl">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate("/driver-panel")} className="p-2"><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
        <span className="font-bold text-gradient-primary text-lg">التوصيل</span>
        <div className="w-9" />
      </div>

      <div className="mx-4 mt-4 rounded-2xl overflow-hidden border border-border h-64 relative">
        <LiveOrderMap driverPosition={driverLocation} targetPosition={targetPosition} />
      </div>

      <div className="px-4 mt-4 space-y-4">
        {!activeOrder ? (
          <>
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-14 h-14 mx-auto mb-3 text-muted-foreground/30" />
              لا يوجد طلب مقبول حالياً
            </div>
            {pendingOrders.map((order) => (
              <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="gradient-card rounded-2xl p-4 border border-border">
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${meta(order.status).badge}`}>{meta(order.status).label}</span>
                  <p className="font-bold text-foreground">{order.store_name || "طلب توصيل"}</p>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-success" /><span className="text-foreground">{order.pickup_address || "—"}</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-destructive" /><span className="text-foreground">{order.delivery_address || "—"}</span></div>
                </div>
                <Button onClick={() => navigate("/driver-panel")} className="w-full gradient-primary text-primary-foreground">اذهب لقبول الطلب من الرئيسية</Button>
              </motion.div>
            ))}
          </>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="gradient-card rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs px-2 py-1 rounded-full ${meta(activeOrder.status).badge}`}>{meta(activeOrder.status).label}</span>
                <p className="font-bold text-foreground">{activeOrder.store_name || "طلب توصيل"}</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3"><Store className="w-4 h-4 text-primary" /><p className="text-sm text-foreground">{activeOrder.pickup_address || "—"}</p></div>
                <div className="flex items-center gap-3"><MapPin className="w-4 h-4 text-info" /><p className="text-sm text-foreground">{activeOrder.delivery_address || "—"}</p></div>
                <div className="flex items-center justify-between pt-3 border-t border-border text-sm">
                  <span className="text-primary font-bold">{activeOrder.estimated_price ? `${activeOrder.estimated_price} DH` : "—"}</span>
                </div>
              </div>
            </div>

            {targetPosition && (
              <NavigationLinks
                lat={targetPosition.lat}
                lng={targetPosition.lng}
                label={["accepted", "on_the_way"].includes(activeOrder.status) ? (activeOrder.pickup_address || "") : (activeOrder.delivery_address || "")}
                compact
              />
            )}

            <div className="grid gap-3">
              {activeOrder.status === "accepted" && <ActionButton icon={Navigation} label="في الطريق" onClick={() => setStatus("on_the_way")} />}
              {(activeOrder.status === "accepted" || activeOrder.status === "on_the_way") && <ActionButton icon={Store} label="وصلت" onClick={() => setStatus("arrived")} />}
              {activeOrder.status === "arrived" && <ActionButton icon={Bike} label="بدأت التوصيل" onClick={() => setStatus("delivering")} />}
              {activeOrder.status === "delivering" && <ActionButton icon={CheckCircle} label="تم التسليم" onClick={() => setStatus("delivered")} />}
              {activeOrder.status === "delivered" && <ActionButton icon={CheckCircle} label="إنهاء الطلب" onClick={() => setStatus("completed")} />}
              {!(["completed", "canceled"].includes(activeOrder.status)) && <Button variant="outline" className="w-full border-destructive text-destructive rounded-xl" onClick={() => setStatus("canceled")}><XCircle className="w-4 h-4 ml-2" />إلغاء الطلب</Button>}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const ActionButton = ({ icon: Icon, label, onClick }: { icon: typeof Clock; label: string; onClick: () => void }) => (
  <Button onClick={onClick} className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-bold gap-2">
    <Icon className="w-5 h-5" />{label}
  </Button>
);

export default DriverDelivery;
