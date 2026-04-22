import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Users, Eye, MousePointerClick, Globe, Target, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const GrowthAnalytics = () => {
  const [stats, setStats] = useState({
    totalVisits: 0, uniqueVisitors: 0, todayVisits: 0,
    leads: 0, signups: 0, referrals: 0,
  });
  const [sources, setSources] = useState<{ source: string; count: number }[]>([]);
  const [topCities, setTopCities] = useState<{ city: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: counter } = await supabase.from("site_visit_counter").select("*").maybeSingle();
      const { count: leadsCount } = await supabase.from("hn_driver_leads").select("*", { count: "exact", head: true });
      const { count: signupsCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      const { count: refsCount } = await supabase.from("referrals").select("*", { count: "exact", head: true }).eq("status", "completed");

      setStats({
        totalVisits: counter?.total_visits || 0,
        uniqueVisitors: counter?.unique_visitors || 0,
        todayVisits: counter?.today_visits || 0,
        leads: leadsCount || 0,
        signups: signupsCount || 0,
        referrals: refsCount || 0,
      });

      const { data: visits } = await supabase.from("site_visits")
        .select("utm_source, city").not("utm_source", "is", null).limit(1000);
      if (visits) {
        const srcMap: Record<string, number> = {};
        const cityMap: Record<string, number> = {};
        visits.forEach((v: any) => {
          if (v.utm_source) srcMap[v.utm_source] = (srcMap[v.utm_source] || 0) + 1;
          if (v.city) cityMap[v.city] = (cityMap[v.city] || 0) + 1;
        });
        setSources(Object.entries(srcMap).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count).slice(0, 8));
        setTopCities(Object.entries(cityMap).map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count).slice(0, 8));
      }
      setLoading(false);
    };
    load();
  }, []);

  const conversionRate = stats.uniqueVisitors > 0 ? ((stats.signups / stats.uniqueVisitors) * 100).toFixed(2) : "0";

  const cards = [
    { label: "إجمالي الزيارات", value: stats.totalVisits, icon: Eye, color: "text-info" },
    { label: "زوار فريدون", value: stats.uniqueVisitors, icon: Users, color: "text-primary" },
    { label: "زيارات اليوم", value: stats.todayVisits, icon: TrendingUp, color: "text-success" },
    { label: "تسجيلات Leads", value: stats.leads, icon: Target, color: "text-warning" },
    { label: "حسابات مسجلة", value: stats.signups, icon: MousePointerClick, color: "text-violet-500" },
    { label: "إحالات ناجحة", value: stats.referrals, icon: Globe, color: "text-cyan-500" },
  ];

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">📈 تحليلات النمو (Growth Analytics)</h1>
        <p className="text-sm text-muted-foreground mt-1">قياس الزوار، التحويلات، والمصادر بشكل لحظي</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass-card rounded-xl p-4">
            <c.icon className={`w-5 h-5 ${c.color} mb-2`} />
            <p className="text-2xl font-bold text-foreground">{loading ? "..." : c.value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="font-bold text-foreground mb-4">🎯 معدل التحويل (Conversion Funnel)</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">زوار → تسجيل</span>
            <span className="text-lg font-bold text-primary">{conversionRate}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full gradient-primary" style={{ width: `${Math.min(Number(conversionRate) * 2, 100)}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-6">
          <h2 className="font-bold text-foreground mb-4">🌍 أهم المصادر</h2>
          {sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد مصادر مسجلة بعد</p>
          ) : (
            <div className="space-y-2">
              {sources.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                  <span className="text-sm text-foreground">{s.source}</span>
                  <span className="text-sm font-bold text-primary">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="glass-card rounded-2xl p-6">
          <h2 className="font-bold text-foreground mb-4">📍 أكثر المدن زيارة</h2>
          {topCities.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد بيانات جغرافية بعد</p>
          ) : (
            <div className="space-y-2">
              {topCities.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                  <span className="text-sm text-foreground">{c.city}</span>
                  <span className="text-sm font-bold text-info">{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GrowthAnalytics;
