import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { FileText, Car, DollarSign, Zap, MapPin, Clock, BatteryLow, Package, TrendingUp, TrendingDown, Users, ArrowUpRight, CreditCard, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAdminGeo } from "@/admin/contexts/AdminGeoContext";
import { useNearbyDrivers } from "@/hooks/useNearbyDrivers";
import LeafletMap from "@/components/LeafletMap";
import { useI18n } from "@/i18n/context";

interface DashboardStats {
  requestsToday: number;
  activeDrivers: number;
  ongoingRides: number;
  incomeToday: number;
  totalDrivers: number;
  offlineDrivers: number;
  deliveryPending: number;
  deliveryActive: number;
  activeDriverSubs: number;
  activeCustomerSubs: number;
}

interface DashboardAlert {
  id: string;
  driver: string;
  alert: string;
  status: "warning" | "danger";
  icon: typeof MapPin;
}

const DonutChart = ({ online, offline }: { online: number; offline: number }) => {
  const total = online + offline;
  const pct = total > 0 ? (online / total) * 100 : 0;
  const r = 56;
  const c = 2 * Math.PI * r;
  const onS = (pct / 100) * c;

  return (
    <div className="relative">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <defs>
          <linearGradient id="donut-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--info))" />
          </linearGradient>
        </defs>
        <circle cx="70" cy="70" r={r} fill="none" stroke="hsl(var(--secondary))" strokeWidth="12" opacity="0.5" />
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke="url(#donut-gradient)" strokeWidth="12"
          strokeDasharray={`${onS} ${c - onS}`}
          strokeDashoffset={c / 4}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
        <text x="70" y="64" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10" fontWeight="500">Online</text>
        <text x="70" y="84" textAnchor="middle" fill="hsl(var(--primary))" fontSize="18" fontWeight="800">{Math.round(pct)}%</text>
      </svg>
    </div>
  );
};

