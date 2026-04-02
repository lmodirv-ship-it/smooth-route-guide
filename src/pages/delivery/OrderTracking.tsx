import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Package, CheckCircle, Bike, MapPin, Clock, Phone, ChefHat, Store, User, Car, XCircle, UtensilsCrossed, Star, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const steps = [
  { key: "pending_call_center", label: "بانتظار مركز الاتصال", sublabel: "مركز الاتصال يراجع طلبك", icon: Clock, color: "bg-amber-500" },
  { key: "confirmed", label: "تم التأكيد", sublabel: "تم تأكيد الطلب مع المطعم", icon: CheckCircle, color: "bg-blue-500" },
  { key: "ready_for_driver", label: "جاهز للسائق", sublabel: "بانتظار سائق لاستلام الطلب", icon: Car, color: "bg-cyan-500" },
  { key: "driver_assigned", label: "السائق قبل الطلب", sublabel: "تم تعيين سائق لطلبك", icon: Bike, color: "bg-indigo-500" },
  { key: "on_the_way_to_vendor", label: "في الطريق للمطعم", sublabel: "السائق متجه للمطعم", icon: Store, color: "bg-orange-500" },
  { key: "picked_up", label: "تم الاستلام", sublabel: "السائق استلم الطلب", icon: Package, color: "bg-purple-500" },
  { key: "on_the_way_to_customer", label: "في الطريق إليك", sublabel: "السائق متجه إلى موقعك", icon: Bike, color: "bg-primary" },
  { key: "delivered", label: "تم التوصيل", sublabel: "وصل طلبك! 🎉", icon: MapPin, color: "bg-emerald-500" },
];

