import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/context";
import { Eye, Users, TrendingUp, Monitor, Smartphone, Globe, Clock, BarChart3, Zap, Activity } from "lucide-react";

interface VisitRow {
  created_at: string;
  page_path: string;
  device_type: string;
  browser: string;
  os: string;
  referrer: string;
  language: string;
  country: string;
  city: string;
  session_id: string;
}

interface CounterRow {
  total_visits: number;
  unique_visitors: number;
  today_visits: number;
  today_date: string;
}

/* ──── Animated Number Counter ──── */
const AnimatedNumber = ({ value, duration = 1200 }: { value: number; duration?: number }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const start = ref.current;
    const diff = value - start;
    if (diff === 0) return;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(animate);
      else ref.current = value;
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{display.toLocaleString()}</span>;
};

/* ──── Live Pulse Ring ──── */
const PulseRing = () => (
  <div className="relative w-3 h-3">
    <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />
    <div className="absolute inset-0 rounded-full bg-emerald-400 animate-pulse" />
  </div>
);

/* ──── Sparkle Particle ──── */
const Sparkle = ({ delay }: { delay: number }) => (
  <motion.div
    className="absolute w-1 h-1 rounded-full bg-primary/60"
    initial={{ opacity: 0, scale: 0 }}
    animate={{
      opacity: [0, 1, 0],
      scale: [0, 1.5, 0],
      y: [0, -30],
      x: [0, (Math.random() - 0.5) * 40],
    }}
    transition={{ duration: 2, delay, repeat: Infinity, repeatDelay: 3 }}
  />
);