const BarChartPro = ({ data, color }: { data: { label: string; value: number }[]; color: string }) => {
  const max = Math.max(...data.map((d) => d.value), 1);
  const bw = 32;
  const gap = 12;
  const h = 160;
  const cw = data.length * (bw + gap);

  return (
    <svg width="100%" height={h + 35} viewBox={`0 0 ${cw + 20} ${h + 35}`} className="w-full">
      <defs>
        <linearGradient id="bar-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const bh = (d.value / max) * h;
        const x = 10 + i * (bw + gap);
        return (
          <g key={i}>
            <rect x={x} y={h - bh} width={bw} height={bh} rx={6} fill="url(#bar-grad)" style={{ transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }} />
            <text x={x + bw / 2} y={h + 18} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="9" fontWeight="500">{d.label}</text>
            {d.value > 0 && (
              <text x={x + bw / 2} y={h - bh - 6} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="8" fontWeight="600">{d.value}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

const StatCard = ({ icon: Icon, label, value, color, isCurrency, index, trend }: {
  icon: any; label: string; value: number; color: string; isCurrency: boolean; index: number; trend?: number;
}) => {
  const { t } = useI18n();
  const td = t.dashboardPage;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 300, damping: 24 }}
      className="group relative glass-card rounded-2xl p-5 transition-all duration-300 hover:shadow-lg cursor-default overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-secondary to-secondary/50 shadow-inner`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${trend >= 0 ? "text-success bg-success/10" : "text-destructive bg-destructive/10"}`}>
              {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <p className="text-3xl font-extrabold text-foreground tracking-tight">
          {value.toLocaleString()} {isCurrency ? <span className="text-lg font-semibold text-muted-foreground">{td.currency}</span> : ""}
        </p>
        <p className="text-xs text-muted-foreground mt-1 font-medium">{label}</p>
      </div>
    </motion.div>
  );
};

const AdminDashboardPage = () => {
  const { t, locale } = useI18n();
  const td = t.dashboardPage;
  const geoCtx = useAdminGeo();
  const geoCountry = geoCtx?.selectedCountry || "all";
  const geoCity = geoCtx?.selectedCity || "all";
  const [stats, setStats] = useState<DashboardStats>({
    requestsToday: 0, activeDrivers: 0, ongoingRides: 0, incomeToday: 0,
    totalDrivers: 0, offlineDrivers: 0, deliveryPending: 0, deliveryActive: 0,
    activeDriverSubs: 0, activeCustomerSubs: 0,
  });
  const [incomeRange, setIncomeRange] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [recentTrips, setRecentTrips] = useState<any[]>([]);
  const [earningsEntries, setEarningsEntries] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const { drivers: nearbyDrivers } = useNearbyDrivers();

  const fetchDashboardData = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const sixMonthsAgo = new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10);

    let requestsQuery = supabase.from("ride_requests").select("id, created_at").gte("created_at", today);
    if (geoCountry !== "all") requestsQuery = requestsQuery.eq("country", geoCountry);
    if (geoCity !== "all") requestsQuery = requestsQuery.eq("city", geoCity);

    let deliveryQuery = supabase.from("delivery_orders").select("id, status");
    if (geoCountry !== "all") deliveryQuery = deliveryQuery.eq("country", geoCountry);
    if (geoCity !== "all") deliveryQuery = deliveryQuery.eq("city", geoCity);

    const now = new Date().toISOString();
    const [requestsRes, driversRes, activeTripsRes, recentTripsRes, earningsRes, deliveryOrdersRes, alertsRes, driverSubsRes, customerSubsRes] = await Promise.all([
      requestsQuery,
      supabase.from("drivers").select("id, user_id, status"),
      supabase.from("trips").select("id").eq("status", "in_progress"),
      supabase.from("trips").select("*").order("created_at", { ascending: false }).limit(8),
      supabase.from("earnings").select("amount, date, created_at, driver_id").gte("date", sixMonthsAgo),
      deliveryQuery,
      supabase.from("alerts").select("*").order("created_at", { ascending: false }).limit(5),
      supabase.from("driver_subscriptions").select("id", { count: "exact", head: true }).eq("status", "active").gte("expires_at", now),
      supabase.from("customer_subscriptions").select("id", { count: "exact", head: true }).eq("status", "active").gte("expires_at", now),
    ]);

    const drivers = driversRes.data || [];
    const earnings = earningsRes.data || [];
    const deliveryOrders = deliveryOrdersRes.data || [];
    const activeDrivers = drivers.filter((d: any) => d.status === "active").length;
    const totalIncome = earnings
      .filter((e: any) => e.date === today)
      .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

    const activeDeliveryStatuses = new Set(["accepted", "picked_up", "delivering", "in_transit", "confirmed", "arrived", "arrived_restaurant"]);

    setStats({
      requestsToday: requestsRes.data?.length || 0,
      activeDrivers,
      ongoingRides: activeTripsRes.data?.length || 0,
      incomeToday: totalIncome,
      totalDrivers: drivers.length,
      offlineDrivers: Math.max(drivers.length - activeDrivers, 0),
      deliveryPending: deliveryOrders.filter((o: any) => o.status === "pending").length,
      deliveryActive: deliveryOrders.filter((o: any) => activeDeliveryStatuses.has(o.status)).length,
      activeDriverSubs: driverSubsRes.count || 0,
      activeCustomerSubs: customerSubsRes.count || 0,
    });
    });

    setRecentTrips(recentTripsRes.data || []);
    setEarningsEntries(earnings);

    const rawAlerts = alertsRes.data || [];
    const driverIds = [...new Set(rawAlerts.map((a: any) => a.driver_id).filter(Boolean))];

    let driverNameMap = new Map<string, string>();
    if (driverIds.length > 0) {
      const { data: driverRows } = await supabase.from("drivers").select("id, user_id").in("id", driverIds);
      const driverUserIds = [...new Set((driverRows || []).map((d: any) => d.user_id).filter(Boolean))];
      const { data: profiles } = driverUserIds.length > 0 ? await supabase.from("profiles").select("id, name").in("id", driverUserIds) : { data: [] as any[] };
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.name]));
      driverNameMap = new Map((driverRows || []).map((d: any) => [d.id, profileMap.get(d.user_id) || td.systemDriver]));
    }

    setAlerts(
      rawAlerts.map((alert: any) => {
        const text = String(alert.message || alert.type || td.newAlert);
        const lower = text.toLowerCase();
        const isDanger = lower.includes("battery") || lower.includes("بطارية") || lower.includes("خطر") || lower.includes("emergency");
        const icon = lower.includes("battery") || lower.includes("بطارية") ? BatteryLow : lower.includes("delay") || lower.includes("تأخر") ? Clock : MapPin;
        return { id: alert.id, driver: driverNameMap.get(alert.driver_id) || td.systemDriver, alert: text, status: isDanger ? "danger" as const : "warning" as const, icon };
      })
    );
  }, [geoCountry, geoCity, td]);

  useEffect(() => {
    void fetchDashboardData();
    const interval = setInterval(() => void fetchDashboardData(), 10000);
    const channel = supabase.channel("dash-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_requests" }, fetchDashboardData)
      .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, fetchDashboardData)
      .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, fetchDashboardData)
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_orders" }, fetchDashboardData)
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, fetchDashboardData)
      .subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, [fetchDashboardData]);

  const dateLocale = locale === "ar" ? "ar-MA" : locale === "fr" ? "fr-FR" : locale === "es" ? "es-ES" : "en-US";

  const incomeChartData = useMemo(() => {
    if (incomeRange === "daily") {
      const today = new Date().toISOString().slice(0, 10);
      return [0, 4, 8, 12, 16, 20].map((hour) => ({
        label: `${hour}`.padStart(2, "0"),
        value: earningsEntries
          .filter((e: any) => e.date === today)
          .filter((e: any) => { const h = new Date(e.created_at || `${e.date}T00:00:00`).getHours(); return h >= hour && h < hour + 4; })
          .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0),
      }));
    }
    if (incomeRange === "weekly") {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        const key = d.toISOString().slice(0, 10);
        return { label: d.toLocaleDateString(dateLocale, { weekday: "short" }), value: earningsEntries.filter((e: any) => e.date === key).reduce((s: number, e: any) => s + Number(e.amount || 0), 0) };
      });
    }
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
      return {
        label: d.toLocaleDateString(dateLocale, { month: "short" }),
        value: earningsEntries.filter((e: any) => { const ed = new Date(e.date || e.created_at); return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth(); }).reduce((s: number, e: any) => s + Number(e.amount || 0), 0),
      };
    });
  }, [earningsEntries, incomeRange, dateLocale]);

  const statCards = [
    { icon: FileText, label: td.totalRequests, value: stats.requestsToday, color: "text-info", isCurrency: false },
    { icon: Car, label: td.activeDrivers, value: stats.activeDrivers, color: "text-primary", isCurrency: false },
    { icon: Zap, label: td.ongoingTrips, value: stats.ongoingRides, color: "text-success", isCurrency: false },
    { icon: Package, label: td.pendingDelivery, value: stats.deliveryPending, color: "text-accent", isCurrency: false },
    { icon: Package, label: td.activeDelivery, value: stats.deliveryActive, color: "text-info", isCurrency: false },
    { icon: DollarSign, label: td.todayEarnings, value: stats.incomeToday, color: "text-warning", isCurrency: true },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">{td.liveMap ? "📊" : "📊"} {t.admin.dashboard}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{new Date().toLocaleDateString(dateLocale, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <Badge variant="outline" className="text-success border-success/30 bg-success/10 gap-1.5 py-1.5 px-3">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          {nearbyDrivers.length} {td.connected || "online"}
        </Badge>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat, i) => (
          <StatCard key={i} icon={stat.icon} label={stat.label} value={stat.value} color={stat.color} isCurrency={stat.isCurrency} index={i} />
        ))}
      </div>

      {/* Map + Driver Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2 glass-card rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <Badge variant="outline" className="text-success border-success/30 bg-success/10">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse mr-1.5" />
              {nearbyDrivers.length} online
            </Badge>
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              {td.liveMap}
            </h3>
          </div>
          <div className="h-80">
            <LeafletMap zoom={11} showMarker={false} nearbyDrivers={nearbyDrivers.map((d) => ({ id: d.id, lat: d.lat, lng: d.lng }))} />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }} className="glass-card rounded-2xl p-6">
          <h3 className="font-bold text-foreground text-right mb-6 flex items-center justify-end gap-2">
            <Users className="w-4 h-4 text-primary" />
            {td.driverStatus}
          </h3>
          <div className="flex items-center justify-center gap-8">
            <DonutChart online={stats.activeDrivers} offline={stats.offlineDrivers} />
            <div className="space-y-4 text-right">
              <div className="p-3 rounded-xl bg-success/5 border border-success/10">
                <p className="text-2xl font-extrabold text-foreground">{stats.activeDrivers}</p>
                <p className="text-xs text-success font-medium">{td.connected}</p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                <p className="text-2xl font-extrabold text-foreground">{stats.offlineDrivers}</p>
                <p className="text-xs text-muted-foreground font-medium">{td.disconnected}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl">
              {(["daily", "weekly", "monthly"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setIncomeRange(range)}
                  className={`text-xs px-4 py-1.5 rounded-lg transition-all duration-200 font-medium ${incomeRange === range ? "gradient-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {range === "daily" ? td.daily : range === "weekly" ? td.weekly : td.monthly}
                </button>
              ))}
            </div>
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              {td.earningsAnalysis}
            </h3>
          </div>
          <BarChartPro data={incomeChartData} color="hsl(var(--primary))" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="glass-card rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <Badge variant="outline" className={alerts.length > 0 ? "text-warning border-warning/30 bg-warning/10" : "text-success border-success/30 bg-success/10"}>
              {alerts.length} {alerts.length > 0 ? "⚠" : "✓"}
            </Badge>
            <h3 className="font-bold text-foreground text-right">{td.alerts}</h3>
          </div>
          <div className="divide-y divide-border/50 max-h-80 overflow-auto">
            {alerts.length === 0 && (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-7 h-7 text-success" />
                </div>
                <p className="text-muted-foreground text-sm font-medium">{td.noActiveAlerts}</p>
              </div>
            )}
            {alerts.map((alert, i) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-3.5 flex items-center justify-between hover:bg-secondary/30 transition-colors"
              >
                <Badge variant="outline" className={alert.status === "danger" ? "text-destructive border-destructive/30 bg-destructive/5" : "text-warning border-warning/30 bg-warning/5"}>
                  {alert.status === "danger" ? `⚠ ${td.danger}` : `⚠ ${td.warning}`}
                </Badge>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <p className="text-sm text-foreground font-semibold">{alert.driver}</p>
                    <p className="text-xs text-muted-foreground">{alert.alert}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${alert.status === "danger" ? "bg-destructive/10" : "bg-warning/10"}`}>
                    <alert.icon className={`w-4 h-4 ${alert.status === "danger" ? "text-destructive" : "text-warning"}`} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Trips */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <button className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors">
            {t.common?.refresh || "View All"} <ArrowUpRight className="w-3 h-3" />
          </button>
          <h3 className="font-bold text-foreground text-right flex items-center gap-2">
            <Car className="w-4 h-4 text-primary" />
            {td.recentTrips}
          </h3>
        </div>
        <div className="divide-y divide-border/50 max-h-72 overflow-auto">
          {recentTrips.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                <Car className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">{td.noTrips}</p>
            </div>
          )}
          {recentTrips.map((trip, i) => (
            <motion.div
              key={trip.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="p-3.5 flex items-center justify-between text-right hover:bg-secondary/30 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${trip.status === "completed" ? "bg-success/10 text-success" : trip.status === "in_progress" ? "bg-info/10 text-info" : "bg-destructive/10 text-destructive"}`}>
                  {trip.status === "completed" ? td.completed : trip.status === "in_progress" ? td.inProgress : td.cancelled}
                </span>
                <span className="text-primary font-bold text-sm">{trip.fare || 0} {td.currency}</span>
              </div>
              <div>
                <p className="text-sm text-foreground font-medium truncate max-w-[280px] group-hover:text-primary transition-colors">{trip.start_location || "—"}</p>
                <p className="text-xs text-muted-foreground truncate max-w-[280px]">{trip.end_location || "—"}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboardPage;