const OrderTracking = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

  const fetchDriverProfile = async (driverId: string) => {
    const { data: driver } = await supabase.from("drivers").select("user_id").eq("id", driverId).single();
    if (driver) {
      const { data: profile } = await supabase.from("profiles").select("name, phone").eq("id", driver.user_id).single();
      setDriverProfile(profile);
    }
  };

  useEffect(() => {
    const fetchOrder = async () => {
      let query = supabase.from("delivery_orders").select("*");
      if (id) {
        query = query.eq("id", id);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        query = query.eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
      }
      const { data } = await query.single();
      if (data) {
        setOrder(data);
        if (data.driver_id) fetchDriverProfile(data.driver_id);
      }
    };
    fetchOrder();

    const channel = supabase
      .channel("order-tracking-rt")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "delivery_orders" }, (payload) => {
        if (!id || payload.new.id === id) {
          setOrder((prev: any) => {
            if (prev?.id === payload.new.id) {
              const updated = payload.new;
              if (updated.driver_id && updated.driver_id !== prev?.driver_id) {
                fetchDriverProfile(updated.driver_id);
              }
              return updated;
            }
            return prev;
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const currentStep = steps.findIndex((s) => s.key === (order?.status || "pending_call_center"));
  const isCancelled = order?.status === "cancelled" || order?.status === "canceled";

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
          <Button onClick={() => navigate("/delivery/restaurants")} variant="outline" className="mt-4 rounded-xl">
            اطلب الآن
          </Button>
        </div>
      ) : (
        <>
          {/* Order Info Card */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-muted-foreground font-mono">#{order.id?.slice(0, 8)}</span>
              {isCancelled ? (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-destructive/10 text-destructive">ملغي</span>
              ) : (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary">
                  {steps[currentStep]?.label || order.status}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">🍽️</div>
              <div>
                <h2 className="font-bold text-foreground">{order.store_name || "طلب توصيل"}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(order.created_at).toLocaleDateString("ar-MA", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
            {(order.total_price || order.estimated_price) && (
              <div className="mt-3 pt-3 border-t border-border space-y-1">
                {order.subtotal > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{order.subtotal} DH</span>
                    <span className="text-muted-foreground">المنتجات</span>
                  </div>
                )}
                {order.delivery_fee > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{order.delivery_fee} DH</span>
                    <span className="text-muted-foreground">التوصيل</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-primary">{order.total_price || order.estimated_price} DH</span>
                  <span className="text-xs text-muted-foreground">المجموع</span>
                </div>
              </div>
            )}
          </motion.div>

          {/* Items Summary */}
          {order.items && Array.isArray(order.items) && order.items.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="glass-card rounded-2xl p-4 mb-4">
              <h3 className="text-sm font-bold text-foreground mb-2">تفاصيل الطلب</h3>
              <div className="space-y-2">
                {(order.items as any[]).map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.price * item.qty} DH</span>
                    <span className="text-foreground">{item.name} × {item.qty}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Driver Info */}
          {driverProfile && currentStep >= 2 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="glass-card rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <a href={`tel:${driverProfile.phone}`} className="p-2 rounded-xl bg-primary/10">
                  <Phone className="w-4 h-4 text-primary" />
                </a>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{driverProfile.name}</p>
                    <p className="text-xs text-muted-foreground">السائق</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Progress Steps */}
          {!isCancelled && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="glass-card rounded-2xl p-5">
              <h3 className="font-bold text-foreground mb-5">مسار الطلب</h3>
              <div className="relative">
                <div className="absolute right-[19px] top-5 bottom-5 w-0.5 bg-border" />
                <div className="absolute right-[19px] top-5 w-0.5 bg-primary transition-all duration-700"
                  style={{ height: `${Math.max(0, currentStep / (steps.length - 1)) * 100}%` }} />

                <div className="space-y-6">
                  {steps.map((step, i) => {
                    const isActive = i <= currentStep;
                    const isCurrent = i === currentStep;
                    return (
                      <motion.div key={step.key}
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.08 }}
                        className="flex items-start gap-4 relative">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all duration-500 ${
                          isCurrent ? `${step.color} text-white shadow-lg scale-110` :
                          isActive ? "bg-emerald-500/15 text-emerald-500" : "bg-secondary text-muted-foreground"
                        }`}>
                          <step.icon className="w-5 h-5" />
                        </div>
                        <div className="pt-1.5">
                          <p className={`text-sm font-bold ${isActive ? "text-foreground" : "text-muted-foreground/50"}`}>
                            {step.label}
                          </p>
                          <p className={`text-xs mt-0.5 ${isCurrent ? "text-primary" : "text-muted-foreground/60"}`}>
                            {step.sublabel}
                          </p>
                        </div>
                        {isActive && i < currentStep && (
                          <CheckCircle className="w-4 h-4 text-emerald-500 absolute left-0 top-3" />
                        )}
                        {isCurrent && (
                          <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse absolute left-0 top-3.5" />
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Rating section when delivered */}
          {order?.status === "delivered" && !ratingSubmitted && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="glass-card rounded-2xl p-5 mt-4 text-center">
              <div className="text-3xl mb-2">🎉</div>
              <h3 className="font-bold text-foreground text-lg mb-1">شكرًا لاستعمالك التطبيق!</h3>
              <p className="text-sm text-muted-foreground mb-4">كيف كانت تجربتك؟ قيّم السائق</p>
              
              {/* Stars */}
              <div className="flex items-center justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110 active:scale-95">
                    <Star className={`w-9 h-9 ${star <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"} transition-colors`} />
                  </button>
                ))}
              </div>

              {/* Comment */}
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="اكتب ملاحظة (اختياري)..."
                className="w-full p-3 rounded-xl bg-muted/50 border border-border text-foreground text-sm resize-none h-20 mb-3 placeholder:text-muted-foreground/50"
                dir="rtl"
              />

              <Button
                disabled={rating === 0 || submittingRating}
                onClick={async () => {
                  if (!order?.driver_id || rating === 0) return;
                  setSubmittingRating(true);
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;
                    await supabase.from("ratings").insert({
                      user_id: order.driver_id,
                      driver_id: order.driver_id,
                      score: rating,
                      comment: ratingComment.trim() || null,
                    });
                    setRatingSubmitted(true);
                    toast({ title: "شكرًا على تقييمك! ⭐" });
                  } catch { 
                    toast({ title: "حدث خطأ", variant: "destructive" });
                  } finally { setSubmittingRating(false); }
                }}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold gap-2"
              >
                <Send className="w-4 h-4" /> إرسال التقييم
              </Button>
            </motion.div>
          )}

          {/* Rating submitted thank you */}
          {order?.status === "delivered" && ratingSubmitted && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="glass-card rounded-2xl p-5 mt-4 text-center">
              <div className="text-4xl mb-2">💚</div>
              <p className="text-foreground font-bold text-lg">شكرًا لتقييمك!</p>
              <p className="text-sm text-muted-foreground mt-1">نتمنى لك تجربة رائعة دائمًا</p>
              <Button onClick={() => navigate("/delivery")} variant="outline" className="mt-4 rounded-xl">
                العودة للرئيسية
              </Button>
            </motion.div>
          )}

          {isCancelled && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-5 text-center">
              <XCircle className="w-10 h-10 text-destructive mx-auto mb-2" />
              <p className="text-destructive font-bold">تم إلغاء هذا الطلب</p>
              <Button onClick={() => navigate("/delivery/restaurants")} variant="outline" className="mt-3 rounded-xl">
                اطلب مرة أخرى
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OrderTracking;