const VisitorAnalytics = () => {
  const { dir } = useI18n();
  const [counter, setCounter] = useState<CounterRow | null>(null);
  const [recentVisits, setRecentVisits] = useState<VisitRow[]>([]);
  const [deviceStats, setDeviceStats] = useState({ mobile: 0, desktop: 0 });
  const [browserStats, setBrowserStats] = useState<Record<string, number>>({});
  const [osStats, setOsStats] = useState<Record<string, number>>({});
  const [hourlyStats, setHourlyStats] = useState<number[]>(new Array(24).fill(0));
  const [topPages, setTopPages] = useState<Record<string, number>>({});
  const [flashPulse, setFlashPulse] = useState(false);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("analytics-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_visit_counter" }, () => {
        setFlashPulse(true);
        setTimeout(() => setFlashPulse(false), 600);
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    const { data: cData } = await supabase.from("site_visit_counter").select("*").eq("id", 1).single();
    if (cData) setCounter(cData as any);

    const { data: visits } = await supabase
      .from("site_visits")
      .select("created_at, page_path, device_type, browser, os, referrer, language, country, city, session_id")
      .order("created_at", { ascending: false })
      .limit(500);

    if (visits && visits.length > 0) {
      setRecentVisits(visits as VisitRow[]);
      const mobile = visits.filter((v: any) => v.device_type === "mobile").length;
      setDeviceStats({ mobile, desktop: visits.length - mobile });

      const browsers: Record<string, number> = {};
      visits.forEach((v: any) => { browsers[v.browser || "Other"] = (browsers[v.browser || "Other"] || 0) + 1; });
      setBrowserStats(browsers);

      const oses: Record<string, number> = {};
      visits.forEach((v: any) => { oses[v.os || "Other"] = (oses[v.os || "Other"] || 0) + 1; });
      setOsStats(oses);

      const hours = new Array(24).fill(0);
      visits.forEach((v: any) => { hours[new Date(v.created_at).getHours()]++; });
      setHourlyStats(hours);

      const pages: Record<string, number> = {};
      visits.forEach((v: any) => { pages[v.page_path || "/"] = (pages[v.page_path || "/"] || 0) + 1; });
      setTopPages(pages);
    }
  };

  const maxHourly = Math.max(...hourlyStats, 1);
  const totalVisits = recentVisits.length || 1;

  const statCards = [
    { icon: Eye, label: "إجمالي الزيارات", value: counter?.total_visits || 0, gradient: "from-primary/20 to-primary/5", glow: "shadow-[0_0_30px_hsl(var(--primary)/0.3)]", iconColor: "text-primary" },
    { icon: Users, label: "زوار فريدون", value: counter?.unique_visitors || 0, gradient: "from-emerald-500/20 to-emerald-500/5", glow: "shadow-[0_0_30px_rgba(16,185,129,0.3)]", iconColor: "text-emerald-400" },
    { icon: TrendingUp, label: "زيارات اليوم", value: counter?.today_visits || 0, gradient: "from-amber-500/20 to-amber-500/5", glow: "shadow-[0_0_30px_rgba(245,158,11,0.3)]", iconColor: "text-amber-400" },
    { icon: Smartphone, label: "زيارات الموبايل", value: deviceStats.mobile, gradient: "from-blue-500/20 to-blue-500/5", glow: "shadow-[0_0_30px_rgba(59,130,246,0.3)]", iconColor: "text-blue-400" },
  ];

  return (
    <div className="space-y-8 relative" dir={dir}>
      {/* Background particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-0.5 h-0.5 rounded-full bg-primary/30"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
            animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.5, 1] }}
            transition={{ duration: 3 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 2 }}
          />
        ))}
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 relative z-10"
      >
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_40px_hsl(var(--primary)/0.2)]">
            <BarChart3 className="w-7 h-7 text-primary" />
          </div>
          <div className="absolute -top-1 -right-1">
            <PulseRing />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">تحليلات الزوار</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            بيانات لحظية · تحديث تلقائي
          </p>
        </div>
      </motion.div>

      {/* Flash overlay on new visit */}
      <AnimatePresence>
        {flashPulse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.08 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-primary z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* ═══ Main Stat Cards ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative z-10">
        {statCards.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.1, type: "spring", stiffness: 300, damping: 25 }}
            whileHover={{ scale: 1.03, y: -4 }}
            className={`relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br ${stat.gradient} backdrop-blur-xl p-6 ${stat.glow} transition-shadow duration-500 group cursor-default`}
          >
            {/* Sparkles */}
            <div className="absolute top-2 right-4">
              {[0, 0.5, 1].map((d) => <Sparkle key={d} delay={d + i * 0.3} />)}
            </div>

            {/* Shimmer sweep */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </div>

            <div className="relative z-10 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-background/40 backdrop-blur flex items-center justify-center border border-border/30">
                <stat.icon className={`w-7 h-7 ${stat.iconColor}`} />
              </div>
              <div>
                <p className="text-3xl font-black tabular-nums text-foreground leading-none">
                  <AnimatedNumber value={stat.value} />
                </p>
                <p className="text-xs text-muted-foreground mt-1.5 font-medium">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ═══ Charts Row ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
        {/* Hourly Chart */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-border/50 bg-gradient-to-br from-background/80 to-secondary/20 backdrop-blur-xl p-6 shadow-[0_0_20px_hsl(var(--primary)/0.05)]"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">توزيع الزيارات بالساعة</h3>
              <p className="text-xs text-muted-foreground">آخر 500 زيارة</p>
            </div>
          </div>
          <div className="flex items-end gap-[3px] h-40">
            {hourlyStats.map((count, h) => {
              const pct = (count / maxHourly) * 100;
              return (
                <motion.div
                  key={h}
                  className="flex-1 flex flex-col items-center gap-1 group/bar relative"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 0.5 + h * 0.02, type: "spring" }}
                  style={{ transformOrigin: "bottom" }}
                >
                  {/* Tooltip */}
                  <div className="absolute -top-8 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-foreground text-background text-[10px] px-2 py-0.5 rounded-lg whitespace-nowrap z-20 font-bold">
                    {h}:00 → {count}
                  </div>
                  <div
                    className="w-full rounded-t-sm transition-all duration-300 min-h-[2px] group-hover/bar:brightness-150"
                    style={{
                      height: `${Math.max(pct, 2)}%`,
                      background: `linear-gradient(to top, hsl(var(--primary) / 0.8), hsl(var(--primary) / 0.3))`,
                      boxShadow: count > 0 ? `0 0 8px hsl(var(--primary) / 0.3)` : "none",
                    }}
                  />
                  {h % 3 === 0 && (
                    <span className="text-[9px] text-muted-foreground tabular-nums">{h}</span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Device & Browser */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl border border-border/50 bg-gradient-to-br from-background/80 to-secondary/20 backdrop-blur-xl p-6 shadow-[0_0_20px_hsl(var(--primary)/0.05)]"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-bold text-foreground">الأجهزة والمتصفحات</h3>
          </div>

          {/* Device bars */}
          <div className="space-y-4 mb-6">
            {[
              { label: "Desktop", value: deviceStats.desktop, icon: Monitor, color: "hsl(var(--primary))" },
              { label: "Mobile", value: deviceStats.mobile, icon: Smartphone, color: "hsl(210,100%,60%)" },
            ].map((d, i) => (
              <div key={i} className="flex items-center gap-3">
                <d.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground w-16 shrink-0">{d.label}</span>
                <div className="flex-1 h-4 bg-secondary/50 rounded-full overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(d.value / totalVisits) * 100}%` }}
                    transition={{ delay: 0.6 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full relative"
                    style={{
                      background: `linear-gradient(90deg, ${d.color}, ${d.color}80)`,
                      boxShadow: `0 0 12px ${d.color}40`,
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  </motion.div>
                </div>
                <span className="text-sm font-bold tabular-nums text-foreground w-10 text-left">{d.value}</span>
              </div>
            ))}
          </div>

          {/* Browsers */}
          <div className="border-t border-border/30 pt-4">
            <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">المتصفحات</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(browserStats).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name, count], i) => (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + i * 0.05 }}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-secondary/30 border border-border/20"
                >
                  <span className="text-sm text-foreground">{name}</span>
                  <span className="text-sm font-bold tabular-nums text-primary">{count}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* OS */}
          <div className="border-t border-border/30 pt-4 mt-4">
            <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">أنظمة التشغيل</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(osStats).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name, count], i) => (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.9 + i * 0.05 }}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-secondary/30 border border-border/20"
                >
                  <span className="text-sm text-foreground">{name}</span>
                  <span className="text-sm font-bold tabular-nums text-amber-400">{count}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══ Top Pages ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="rounded-2xl border border-border/50 bg-gradient-to-br from-background/80 to-secondary/20 backdrop-blur-xl p-6 relative z-10 shadow-[0_0_20px_hsl(var(--primary)/0.05)]"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-bold text-foreground">أكثر الصفحات زيارة</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">الصفحة</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">الزيارات</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">النسبة</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium w-40"></th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(topPages).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([path, count], i) => {
                const pct = (count / totalVisits) * 100;
                return (
                  <motion.tr
                    key={path}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + i * 0.04 }}
                    className="border-b border-border/10 hover:bg-primary/5 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-foreground text-xs">{path}</td>
                    <td className="py-3 px-4 font-bold tabular-nums text-foreground">{count}</td>
                    <td className="py-3 px-4 text-muted-foreground tabular-nums">{pct.toFixed(1)}%</td>
                    <td className="py-3 px-4">
                      <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.8 + i * 0.05, duration: 0.6 }}
                          className="h-full rounded-full"
                          style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.5))" }}
                        />
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ═══ Recent Visits ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="rounded-2xl border border-border/50 bg-gradient-to-br from-background/80 to-secondary/20 backdrop-blur-xl p-6 relative z-10 shadow-[0_0_20px_hsl(var(--primary)/0.05)]"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center relative">
            <Zap className="w-5 h-5 text-primary" />
            <div className="absolute -top-0.5 -right-0.5">
              <PulseRing />
            </div>
          </div>
          <div>
            <h3 className="font-bold text-foreground">البث المباشر</h3>
            <p className="text-xs text-muted-foreground">آخر 20 زيارة في الوقت الحقيقي</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                {["الوقت", "الصفحة", "الجهاز", "المتصفح", "النظام", "اللغة"].map((h) => (
                  <th key={h} className="text-right py-3 px-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {recentVisits.slice(0, 20).map((v, i) => (
                  <motion.tr
                    key={v.session_id + v.created_at}
                    initial={{ opacity: 0, x: -20, backgroundColor: "hsl(var(--primary) / 0.1)" }}
                    animate={{ opacity: 1, x: 0, backgroundColor: "transparent" }}
                    transition={{ delay: i * 0.03, duration: 0.4 }}
                    className="border-b border-border/10 hover:bg-primary/5 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-muted-foreground tabular-nums text-xs">
                      {new Date(v.created_at).toLocaleTimeString("ar-MA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-foreground text-xs">{v.page_path}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                        v.device_type === "mobile"
                          ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                          : "bg-primary/15 text-primary border border-primary/20"
                      }`}>
                        {v.device_type === "mobile" ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                        {v.device_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-foreground text-xs">{v.browser}</td>
                    <td className="py-2.5 px-3 text-foreground text-xs">{v.os}</td>
                    <td className="py-2.5 px-3 text-muted-foreground text-xs">{v.language}</td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default VisitorAnalytics;
