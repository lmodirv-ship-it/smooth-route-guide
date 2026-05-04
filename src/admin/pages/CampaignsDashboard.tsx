import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Target, TrendingUp, Users, MousePointerClick, Calendar, Filter, Trophy, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface VisitRow {
  session_id: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  country: string | null;
  city: string | null;
  device_type: string | null;
  created_at: string;
}

interface CampaignRow {
  source: string;
  medium: string;
  campaign: string;
  visits: number;
  uniqueSessions: number;
  topCountry: string;
  topDevice: string;
  lastSeen: string;
}

const RANGE_OPTIONS = [
  { value: 1, label: "آخر 24 ساعة" },
  { value: 7, label: "آخر 7 أيام" },
  { value: 30, label: "آخر 30 يوم" },
  { value: 90, label: "آخر 90 يوم" },
];

const CampaignsDashboard = () => {
  const [days, setDays] = useState(7);
  const [rows, setRows] = useState<VisitRow[]>([]);
  const [signupsCount, setSignupsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterSource, setFilterSource] = useState<string>("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data: visits } = await supabase
        .from("site_visits")
        .select("session_id, utm_source, utm_medium, utm_campaign, utm_content, country, city, device_type, created_at")
        .gte("created_at", since)
        .not("utm_source", "is", null)
        .neq("utm_source", "")
        .limit(5000);

      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", since);

      setRows((visits as VisitRow[]) || []);
      setSignupsCount(count || 0);
      setLoading(false);
    };
    load();
  }, [days]);

  const sources = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.utm_source && s.add(r.utm_source));
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(
    () => (filterSource === "all" ? rows : rows.filter((r) => r.utm_source === filterSource)),
    [rows, filterSource]
  );

  const campaigns = useMemo<CampaignRow[]>(() => {
    const map = new Map<string, { visits: VisitRow[]; sessions: Set<string> }>();
    filtered.forEach((r) => {
      const key = `${r.utm_source || "—"}|${r.utm_medium || "—"}|${r.utm_campaign || "—"}`;
      if (!map.has(key)) map.set(key, { visits: [], sessions: new Set() });
      const entry = map.get(key)!;
      entry.visits.push(r);
      entry.sessions.add(r.session_id);
    });

    return Array.from(map.entries())
      .map(([key, { visits, sessions }]) => {
        const [source, medium, campaign] = key.split("|");
        const countryCount: Record<string, number> = {};
        const deviceCount: Record<string, number> = {};
        let lastSeen = visits[0].created_at;
        visits.forEach((v) => {
          const c = v.country || "?";
          const d = v.device_type || "?";
          countryCount[c] = (countryCount[c] || 0) + 1;
          deviceCount[d] = (deviceCount[d] || 0) + 1;
          if (v.created_at > lastSeen) lastSeen = v.created_at;
        });
        const topCountry = Object.entries(countryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
        const topDevice = Object.entries(deviceCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
        return {
          source,
          medium,
          campaign,
          visits: visits.length,
          uniqueSessions: sessions.size,
          topCountry,
          topDevice,
          lastSeen,
        };
      })
      .sort((a, b) => b.visits - a.visits);
  }, [filtered]);

  const totals = useMemo(() => {
    const totalVisits = filtered.length;
    const totalSessions = new Set(filtered.map((r) => r.session_id)).size;
    return { totalVisits, totalSessions, signupsCount };
  }, [filtered, signupsCount]);

  const conversionRate =
    totals.totalSessions > 0 ? ((totals.signupsCount / totals.totalSessions) * 100).toFixed(2) : "0";

  const cards = [
    { label: "زيارات الحملات", value: totals.totalVisits, icon: MousePointerClick, color: "text-primary" },
    { label: "جلسات فريدة", value: totals.totalSessions, icon: Users, color: "text-success" },
    { label: "تسجيلات الفترة", value: totals.signupsCount, icon: Target, color: "text-warning" },
    { label: "معدل التحويل", value: `${conversionRate}%`, icon: TrendingUp, color: "text-info" },
  ];

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            🎯 حملات التسويق (Campaigns)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            أداء كل حملة UTM: زيارات، جلسات فريدة، أعلى دولة، ونوع الجهاز
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 rounded-lg bg-secondary/60 border border-border text-foreground text-sm"
          >
            {RANGE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card rounded-xl p-4"
          >
            <c.icon className={`w-5 h-5 ${c.color} mb-2`} />
            <p className="text-2xl font-bold text-foreground">
              {loading ? "..." : typeof c.value === "number" ? c.value.toLocaleString() : c.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filter */}
      {sources.length > 0 && (
        <div className="glass-card rounded-2xl p-4 flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-bold text-foreground">تصفية حسب المصدر:</span>
          <button
            onClick={() => setFilterSource("all")}
            className={`text-xs px-3 py-1 rounded-full border transition ${
              filterSource === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary/40 text-muted-foreground border-border"
            }`}
          >
            الكل
          </button>
          {sources.map((s) => (
            <button
              key={s}
              onClick={() => setFilterSource(s)}
              className={`text-xs px-3 py-1 rounded-full border transition ${
                filterSource === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">جاري التحميل...</div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Target className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
            <p className="text-foreground font-bold">لا توجد بيانات حملات في هذه الفترة</p>
            <p className="text-sm text-muted-foreground">
              ابدأ بإنشاء روابط UTM من <a href="/admin/utm-builder" className="text-primary underline">صانع الروابط</a> ثم وزّعها في إعلاناتك
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 border-b border-border">
                <tr className="text-right">
                  <th className="px-4 py-3 font-bold text-foreground">المصدر</th>
                  <th className="px-4 py-3 font-bold text-foreground">الوسيلة</th>
                  <th className="px-4 py-3 font-bold text-foreground">الحملة</th>
                  <th className="px-4 py-3 font-bold text-foreground text-center">زيارات</th>
                  <th className="px-4 py-3 font-bold text-foreground text-center">فريدة</th>
                  <th className="px-4 py-3 font-bold text-foreground">أعلى دولة</th>
                  <th className="px-4 py-3 font-bold text-foreground">جهاز</th>
                  <th className="px-4 py-3 font-bold text-foreground">آخر زيارة</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, i) => (
                  <tr key={i} className="border-b border-border hover:bg-secondary/30 transition">
                    <td className="px-4 py-3 text-foreground font-medium">{c.source}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.medium}</td>
                    <td className="px-4 py-3 text-foreground">{c.campaign}</td>
                    <td className="px-4 py-3 text-center font-bold text-primary tabular-nums">{c.visits}</td>
                    <td className="px-4 py-3 text-center font-bold text-success tabular-nums">{c.uniqueSessions}</td>
                    <td className="px-4 py-3 text-muted-foreground flex items-center gap-1">
                      <Globe className="w-3 h-3" /> {c.topCountry || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.topDevice}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(c.lastSeen).toLocaleString("ar")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignsDashboard;
