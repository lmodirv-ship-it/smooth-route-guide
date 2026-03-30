import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/context";
import { Card } from "@/components/ui/card";
import { Eye, Users, TrendingUp, Monitor, Smartphone, Globe, Clock, BarChart3 } from "lucide-react";

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

const VisitorAnalytics = () => {
  const { dir } = useI18n();
  const [counter, setCounter] = useState<CounterRow | null>(null);
  const [recentVisits, setRecentVisits] = useState<VisitRow[]>([]);
  const [deviceStats, setDeviceStats] = useState<{ mobile: number; desktop: number }>({ mobile: 0, desktop: 0 });
  const [browserStats, setBrowserStats] = useState<Record<string, number>>({});
  const [osStats, setOsStats] = useState<Record<string, number>>({});
  const [hourlyStats, setHourlyStats] = useState<number[]>(new Array(24).fill(0));
  const [topPages, setTopPages] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("analytics-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_visit_counter" }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    // Counter
    const { data: cData } = await supabase
      .from("site_visit_counter")
      .select("*")
      .eq("id", 1)
      .single();
    if (cData) setCounter(cData as any);

    // Recent visits (last 500)
    const { data: visits } = await supabase
      .from("site_visits")
      .select("created_at, page_path, device_type, browser, os, referrer, language, country, city, session_id")
      .order("created_at", { ascending: false })
      .limit(500);

    if (visits && visits.length > 0) {
      setRecentVisits(visits as VisitRow[]);

      // Device stats
      const mobile = visits.filter((v: any) => v.device_type === "mobile").length;
      setDeviceStats({ mobile, desktop: visits.length - mobile });

      // Browser stats
      const browsers: Record<string, number> = {};
      visits.forEach((v: any) => { browsers[v.browser || "Other"] = (browsers[v.browser || "Other"] || 0) + 1; });
      setBrowserStats(browsers);

      // OS stats
      const oses: Record<string, number> = {};
      visits.forEach((v: any) => { oses[v.os || "Other"] = (oses[v.os || "Other"] || 0) + 1; });
      setOsStats(oses);

      // Hourly distribution
      const hours = new Array(24).fill(0);
      visits.forEach((v: any) => {
        const h = new Date(v.created_at).getHours();
        hours[h]++;
      });
      setHourlyStats(hours);

      // Top pages
      const pages: Record<string, number> = {};
      visits.forEach((v: any) => { pages[v.page_path || "/"] = (pages[v.page_path || "/"] || 0) + 1; });
      setTopPages(pages);
    }
  };

  const maxHourly = Math.max(...hourlyStats, 1);

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">تحليلات الزوار</h1>
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Eye, label: "إجمالي الزيارات", value: counter?.total_visits || 0, color: "text-primary", bg: "bg-primary/10" },
          { icon: Users, label: "زوار فريدون", value: counter?.unique_visitors || 0, color: "text-emerald-400", bg: "bg-emerald-400/10" },
          { icon: TrendingUp, label: "زيارات اليوم", value: counter?.today_visits || 0, color: "text-amber-400", bg: "bg-amber-400/10" },
          { icon: Smartphone, label: "زيارات الموبايل", value: deviceStats.mobile, color: "text-info", bg: "bg-info/10" },
        ].map((stat, i) => (
          <Card key={i} className="glass-card p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-foreground">{stat.value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly distribution */}
        <Card className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">توزيع الزيارات بالساعة</h3>
          </div>
          <div className="flex items-end gap-1 h-32">
            {hourlyStats.map((count, h) => (
              <div key={h} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-primary/60 rounded-t transition-all duration-300 min-h-[2px]"
                  style={{ height: `${(count / maxHourly) * 100}%` }}
                />
                {h % 4 === 0 && <span className="text-[9px] text-muted-foreground">{h}h</span>}
              </div>
            ))}
          </div>
        </Card>

        {/* Device split */}
        <Card className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Monitor className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">الأجهزة</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: "Desktop", value: deviceStats.desktop, icon: Monitor, color: "bg-primary" },
              { label: "Mobile", value: deviceStats.mobile, icon: Smartphone, color: "bg-info" },
            ].map((d, i) => (
              <div key={i} className="flex items-center gap-3">
                <d.icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground w-16">{d.label}</span>
                <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full ${d.color} rounded-full transition-all`}
                    style={{ width: `${recentVisits.length ? (d.value / recentVisits.length) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-bold tabular-nums text-foreground w-10 text-left">{d.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-border">
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">المتصفحات</h4>
            <div className="space-y-2">
              {Object.entries(browserStats).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{name}</span>
                  <span className="font-bold tabular-nums text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">أنظمة التشغيل</h4>
            <div className="space-y-2">
              {Object.entries(osStats).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{name}</span>
                  <span className="font-bold tabular-nums text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Top pages */}
      <Card className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">أكثر الصفحات زيارة</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-right py-2 px-3">الصفحة</th>
                <th className="text-right py-2 px-3">الزيارات</th>
                <th className="text-right py-2 px-3">النسبة</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(topPages).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([path, count]) => (
                <tr key={path} className="border-b border-border/30 hover:bg-secondary/30">
                  <td className="py-2 px-3 font-mono text-foreground">{path}</td>
                  <td className="py-2 px-3 font-bold tabular-nums text-foreground">{count}</td>
                  <td className="py-2 px-3 text-muted-foreground">
                    {recentVisits.length ? `${((count / recentVisits.length) * 100).toFixed(1)}%` : "0%"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent visits */}
      <Card className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">آخر الزيارات</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-right py-2 px-3">الوقت</th>
                <th className="text-right py-2 px-3">الصفحة</th>
                <th className="text-right py-2 px-3">الجهاز</th>
                <th className="text-right py-2 px-3">المتصفح</th>
                <th className="text-right py-2 px-3">النظام</th>
                <th className="text-right py-2 px-3">اللغة</th>
              </tr>
            </thead>
            <tbody>
              {recentVisits.slice(0, 20).map((v, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-secondary/30">
                  <td className="py-2 px-3 text-muted-foreground tabular-nums">
                    {new Date(v.created_at).toLocaleTimeString("ar-MA", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="py-2 px-3 font-mono text-foreground">{v.page_path}</td>
                  <td className="py-2 px-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${v.device_type === "mobile" ? "bg-info/20 text-info" : "bg-primary/20 text-primary"}`}>
                      {v.device_type === "mobile" ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                      {v.device_type}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-foreground">{v.browser}</td>
                  <td className="py-2 px-3 text-foreground">{v.os}</td>
                  <td className="py-2 px-3 text-muted-foreground">{v.language}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default VisitorAnalytics;
