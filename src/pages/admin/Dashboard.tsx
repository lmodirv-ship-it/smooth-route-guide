import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { FileText, Car, DollarSign, Zap, MapPin, Clock, BatteryLow, Activity, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNearbyDrivers } from "@/hooks/useNearbyDrivers";
import GoogleMapWrapper from "@/components/GoogleMap";

interface DashboardStats {
  requestsToday: number; activeDrivers: number; ongoingRides: number;
  incomeToday: number; totalDrivers: number; offlineDrivers: number;
  deliveryPending: number; deliveryActive: number;
}

const DonutChart = ({ online, offline }: { online: number; offline: number }) => {
  const total = online + offline;
  const pct = total > 0 ? (online / total) * 100 : 0;
  const r = 52, c = 2 * Math.PI * r;
  const onS = (pct / 100) * c;
  return (
    <svg width="130" height="130" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="hsl(220, 10%, 20%)" strokeWidth="14" />
      <circle cx="70" cy="70" r={r} fill="none" stroke="hsl(145, 63%, 42%)" strokeWidth="14"
        strokeDasharray={`${onS} ${c - onS}`} strokeDashoffset={c / 4} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s ease" }} />
      <text x="70" y="64" textAnchor="middle" fill="hsl(40, 20%, 95%)" fontSize="11" fontWeight="600">Online</text>
      <text x="70" y="82" textAnchor="middle" fill="hsl(145, 63%, 42%)" fontSize="13" fontWeight="700">{Math.round(pct)}%</text>
    </svg>
  );
};

