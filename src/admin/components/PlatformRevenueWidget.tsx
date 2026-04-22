import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Calendar, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RevenueStats {
  today: number;
  week: number;
  month: number;
  total: number;
  count: number;
}

const PlatformRevenueWidget = () => {
  const [stats, setStats] = useState<RevenueStats>({
    today: 0, week: 0, month: 0, total: 0, count: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startWeek = new Date(now.getTime() - 7 * 86400000).toISOString();
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data } = await supabase
        .from("platform_revenue")
        .select("commission_amount, created_at");

      if (data) {
        const next: RevenueStats = { today: 0, week: 0, month: 0, total: 0, count: data.length };
        data.forEach((r: any) => {
          const amt = Number(r.commission_amount) || 0;
          next.total += amt;
          if (r.created_at >= startMonth) next.month += amt;
          if (r.created_at >= startWeek) next.week += amt;
          if (r.created_at >= startToday) next.today += amt;
        });
        setStats(next);
      }
      setLoading(false);
    };
    load();

    // Realtime updates
    const channel = supabase
      .channel("platform_revenue_widget")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "platform_revenue" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const cards = [
    { label: "إيراد اليوم", value: stats.today, icon: DollarSign, color: "from-emerald-500 to-green-600" },
    { label: "هذا الأسبوع", value: stats.week, icon: Calendar, color: "from-blue-500 to-cyan-600" },
    { label: "هذا الشهر", value: stats.month, icon: TrendingUp, color: "from-violet-500 to-purple-600" },
    { label: "الإجمالي", value: stats.total, icon: Wallet, color: "from-amber-500 to-orange-600" },
  ];

  return (
    <div className="glass-card rounded-2xl p-5" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground">💰 إيرادات المنصة (عمولات 5%)</h3>
        <span className="text-xs text-muted-foreground">{stats.count} عملية</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="relative overflow-hidden rounded-xl p-4 bg-secondary/40 border border-border"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${c.color} opacity-10`} />
            <c.icon className="w-5 h-5 text-foreground/80 mb-2 relative" />
            <p className="text-xl font-extrabold text-foreground relative">
              {loading ? "..." : `${c.value.toFixed(2)} د.م`}
            </p>
            <p className="text-xs text-muted-foreground mt-1 relative">{c.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default PlatformRevenueWidget;
