import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Gift, Clock, Star, Zap, TrendingUp, Trophy, Loader2 } from "lucide-react";
import { supabase } from "@/lib/firestoreClient";

const DriverPromotions = () => {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("promotions").select("*").eq("active", true).order("created_at", { ascending: false });
      setPromotions(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <div className="min-h-screen gradient-dark flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen gradient-dark pb-6" dir="rtl">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)}><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
        <span className="font-bold text-foreground">العروض والمكافآت</span>
        <Gift className="w-5 h-5 text-primary" />
      </div>

      <div className="px-4 mt-4">
        <h3 className="text-foreground font-bold mb-3">أكواد الخصم النشطة</h3>
        {promotions.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد عروض حالياً</p>}
        <div className="space-y-3">
          {promotions.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="gradient-card rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">نشط</span>
                <span className="text-primary font-mono font-bold text-lg">{p.code}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-foreground">خصم {p.discount_percent}%</span>
                <span className="text-xs text-muted-foreground">استخدم {p.used_count || 0}/{p.max_uses || "∞"}</span>
              </div>
              {p.expires_at && (
                <div className="flex items-center gap-1 mt-2">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">ينتهي: {new Date(p.expires_at).toLocaleDateString("ar-SA")}</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DriverPromotions;
