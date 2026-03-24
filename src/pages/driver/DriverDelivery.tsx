import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Bike, CheckCircle, Clock, MapPin, Navigation, Package, Store, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import LiveOrderMap from "@/components/LiveOrderMap";
import { useDriverGeolocation } from "@/hooks/useDriverGeolocation";
import NavigationLinks from "@/components/NavigationLinks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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

const STATUS_META: Record<string, { label: string; badge: string }> = {
  ready_for_driver: { label: "جاهز للقبول", badge: "bg-warning/10 text-warning" },
  driver_assigned: { label: "تم قبول الطلب", badge: "bg-info/10 text-info" },
  on_the_way_to_vendor: { label: "في الطريق للمطعم", badge: "bg-info/10 text-info" },
  picked_up: { label: "تم الاستلام", badge: "bg-primary/10 text-primary" },
  on_the_way_to_customer: { label: "في الطريق للزبون", badge: "bg-accent/10 text-accent-foreground" },
  delivered: { label: "تم التسليم", badge: "bg-success/10 text-success" },
  cancelled: { label: "ملغي", badge: "bg-destructive/10 text-destructive" },
};

const DriverDelivery = () => {
  const navigate = useNavigate();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverCity, setDriverCity] = useState<string | null>(null);
  const [pendingOrders, setPendingOrders] = useState<DeliveryOrder[]>([]);
  const [activeOrder, setActiveOrder] = useState<DeliveryOrder | null>(null);
  const { location: driverLocation } = useDriverGeolocation(true);

  // Get driver ID and city
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: driver } = await supabase.from("drivers").select("id, driver_type").eq("user_id", user.id).maybeSingle();
      if (driver) {
        setDriverId(driver.id);
        // Only delivery or both drivers can see delivery orders
        if (driver.driver_type !== 'delivery' && driver.driver_type !== 'both') {
          toast({ title: "غير مصرح", description: "هذا القسم خاص بسائقي خدمة الطلبيات", variant: "destructive" });
          navigate("/driver");
          return;
        }
      }

      // Detect driver city from GPS
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=fr`
            );
            const geo = await res.json();
            setDriverCity(geo?.address?.city || geo?.address?.town || "Tanger");
          } catch {
            setDriverCity("Tanger");
          }
        }, () => setDriverCity("Tanger"), { timeout: 8000 });
      }
    });
  }, []);

  const fetchOrders = async () => {
    if (!driverId) return;

    // Check for active order first
    const { data: active } = await supabase
      .from("delivery_orders")
      .select("*")
      .eq("driver_id", driverId)
      .in("status", ["driver_assigned", "on_the_way_to_vendor", "picked_up", "on_the_way_to_customer"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setActiveOrder(active as DeliveryOrder | null);

    if (!active) {
      // Show ready_for_driver orders (filtered by city if available)
      let query = supabase
        .from("delivery_orders")
        .select("*")
        .eq("status", "ready_for_driver")
        .order("created_at", { ascending: false })
        .limit(20);

      if (driverCity) {
        query = query.ilike("city", `%${driverCity}%`);
      }

      const { data: pending } = await query;
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
  }, [driverId, driverCity]);

  const acceptOrder = async (orderId: string) => {
    if (!driverId) return;
    const { error } = await supabase
      .from("delivery_orders")
      .update({
        status: "driver_assigned",
        driver_id: driverId,
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("status", "ready_for_driver");

    if (error) {
      toast({ title: "خطأ", description: "تم قبول الطلب من سائق آخر", variant: "destructive" });
    } else {
      toast({ title: "تم قبول الطلب ✅" });
    }
    fetchOrders();
  };

  const targetPosition = useMemo(() => {
    if (!activeOrder) return null;
    if (["driver_assigned", "on_the_way_to_vendor"].includes(activeOrder.status) && activeOrder.pickup_lat != null) {
      return { lat: Number(activeOrder.pickup_lat), lng: Number(activeOrder.pickup_lng) };
    }
    if (["picked_up", "on_the_way_to_customer"].includes(activeOrder.status) && activeOrder.delivery_lat != null) {
      return { lat: Number(activeOrder.delivery_lat), lng: Number(activeOrder.delivery_lng) };
    }
    return null;
  }, [activeOrder]);

  const setStatus = async (status: string) => {
    if (!activeOrder) return;
    const updates: Record<string, any> = { status, updated_at: new Date().toISOString() };
    if (status === "picked_up") updates.picked_up_at = new Date().toISOString();
    if (status === "delivered") updates.delivered_at = new Date().toISOString();
    await supabase.from("delivery_orders").update(updates).eq("id", activeOrder.id);
    if (status === "delivered") {
      toast({ title: "تم التسليم بنجاح ✅" });
    }
    fetchOrders();
  };

  const meta = (s: string) => STATUS_META[s] || { label: s, badge: "bg-secondary text-muted-foreground" };

  const renderItems = (items: any) => {
    if (!items || !Array.isArray(items)) return null;
    return items.map((item: any, i: number) => (
      <span key={i} className="text-xs text-muted-foreground">{item.name} ×{item.qty || item.quantity || 1}</span>
    ));
  };

  return (
    <div className="min-h-screen gradient-dark pb-6" dir="rtl">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate("/driver")} className="p-2"><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
        <span className="font-bold text-gradient-primary text-lg">طلبات التوصيل</span>
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{driverCity || "..."}</span>
        </div>
      </div>

      <div className="mx-4 mt-4 rounded-2xl overflow-hidden border border-border h-64 relative">
        <LiveOrderMap driverPosition={driverLocation} targetPosition={targetPosition} />
      </div>

      <div className="px-4 mt-4 space-y-4">
        {!activeOrder ? (
          <>
            <div className="text-center py-4">
              <p className="text-sm font-bold text-foreground mb-1">الطلبات الجاهزة للتوصيل</p>
              <p className="text-xs text-muted-foreground">{pendingOrders.length} طلب في {driverCity || "منطقتك"}</p>
            </div>

            {pendingOrders.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-14 h-14 mx-auto mb-3 text-muted-foreground/30" />
                لا توجد طلبات جاهزة حالياً
              </div>
            )}

            {pendingOrders.map((order) => (
              <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="gradient-card rounded-2xl p-4 border border-border">
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${meta(order.status).badge}`}>{meta(order.status).label}</span>
                  <p className="font-bold text-foreground">{order.store_name || "طلب توصيل"}</p>
                </div>

                <div className="space-y-2 text-sm mb-2">
                  <div className="flex items-center gap-2"><Store className="w-3.5 h-3.5 text-primary" /><span className="text-foreground text-xs">{order.pickup_address || "—"}</span></div>
                  <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-info" /><span className="text-foreground text-xs">{order.delivery_address || "—"}</span></div>
                </div>

                {order.items && Array.isArray(order.items) && (
                  <div className="flex flex-wrap gap-1 mb-2">{renderItems(order.items)}</div>
                )}

                <div className="flex items-center justify-between text-xs mb-3 pt-2 border-t border-border">
                  <span className="text-muted-foreground">{order.city || "—"}</span>
                  <span className="text-primary font-bold">{order.total_price || order.estimated_price || "—"} DH</span>
                </div>

                <Button onClick={() => acceptOrder(order.id)} className="w-full gradient-primary text-primary-foreground rounded-xl font-bold gap-2">
                  <CheckCircle className="w-4 h-4" />قبول الطلب
                </Button>
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
                
                {activeOrder.items && Array.isArray(activeOrder.items) && (
                  <div className="bg-secondary/40 rounded-xl p-3 space-y-1">
                    <p className="text-xs text-muted-foreground font-bold mb-1">المنتجات:</p>
                    {activeOrder.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-primary">{(item.price * (item.qty || 1)).toFixed(0)} DH</span>
                        <span className="text-foreground">{item.name} ×{item.qty || item.quantity || 1}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeOrder.notes && (
                  <div className="bg-warning/5 border border-warning/20 rounded-xl p-3">
                    <p className="text-xs text-foreground">📝 {activeOrder.notes}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-border text-sm">
                  <span className="text-primary font-bold">{activeOrder.total_price || activeOrder.estimated_price ? `${activeOrder.total_price || activeOrder.estimated_price} DH` : "—"}</span>
                  <span className="text-muted-foreground">{activeOrder.city || "—"}</span>
                </div>
              </div>
            </div>

            {targetPosition && (
              <NavigationLinks
                lat={targetPosition.lat}
                lng={targetPosition.lng}
                label={["driver_assigned", "on_the_way_to_vendor"].includes(activeOrder.status) ? (activeOrder.pickup_address || "") : (activeOrder.delivery_address || "")}
                compact
              />
            )}

            <div className="grid gap-3">
              {activeOrder.status === "driver_assigned" && (
                <ActionButton icon={Navigation} label="في الطريق للمطعم" onClick={() => setStatus("on_the_way_to_vendor")} />
              )}
              {activeOrder.status === "on_the_way_to_vendor" && (
                <ActionButton icon={Store} label="وصلت للمطعم — استلام الطلب" onClick={() => setStatus("picked_up")} />
              )}
              {activeOrder.status === "picked_up" && (
                <ActionButton icon={Bike} label="في الطريق للزبون" onClick={() => setStatus("on_the_way_to_customer")} />
              )}
              {activeOrder.status === "on_the_way_to_customer" && (
                <ActionButton icon={CheckCircle} label="تم التسليم ✅" onClick={() => setStatus("delivered")} />
              )}
              {!["delivered", "cancelled"].includes(activeOrder.status) && (
                <Button
                  variant="outline"
                  className="w-full border-destructive text-destructive rounded-xl"
                  onClick={() => setStatus("cancelled")}
                >
                  <XCircle className="w-4 h-4 ml-2" />إلغاء الطلب
                </Button>
              )}
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
