import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Package, CheckCircle, Bike, MapPin, Clock, Store, Phone, Headphones, Navigation, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

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

  useEffect(() => {
    const fetchOrder = async () => {
      if (id) {
        // Fetch specific order
        const { data } = await supabase.from("delivery_orders").select("*").eq("id", id).single();
        if (data) setOrder(data);
      } else {
        // Fetch latest order
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
      .channel("delivery-tracking")
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

  const currentStep = steps.findIndex((s) => s.key === (order?.status || "pending_call_center"));
  const isCancelled = order?.status === "cancelled" || order?.status === "canceled";

  const renderItems = (items: any) => {
    if (!items || !Array.isArray(items)) return null;
    return (
      <div className="space-y-1 mt-3">
        {items.map((item: any, i: number) => (
          <div key={i} className="flex justify-between text-xs">
            <span className="text-primary font-bold">{(item.price * (item.qty || item.quantity || 1)).toFixed(0)} DH</span>
            <span className="text-foreground">{item.name} × {item.qty || item.quantity || 1}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen delivery-bg px-5 pt-6 pb-10" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate("/delivery")} className="p-2 rounded-xl bg-secondary">
          <ArrowRight className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">تتبع الطلب</h1>
        <div className="w-9" />
      </div>

      {!order ? (
        <div className="text-center py-20">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">لا يوجد طلب نشط</p>
        </div>
      ) : (
        <>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">#{order.id?.slice(0, 8)}</span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                isCancelled ? "bg-destructive/10 text-destructive" :
                order.status === "delivered" ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"
              }`}>
                {isCancelled ? "ملغي" : steps.find((s) => s.key === order.status)?.label || order.status}
              </span>
            </div>
            <h2 className="font-bold text-foreground mt-2">{order.store_name || "طلب توصيل"}</h2>
            <p className="text-xs text-muted-foreground mt-1">
              <MapPin className="w-3 h-3 inline ml-1" />
              {order.delivery_address || order.city || "—"}
            </p>

            {/* Items */}
            {renderItems(order.items)}

            {/* Price breakdown */}
            <div className="mt-3 pt-3 border-t border-border space-y-1">
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

            {order.cancel_reason && (
              <div className="mt-3 bg-destructive/5 border border-destructive/20 rounded-xl p-3">
                <p className="text-xs text-destructive">سبب الإلغاء: {order.cancel_reason}</p>
              </div>
            )}
          </motion.div>

          {!isCancelled && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-bold text-foreground mb-4">حالة الطلب</h3>
              <div className="space-y-4">
                {steps.map((step, i) => {
                  const isActive = i <= currentStep;
                  const isCurrent = i === currentStep;
                  return (
                    <motion.div key={step.key}
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                        isCurrent ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" :
                        isActive ? "bg-emerald-500/15 text-emerald-500" : "bg-secondary text-muted-foreground"
                      }`}>
                        <step.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                          {step.label}
                        </p>
                      </div>
                      {isActive && i < currentStep && (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      )}
                      {isCurrent && (
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DeliveryTracking;
