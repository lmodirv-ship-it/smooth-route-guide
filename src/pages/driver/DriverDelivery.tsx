import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Bike, CheckCircle, Clock, MapPin, Navigation, Package, Phone, Store, User, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import LiveOrderMap from "@/components/LiveOrderMap";
import { useDriverGeolocation } from "@/hooks/useDriverGeolocation";
import { ORDER_STATUS_META, subscribeDriverActiveOrder, subscribeDriverPendingOrders, updateOrderStatus, type OrderRecord, type OrderStatus } from "@/lib/orderService";
import NavigationLinks from "@/components/NavigationLinks";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/hn-driver-logo.png";

const DriverDelivery = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [pendingOrders, setPendingOrders] = useState<OrderRecord[]>([]);
  const [activeOrder, setActiveOrder] = useState<OrderRecord | null>(null);
  const { location: driverLocation } = useDriverGeolocation(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    const unsubPending = subscribeDriverPendingOrders(userId, setPendingOrders);
    const unsubActive = subscribeDriverActiveOrder(userId, setActiveOrder);
    return () => {
      unsubPending();
      unsubActive();
    };
  }, [userId]);

  const targetPosition = useMemo(() => {
    if (!activeOrder) return null;
    if (["accepted", "on_the_way"].includes(activeOrder.status) && activeOrder.pickupLat != null && activeOrder.pickupLng != null) {
      return { lat: Number(activeOrder.pickupLat), lng: Number(activeOrder.pickupLng) };
    }
    if (["arrived", "delivering"].includes(activeOrder.status) && activeOrder.deliveryLat != null && activeOrder.deliveryLng != null) {
      return { lat: Number(activeOrder.deliveryLat), lng: Number(activeOrder.deliveryLng) };
    }
    return null;
  }, [activeOrder]);

  const setStatus = async (status: OrderStatus, note?: string) => {
    if (!user || !activeOrder) return;
    await updateOrderStatus(activeOrder.id, status, { uid: user.uid, role: "driver" }, {}, note);
  };

  return (
    <div className="min-h-screen gradient-dark pb-6" dir="rtl">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate("/driver")} className="p-2"><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
        <div className="flex items-center gap-2">
          <img src={logo} alt="HN" className="w-7 h-7" />
          <span className="font-bold text-gradient-primary text-lg">التوصيل</span>
        </div>
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
                  <span className={`text-xs px-2 py-1 rounded-full ${ORDER_STATUS_META[order.status].badge}`}>{ORDER_STATUS_META[order.status].label}</span>
                  <div className="text-right">
                    <p className="font-bold text-foreground">{order.clientName}</p>
                    <p className="text-xs text-muted-foreground">{order.clientPhone || "—"}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-success" /><span className="text-foreground">{order.pickupAddress}</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-destructive" /><span className="text-foreground">{order.deliveryAddress}</span></div>
                </div>
                <Button onClick={() => navigate("/driver")} className="w-full gradient-primary text-primary-foreground">اذهب لقبول الطلب من الرئيسية</Button>
              </motion.div>
            ))}
          </>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="gradient-card rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs px-2 py-1 rounded-full ${ORDER_STATUS_META[activeOrder.status].badge}`}>{ORDER_STATUS_META[activeOrder.status].label}</span>
                <div className="text-right">
                  <p className="font-bold text-foreground">{activeOrder.clientName}</p>
                  <p className="text-xs text-muted-foreground">{activeOrder.clientPhone || "—"}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3"><Store className="w-4 h-4 text-primary" /><p className="text-sm text-foreground">{activeOrder.pickupAddress}</p></div>
                <div className="flex items-center gap-3"><MapPin className="w-4 h-4 text-info" /><p className="text-sm text-foreground">{activeOrder.deliveryAddress}</p></div>
                <div className="flex items-center justify-between pt-3 border-t border-border text-sm">
                  <span className="text-primary font-bold">{activeOrder.price ? `${activeOrder.price} DH` : "—"}</span>
                  <span className="text-muted-foreground">{activeOrder.etaMinutes ? `${activeOrder.etaMinutes} دقيقة` : "ETA —"}</span>
                </div>
              </div>
            </div>

            {activeOrder.clientPhone && (
              <a href={`tel:${activeOrder.clientPhone}`} className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-info/10 text-info border border-info/20">
                <Phone className="w-4 h-4" />اتصال بالعميل
              </a>
            )}

            {/* Navigation button with auto-fallback */}
            {targetPosition && (
              <NavigationLinks
                lat={targetPosition.lat}
                lng={targetPosition.lng}
                label={["accepted", "on_the_way"].includes(activeOrder.status) ? activeOrder.pickupAddress : activeOrder.deliveryAddress}
                compact
              />
            )}

            <div className="grid gap-3">
              {activeOrder.status === "accepted" && <ActionButton icon={Navigation} label="في الطريق" onClick={() => setStatus("on_the_way", "السائق في الطريق إلى نقطة الاستلام")} />}
              {(activeOrder.status === "accepted" || activeOrder.status === "on_the_way") && <ActionButton icon={Store} label="وصلت" onClick={() => setStatus("arrived", "وصل السائق إلى نقطة الاستلام")} />}
              {activeOrder.status === "arrived" && <ActionButton icon={Bike} label="بدأت التوصيل" onClick={() => setStatus("delivering", "بدأ السائق التوصيل")} />}
              {activeOrder.status === "delivering" && <ActionButton icon={CheckCircle} label="تم التسليم" onClick={() => setStatus("delivered", "تم تسليم الطلب للعميل")} />}
              {activeOrder.status === "delivered" && <ActionButton icon={CheckCircle} label="إنهاء الطلب" onClick={() => setStatus("completed", "تم إغلاق الطلب")} />}
              {!(["completed", "canceled"].includes(activeOrder.status)) && <Button variant="outline" className="w-full border-destructive text-destructive rounded-xl" onClick={() => setStatus("canceled", "ألغى السائق الطلب")}><XCircle className="w-4 h-4 ml-2" />إلغاء الطلب</Button>}
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
