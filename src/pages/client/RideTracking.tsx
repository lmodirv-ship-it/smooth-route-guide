import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Clock, MapPin, Navigation, Phone, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import LiveOrderMap from "@/components/LiveOrderMap";
import { auth } from "@/lib/firebase";
import { ORDER_STATUS_META, subscribeClientLatestOrder, subscribeDriverLocation, type OrderRecord } from "@/lib/orderService";

const RideTracking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubscribeOrder = subscribeClientLatestOrder(user.uid, setOrder);
    let unsubscribeDriver: (() => void) | null = null;

    if (order?.driverId) {
      unsubscribeDriver = subscribeDriverLocation(order.driverId, setDriverLocation);
    }

    return () => {
      unsubscribeOrder();
      unsubscribeDriver?.();
    };
  }, [order?.driverId]);

  const targetPosition = useMemo(() => {
    if (order?.pickupLat != null && order?.pickupLng != null && ["pending", "accepted", "on_the_way"].includes(order.status)) {
      return { lat: Number(order.pickupLat), lng: Number(order.pickupLng) };
    }
    if (order?.deliveryLat != null && order?.deliveryLng != null) {
      return { lat: Number(order.deliveryLat), lng: Number(order.deliveryLng) };
    }
    return null;
  }, [order]);

  const statusLabel = order ? ORDER_STATUS_META[order.status].label : "بانتظار طلب";
  const isCompleted = order?.status === "completed" || order?.status === "delivered";
  const requestedOrderId = (location.state as { orderId?: string } | null)?.orderId;

  return (
    <div className="min-h-screen gradient-dark" dir="rtl">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate("/client")}><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
        <span className="font-bold text-foreground">تتبع الطلب</span>
        <Shield className="w-5 h-5 text-success" />
      </div>

      <div className="h-72 relative">
        <LiveOrderMap driverPosition={driverLocation} targetPosition={targetPosition} />
        <div className="absolute bottom-3 inset-x-3 z-10">
          <div className="glass rounded-xl px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">ETA: {order?.etaMinutes ? `${order.etaMinutes} دقيقة` : "—"}</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse bg-primary" />
              <span className="text-sm text-foreground font-medium">{statusLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {!order ? (
          <div className="gradient-card rounded-2xl p-6 border border-border text-center text-muted-foreground">
            لا يوجد طلب نشط {requestedOrderId ? `(#${requestedOrderId.slice(0, 8)})` : ""}
          </div>
        ) : (
          <>
            <div className="gradient-card rounded-2xl p-4 border border-border">
              <div className="flex items-center gap-4">
                <div className="icon-circle-orange w-14 h-14">
                  <User className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1 text-right">
                  <h3 className="font-bold text-foreground">{order.driverName || "بانتظار قبول السائق"}</h3>
                  <p className="text-xs text-muted-foreground">{order.driverPhone || "سيظهر رقم السائق بعد القبول"}</p>
                  <p className="text-xs text-primary mt-1">الحالة: {statusLabel}</p>
                </div>
                {order.driverPhone && (
                  <a href={`tel:${order.driverPhone}`} className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-info" />
                  </a>
                )}
              </div>
            </div>

            <div className="gradient-card rounded-xl p-4 border border-border">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <p className="text-sm text-foreground">{order.pickupAddress}</p>
                </div>
                <div className="mr-1.5 border-r border-dashed border-border h-3" />
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <p className="text-sm text-foreground">{order.deliveryAddress}</p>
                </div>
              </div>
              <div className="flex justify-between mt-3 pt-3 border-t border-border">
                <span className="text-primary font-bold text-lg">{order.price ? `${order.price} DH` : "—"}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{order.distanceKm ? `${order.distanceKm} كم` : "—"}</span>
                  <span>{order.etaMinutes ? `${order.etaMinutes} دقيقة` : "—"}</span>
                </div>
              </div>
            </div>

            {isCompleted && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="gradient-card rounded-2xl p-6 border border-success/30 text-center">
                  <CheckCircle className="w-16 h-16 text-success mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-foreground">تم التسليم بنجاح!</h3>
                  <p className="text-sm text-muted-foreground mt-1">شكراً لاستخدامك HN Driver</p>
                  <Button onClick={() => navigate("/client")} className="w-full mt-4 gradient-primary text-primary-foreground rounded-xl">
                    العودة للرئيسية
                  </Button>
                </div>
              </motion.div>
            )}

            {!isCompleted && (
              <div className="grid grid-cols-3 gap-2">
                <InfoCard icon={Clock} label="ETA" value={order.etaMinutes ? `${order.etaMinutes} د` : "—"} />
                <InfoCard icon={Navigation} label="المسافة" value={order.distanceKm ? `${order.distanceKm} كم` : "—"} />
                <InfoCard icon={MapPin} label="الطلب" value={ORDER_STATUS_META[order.status].label} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const InfoCard = ({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) => (
  <div className="gradient-card rounded-xl p-3 border border-border text-center">
    <Icon className="w-4 h-4 text-primary mx-auto mb-2" />
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className="text-sm font-bold text-foreground">{value}</p>
  </div>
);

export default RideTracking;