const SimpleBarChart = ({ data, color }: { data: { label: string; value: number }[]; color: string }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  const bw = 28, gap = 8, h = 150;
  const cw = data.length * (bw + gap);
  return (
    <svg width="100%" height={h + 30} viewBox={`0 0 ${cw + 20} ${h + 30}`} className="w-full">
      {data.map((d, i) => {
        const bh = (d.value / max) * h;
        const x = 10 + i * (bw + gap);
        return (
          <g key={i}>
            <rect x={x} y={h - bh} width={bw} height={bh} rx={4} fill={color} opacity={0.85} style={{ transition: "all 0.5s ease" }} />
            <text x={x + bw / 2} y={h + 16} textAnchor="middle" fill="hsl(220, 10%, 45%)" fontSize="9">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
};

const AdminDashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats>({ requestsToday: 0, activeDrivers: 0, ongoingRides: 0, incomeToday: 0, totalDrivers: 0, offlineDrivers: 0, deliveryPending: 0, deliveryActive: 0 });
  const [incomeRange, setIncomeRange] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [recentTrips, setRecentTrips] = useState<any[]>([]);
  const { drivers: nearbyDrivers } = useNearbyDrivers();

  const fetchStats = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [reqRes, activeRes, totalRes, ridesRes, incomeRes, delPendRes, delActiveRes] = await Promise.all([
      supabase.from("ride_requests").select("id", { count: "exact", head: true }).gte("created_at", today),
      supabase.from("drivers").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("drivers").select("id", { count: "exact", head: true }),
      supabase.from("trips").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
      supabase.from("earnings").select("amount").gte("date", today),
      supabase.from("delivery_orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("delivery_orders").select("id", { count: "exact", head: true }).in("status", ["accepted", "picked_up", "in_transit"]),
    ]);
    const totalIncome = (incomeRes.data || []).reduce((s, e) => s + Number(e.amount), 0);
    const active = activeRes.count || 0, total = totalRes.count || 0;
    setStats({ requestsToday: reqRes.count || 0, activeDrivers: active, ongoingRides: ridesRes.count || 0, incomeToday: totalIncome, totalDrivers: total, offlineDrivers: total - active, deliveryPending: delPendRes.count || 0, deliveryActive: delActiveRes.count || 0 });
  }, []);

  const fetchTrips = useCallback(async () => {
    const { data } = await supabase.from("trips").select("*").order("created_at", { ascending: false }).limit(8);
    if (data) setRecentTrips(data);
  }, []);

  useEffect(() => {
    fetchStats(); fetchTrips();
    const interval = setInterval(() => { fetchStats(); fetchTrips(); }, 5000);
    const ch = supabase.channel("dash-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_requests" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, () => { fetchTrips(); fetchStats(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_orders" }, fetchStats)
      .subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(ch); };
  }, [fetchStats, fetchTrips]);

  const incomeChartData = useMemo(() => {
    const labels = incomeRange === "daily" ? ["٦ص", "٩ص", "١٢", "٣م", "٦م", "٩م"]
      : incomeRange === "weekly" ? ["سبت", "أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة"]
      : ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو"];
    return labels.map(l => ({ label: l, value: Math.floor(Math.random() * 1500 + 300) }));
  }, [incomeRange]);

  const alerts = [
    { driver: "محمد السعيد", alert: "بعيد عن نقطة الاستلام", status: "warning", icon: MapPin },
    { driver: "أحمد الحربي", alert: "بطارية الهاتف ضعيفة", status: "danger", icon: BatteryLow },
    { driver: "خالد العمري", alert: "تأخر في الوصول", status: "warning", icon: Clock },
  ];

  const onlinePercent = stats.totalDrivers > 0 ? Math.round((stats.activeDrivers / stats.totalDrivers) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { icon: FileText, label: "إجمالي الطلبات", value: stats.requestsToday, color: "text-info", glow: "glow-ring-blue" },
          { icon: Car, label: "السائقون النشطون", value: stats.activeDrivers, color: "text-primary", glow: "glow-ring-orange" },
          { icon: Zap, label: "رحلات جارية", value: stats.ongoingRides, color: "text-success", glow: "" },
          { icon: Package, label: "توصيل معلّق", value: stats.deliveryPending, color: "text-accent", glow: "" },
          { icon: Package, label: "توصيل نشط", value: stats.deliveryActive, color: "text-info", glow: "glow-ring-blue" },
          { icon: DollarSign, label: "أرباح اليوم", value: stats.incomeToday, color: "text-warning", glow: "glow-ring-orange", prefix: "" },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="gradient-card rounded-xl p-5 border border-border hover:border-primary/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-secondary ${stat.glow}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">{stat.value.toLocaleString()} {stat.label === "أرباح اليوم" ? "ر.س" : ""}</p>
          </motion.div>
        ))}
      </div>

      {/* Map + Driver Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 gradient-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <Badge variant="outline" className="text-success border-success/30">{nearbyDrivers.length} online</Badge>
            <h3 className="font-bold text-foreground">الخريطة المباشرة</h3>
          </div>
          <div className="h-72">
            <GoogleMapWrapper zoom={11} showMarker={false} nearbyDrivers={nearbyDrivers.map(d => ({ id: d.id, lat: d.lat, lng: d.lng }))} />
          </div>
        </div>

        <div className="gradient-card rounded-xl border border-border p-5">
          <h3 className="font-bold text-foreground text-right mb-4">حالة السائقين</h3>
          <div className="flex items-center justify-center gap-6">
            <DonutChart online={stats.activeDrivers} offline={stats.offlineDrivers} />
            <div className="space-y-3 text-right">
              <div><p className="text-2xl font-bold text-foreground">{onlinePercent}%</p><p className="text-xs text-success">متصل · {stats.activeDrivers}</p></div>
              <div><p className="text-2xl font-bold text-foreground">{100 - onlinePercent}%</p><p className="text-xs text-muted-foreground">غير متصل · {stats.offlineDrivers}</p></div>
            </div>
          </div>
        </div>
      </div>

      {/* Earnings + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="gradient-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1">
              {(["daily", "weekly", "monthly"] as const).map(r => (
                <button key={r} onClick={() => setIncomeRange(r)}
                  className={`text-xs px-3 py-1 rounded-lg transition-colors ${incomeRange === r ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                  {r === "daily" ? "يومي" : r === "weekly" ? "أسبوعي" : "شهري"}
                </button>
              ))}
            </div>
            <h3 className="font-bold text-foreground">تحليل الأرباح</h3>
          </div>
          <SimpleBarChart data={incomeChartData} color="hsl(205, 78%, 56%)" />
        </div>

        <div className="gradient-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border"><h3 className="font-bold text-foreground text-right">التنبيهات</h3></div>
          <div className="divide-y divide-border/50">
            {alerts.map((a, i) => (
              <div key={i} className="p-3 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                <Badge variant="outline" className={a.status === "danger" ? "text-destructive border-destructive/30" : "text-warning border-warning/30"}>
                  {a.status === "danger" ? "⚠ خطر" : "⚠ تحذير"}
                </Badge>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <p className="text-sm text-foreground font-medium">{a.driver}</p>
                    <p className="text-xs text-muted-foreground">{a.alert}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <a.icon className={`w-4 h-4 ${a.status === "danger" ? "text-destructive" : "text-warning"}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Trips */}
      <div className="gradient-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border"><h3 className="font-bold text-foreground text-right">آخر الرحلات</h3></div>
        <div className="divide-y divide-border/50 max-h-72 overflow-auto">
          {recentTrips.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">لا توجد رحلات</div>}
          {recentTrips.map((trip) => (
            <div key={trip.id} className="p-3 flex items-center justify-between text-right hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  trip.status === "completed" ? "bg-success/10 text-success" : trip.status === "in_progress" ? "bg-info/10 text-info" : "bg-destructive/10 text-destructive"
                }`}>{trip.status === "completed" ? "مكتملة" : trip.status === "in_progress" ? "جارية" : "ملغاة"}</span>
                <span className="text-primary font-semibold text-sm">{trip.fare || 0} ر.س</span>
              </div>
              <div>
                <p className="text-sm text-foreground font-medium truncate max-w-[250px]">{trip.start_location || "—"}</p>
                <p className="text-xs text-muted-foreground truncate max-w-[250px]">{trip.end_location || "—"}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
