import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, ShoppingBag, Sparkles, UtensilsCrossed, Package } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const CustomerHub = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col gradient-dark" dir="rtl">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/3 blur-[150px]" />
        <div className="absolute bottom-1/3 left-0 w-[300px] h-[300px] rounded-full bg-info/3 blur-[100px]" />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-50 px-5 py-4 flex items-center justify-center glass-strong border-b border-border">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-bold text-xl text-gradient-primary font-display">مرحباً بك</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 gap-6 relative z-10">
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-muted-foreground text-base text-center"
        >
          ماذا تحتاج اليوم؟
        </motion.p>

        <div className="w-full max-w-sm space-y-4">
          {/* Service - Delivery */}
          <motion.button
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 25 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/delivery")}
            className="w-full glass-strong rounded-3xl border border-border p-6 text-right group hover:border-primary/40 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center glow-primary shrink-0 group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-8 h-8 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-foreground mb-1">🛒 طلب خدمة (مطاعم / أسواق)</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  تصفح المطاعم والأسواق، أضف للسلة وأكّد طلبك
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/50">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>مطاعم</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-border" />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Package className="w-3.5 h-3.5" />
                <span>أسواق</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-border" />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>سلة</span>
              </div>
            </div>
          </motion.button>

          {/* Transport - Ride */}
          <motion.button
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 25 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/customer/ride")}
            className="w-full glass-strong rounded-3xl border border-border p-6 text-right group hover:border-primary/40 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-info/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
                style={{ boxShadow: "0 0 20px hsl(var(--info) / 0.3)" }}
              >
                <Car className="w-8 h-8 text-info" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-foreground mb-1">التوصيل</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  اطلب سيارة — حدد موقعك ووجهتك وابحث عن سائق
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/50">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Car className="w-3.5 h-3.5" />
                <span>سيارة خاصة</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-border" />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5" />
                <span>بحث فوري</span>
              </div>
            </div>
          </motion.button>
        </div>
      </div>

      <BottomNav role="client" />
    </div>
  );
};

export default CustomerHub;
