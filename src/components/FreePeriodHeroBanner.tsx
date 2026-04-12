import { motion } from "framer-motion";
import { Gift, Sparkles, ArrowLeft, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFreePeriod } from "@/hooks/useFreePeriod";

const FreePeriodHeroBanner = () => {
  const navigate = useNavigate();
  const { isActive, daysLeft, loading } = useFreePeriod();

  if (loading || !isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-[hsl(var(--warning))]/10 to-primary/10 backdrop-blur-xl p-5 md:p-6 max-w-5xl mx-auto mb-6"
    >
      {/* Animated glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
        style={{
          background: "radial-gradient(ellipse at 50% 50%, hsl(32 95% 55% / 0.15), transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-4 text-center md:text-right" dir="rtl">
        {/* Icon */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0"
        >
          <Gift className="w-8 h-8 text-primary" />
        </motion.div>

        {/* Text */}
        <div className="flex-1">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-[hsl(var(--warning))]" />
            <span className="text-xs font-bold text-[hsl(var(--warning))] uppercase tracking-wider">
              عرض محدود
            </span>
          </div>
          <h3 className="text-lg md:text-xl font-bold text-foreground mb-1">
            🎉 جميع الخدمات <span className="text-primary">مجانية الآن!</span>
          </h3>
          <p className="text-sm text-muted-foreground">
            سجّل الآن واستفد من جميع الخدمات بالمجان — توصيل، نقل، ومتاجر بدون أي رسوم
          </p>
        </div>

        {/* Countdown + CTA */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20">
            <Clock className="w-3.5 h-3.5 text-destructive" />
            <span className="text-xs font-bold text-destructive">
              باقي {daysLeft} يوم فقط
            </span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/auth/client")}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/30 hover:opacity-90 transition-opacity"
          >
            سجّل مجاناً الآن
            <ArrowLeft className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default FreePeriodHeroBanner;
