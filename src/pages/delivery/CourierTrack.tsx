import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Package, CheckCircle, Bike, MapPin, Clock,
  Phone, MessageCircle, Star, Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/firestoreClient";
import deliveryLogo from "@/assets/hn-delivery-logo.jpeg";

const steps = [
  { key: "pending", label: "في انتظار سائق", labelFr: "En attente", icon: Clock, color: "text-warning" },
  { key: "accepted", label: "تم قبول الطلب", labelFr: "Accepté", icon: CheckCircle, color: "text-info" },
  { key: "picked_up", label: "تم استلام الطرد", labelFr: "Ramassé", icon: Package, color: "text-primary" },
  { key: "in_transit", label: "في الطريق إليك", labelFr: "En route", icon: Bike, color: "text-accent" },
  { key: "delivered", label: "تم التسليم", labelFr: "Livré", icon: MapPin, color: "text-success" },
];

const CourierTrack = () => {
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatest = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("delivery_orders")
        .select("*")
        .eq("user_id", user.id)
        .eq("category", "courier")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (data) setOrder(data);
      setLoading(false);
    };
    fetchLatest();

    const channel = supabase
      .channel("courier-track")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "delivery_orders" }, (payload) => {
        setOrder((prev: any) => (prev?.id === payload.new.id ? payload.new : prev));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const currentStep = steps.findIndex((s) => s.key === (order?.status || "pending"));
  const isDelivered = order?.status === "delivered";
  const items = Array.isArray(order?.items) ? order.items : [];
  const packageInfo = items[0] || {};

  return (
    <div className="min-h-screen delivery-bg" dir="rtl">
      {/* Header */}
      <div className={`pt-6 pb-8 px-5 rounded-b-3xl ${
        isDelivered
          ? "bg-gradient-to-br from-emerald-600/80 via-green-500/60 to-emerald-400/50"
          : "bg-gradient-to-br from-primary/80 via-accent/60 to-primary/50"
      }`}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate("/delivery")} className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <img src={deliveryLogo} alt="" className="w-8 h-8 rounded-full border border-white/30" />
            <h1 className="text-lg font-bold text-white">تتبع الشحنة</h1>
          </div>
          <div className="w-9" />
        </div>

        {order && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                isDelivered ? "bg-white/20 text-white" : "bg-white/20 text-white"
              }`}>
                {steps[currentStep]?.label || order.status}
              </span>
              <p className="text-xs text-white/60">#{order.id?.slice(0, 8)}</p>
            </div>
            {order.estimated_price && (
              <p className="text-2xl font-bold text-white mt-2">{order.estimated_price} DH</p>
            )}
          </motion.div>
        )}
      </div>

      <div className="px-5 mt-6 pb-10">
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">جاري التحميل...</div>
        ) : !order ? (
          <div className="text-center py-16">
            <Package className="w-14 h-14 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">لا توجد شحنة نشطة</p>
            <Button
              onClick={() => navigate("/delivery/courier/send")}
              className="mt-4 rounded-xl gradient-primary text-primary-foreground"
            >
              إرسال طرد جديد
            </Button>
          </div>
        ) : (
          <>
            {/* Progress Timeline */}
            <div className="bg-card rounded-2xl border border-border p-5 mb-4">
              <h3 className="text-sm font-bold text-foreground mb-5">حالة الشحنة</h3>
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute right-[19px] top-5 bottom-5 w-0.5 bg-border" />
                <div
                  className="absolute right-[19px] top-5 w-0.5 bg-primary transition-all duration-700"
                  style={{ height: `${Math.max(0, currentStep) * 25}%` }}
                />

                <div className="space-y-6">
                  {steps.map((s, i) => {
                    const isActive = i <= currentStep;
                    const isCurrent = i === currentStep;
                    return (
                      <motion.div
                        key={s.key}
                        initial={{ opacity: 0, x: 15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.12 }}
                        className="flex items-center gap-4"
                      >
                        <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                          isCurrent
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/40 scale-110"
                            : isActive
                            ? "bg-success/15 text-success"
                            : "bg-secondary text-muted-foreground"
                        }`}>
                          <s.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                            {s.label}
                          </p>
                          <p className={`text-[10px] ${isActive ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                            {s.labelFr}
                          </p>
                        </div>
                        {isCurrent && !isDelivered && (
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        )}
                        {isActive && i < currentStep && (
                          <CheckCircle className="w-4 h-4 text-success" />
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Package Details */}
            <div className="bg-card rounded-2xl border border-border p-5 mb-4 space-y-3">
              <h3 className="text-sm font-bold text-foreground">تفاصيل الطرد</h3>
              {packageInfo.type && <DetailRow label="النوع" value={packageInfo.type} />}
              {packageInfo.size && <DetailRow label="الحجم" value={packageInfo.size} />}
              {packageInfo.weight > 0 && <DetailRow label="الوزن" value={`${packageInfo.weight} كغ`} />}
              {packageInfo.fragile && <DetailRow label="قابل للكسر" value="⚠️ نعم" />}
              {packageInfo.description && <DetailRow label="الوصف" value={packageInfo.description} />}
            </div>

            {/* Addresses */}
            <div className="bg-card rounded-2xl border border-border p-5 mb-4 space-y-3">
              <h3 className="text-sm font-bold text-foreground">العناوين</h3>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">الاستلام من</p>
                  <p className="text-xs text-foreground">{order.pickup_address || "غير محدد"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">التسليم إلى</p>
                  <p className="text-xs text-foreground">{order.delivery_address || "غير محدد"}</p>
                </div>
              </div>
            </div>

            {/* Recipient */}
            {packageInfo.recipient_name && (
              <div className="bg-card rounded-2xl border border-border p-5 mb-4">
                <h3 className="text-sm font-bold text-foreground mb-3">المستلم</h3>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" className="rounded-full w-9 h-9 border-border">
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="outline" className="rounded-full w-9 h-9 border-border">
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{packageInfo.recipient_name}</p>
                    <p className="text-xs text-muted-foreground">{packageInfo.recipient_phone}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Delivered state */}
            {isDelivered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-success/5 border border-success/20 rounded-2xl p-6 text-center"
              >
                <CheckCircle className="w-14 h-14 text-success mx-auto mb-3" />
                <h2 className="text-lg font-bold text-success">تم التسليم بنجاح!</h2>
                <p className="text-xs text-muted-foreground mt-1">شكراً لاستخدامك HN Delivery</p>
                <div className="flex gap-3 mt-4 justify-center">
                  <Button
                    onClick={() => navigate("/delivery")}
                    className="rounded-xl gradient-primary text-primary-foreground gap-1"
                  >
                    <Home className="w-4 h-4" />
                    الرئيسية
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/delivery/courier/send")}
                    className="rounded-xl border-border gap-1"
                  >
                    <Package className="w-4 h-4" />
                    طرد جديد
                  </Button>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between text-xs">
    <span className="text-foreground">{value}</span>
    <span className="text-muted-foreground">{label}</span>
  </div>
);

export default CourierTrack;
