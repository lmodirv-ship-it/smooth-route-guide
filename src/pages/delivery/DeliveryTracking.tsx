import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Package, CheckCircle, Bike, MapPin, Clock, Store } from "lucide-react";
import { supabase } from "@/lib/firestoreClient";

const steps = [
  { key: "pending", label: "قيد المراجعة", icon: Clock },
  { key: "confirmed", label: "تم التأكيد", icon: CheckCircle },
  { key: "accepted", label: "السائق قبل الطلب", icon: Bike },
  { key: "arrived_restaurant", label: "وصل للمطعم", icon: Store },
  { key: "picked_up", label: "تم الاستلام", icon: Package },
  { key: "delivered", label: "تم التوصيل", icon: MapPin },
  { key: "completed", label: "مكتمل", icon: CheckCircle },
];

const DeliveryTracking = () => {
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    const fetchLatest = async () => {
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
    };
    fetchLatest();

    const channel = supabase
      .channel("delivery-tracking")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "delivery_orders" }, (payload) => {
        setOrder((prev: any) => (prev?.id === payload.new.id ? payload.new : prev));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const currentStep = steps.findIndex((s) => s.key === (order?.status || "pending"));

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
            className="bg-card rounded-2xl border border-border p-5 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">#{order.id?.slice(0, 8)}</span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                order.status === "completed" ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"
              }`}>
                {steps.find((s) => s.key === order.status)?.label || order.status}
              </span>
            </div>
            <h2 className="font-bold text-foreground mt-2">{order.store_name || "طلب توصيل"}</h2>
            <p className="text-xs text-muted-foreground mt-1">الفئة: {order.category}</p>
            {order.estimated_price && (
              <p className="text-sm font-bold text-primary mt-2">{order.estimated_price} DH</p>
            )}
          </motion.div>

          <div className="bg-card rounded-2xl border border-border p-5">
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
        </>
      )}
    </div>
  );
};

export default DeliveryTracking;
