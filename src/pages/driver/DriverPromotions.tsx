import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Gift, Clock, Star, Zap, TrendingUp, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

const DriverPromotions = () => {
  const navigate = useNavigate();

  const promotions = [
    { id: 1, title: "مكافأة 10 رحلات", desc: "أكمل 10 رحلات اليوم واحصل على 50 DH إضافية", icon: Zap, color: "text-primary", bg: "bg-primary/10", progress: 7, total: 10, reward: "50 DH" },
    { id: 2, title: "تقييم ممتاز", desc: "حافظ على تقييم 4.8+ لمدة أسبوع", icon: Star, color: "text-warning", bg: "bg-warning/10", progress: 5, total: 7, reward: "100 DH" },
    { id: 3, title: "ساعات الذروة", desc: "اعمل خلال ساعات الذروة واربح 1.5x", icon: TrendingUp, color: "text-success", bg: "bg-success/10", progress: 0, total: 1, reward: "1.5x" },
    { id: 4, title: "بطل الأسبوع", desc: "كن السائق الأعلى رحلات هذا الأسبوع", icon: Trophy, color: "text-info", bg: "bg-info/10", progress: 42, total: 60, reward: "200 DH" },
  ];

  const coupons = [
    { code: "HN2026", discount: "خصم 20% على عمولة المنصة", expires: "25/03/2026", active: true },
    { code: "DRIVE50", discount: "مكافأة 50 DH على أول 5 رحلات", expires: "30/03/2026", active: true },
    { code: "BONUS100", discount: "100 DH مكافأة تسجيل", expires: "منتهي", active: false },
  ];

  return (
    <div className="min-h-screen gradient-dark pb-6" dir="rtl">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)}><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
        <span className="font-bold text-foreground">العروض والمكافآت</span>
        <Gift className="w-5 h-5 text-primary" />
      </div>

      <div className="px-4 mt-4">
        <h3 className="text-foreground font-bold mb-3">التحديات النشطة</h3>
        <div className="space-y-3">
          {promotions.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="gradient-card rounded-xl p-4 border border-border">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs gradient-primary text-primary-foreground px-2 py-0.5 rounded-full">{p.reward}</span>
                    <h4 className="text-sm font-bold text-foreground">{p.title}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{p.progress}/{p.total}</span>
                      <span className={p.color}>{Math.round((p.progress / p.total) * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full gradient-primary rounded-full transition-all" style={{ width: `${(p.progress / p.total) * 100}%` }} />
                    </div>
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-xl ${p.bg} flex items-center justify-center flex-shrink-0`}>
                  <p.icon className={`w-6 h-6 ${p.color}`} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <h3 className="text-foreground font-bold mt-6 mb-3">أكواد الخصم</h3>
        <div className="space-y-3">
          {coupons.map((c, i) => (
            <div key={i} className={`gradient-card rounded-xl p-4 border ${c.active ? "border-border" : "border-border opacity-50"}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.active ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                  {c.active ? "نشط" : "منتهي"}
                </span>
                <span className="text-primary font-mono font-bold">{c.code}</span>
              </div>
              <p className="text-sm text-foreground mt-2">{c.discount}</p>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">ينتهي: {c.expires}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DriverPromotions;
