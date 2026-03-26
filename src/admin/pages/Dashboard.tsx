import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { FileText, Car, DollarSign, Zap, MapPin, Clock, BatteryLow, Package } from "lucide-react";
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
  const r = 52;
  const c = 2 * Math.PI * r;
  const onS = (pct / 100) * c;

  return (
    <svg width="130" height="130" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="hsl(var(--secondary))" strokeWidth="14" />
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="14"
        strokeDasharray={`${onS} ${c - onS}`}
        strokeDashoffset={c / 4}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text x="70" y="64" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="11" fontWeight="600">
        Online
      </text>
      <text x="70" y="82" textAnchor="middle" fill="hsl(var(--primary))" fontSize="13" fontWeight="700">
        {Math.round(pct)}%
      </text>
    </svg>
  );
};

const SimpleBarChart = ({ data, color }: { data: { label: string; value: number }[]; color: string }) => {
  const max = Math.max(...data.map((d) => d.value), 1);
  const bw = 28;
  const gap = 8;
  const h = 150;
  const cw = data.length * (bw + gap);

  return (
    <svg width="100%" height={h + 30} viewBox={`0 0 ${cw + 20} ${h + 30}`} className="w-full">
      {data.map((d, i) => {
        const bh = (d.value / max) * h;
        const x = 10 + i * (bw + gap);
        return (
          <g key={i}>
            <rect x={x} y={h - bh} width={bw} height={bh} rx={4} fill={color} opacity={0.85} style={{ transition: "all 0.5s ease" }} />
            <text x={x + bw / 2} y={h + 16} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="9">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const AdminDashboardPage = () => {
  const { t, locale } = useI18n();
  const td = t.dashboardPage;
  const geoCtx = useAdminGeo();
  const geoCountry = geoCtx?.selectedCountry || "all";
  const geoCity = geoCtx?.selectedCity || "all";
  const [stats, setStats] = useState<DashboardStats>({
    requestsToday: 0,
    activeDrivers: 0,
    ongoingRides: 0,
    incomeToday: 0,
    totalDrivers: 0,
    offlineDrivers: 0,
    deliveryPending: 0,
    deliveryActive: 0,
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

    const [requestsRes, driversRes, activeTripsRes, recentTripsRes, earningsRes, deliveryOrdersRes, alertsRes] = await Promise.all([
      requestsQuery,
      supabase.from("drivers").select("id, user_id, status"),
      supabase.from("trips").select("id").eq("status", "in_progress"),
      supabase.from("trips").select("*").order("created_at", { ascending: false }).limit(8),
      supabase.from("earnings").select("amount, date, created_at, driver_id").gte("date", sixMonthsAgo),
      deliveryQuery,
      supabase.from("alerts").select("*").order("created_at", { ascending: false }).limit(5),
    ]);

    const drivers = driversRes.data || [];
    const earnings = earningsRes.data || [];
    const deliveryOrders = deliveryOrdersRes.data || [];
    const activeDrivers = drivers.filter((driver: any) => driver.status === "active").length;
    const totalIncome = earnings
      .filter((entry: any) => entry.date === today)
      .reduce((sum: number, entry: any) => sum + Number(entry.amount || 0), 0);

    const activeDeliveryStatuses = new Set(["accepted", "picked_up", "delivering", "in_transit", "confirmed", "arrived", "arrived_restaurant"]);

    setStats({
      requestsToday: requestsRes.data?.length || 0,
      activeDrivers,
      ongoingRides: activeTripsRes.data?.length || 0,
      incomeToday: totalIncome,
      totalDrivers: drivers.length,
      offlineDrivers: Math.max(drivers.length - activeDrivers, 0),
      deliveryPending: deliveryOrders.filter((order: any) => order.status === "pending").length,
      deliveryActive: deliveryOrders.filter((order: any) => activeDeliveryStatuses.has(order.status)).length,
    });

    setRecentTrips(recentTripsRes.data || []);
    setEarningsEntries(earnings);

    const rawAlerts = alertsRes.data || [];
    const driverIds = [...new Set(rawAlerts.map((alert: any) => alert.driver_id).filter(Boolean))];

    let driverNameMap = new Map<string, string>();
    if (driverIds.length > 0) {
      const { data: driverRows } = await supabase.from("drivers").select("id, user_id").in("id", driverIds);
      const driverUserIds = [...new Set((driverRows || []).map((driver: any) => driver.user_id).filter(Boolean))];
      const { data: profiles } = driverUserIds.length > 0 ? await supabase.from("profiles").select("id, name").in("id", driverUserIds) : { data: [] as any[] };

      const profileMap = new Map((profiles || []).map((profile: any) => [profile.id, profile.name]));
      driverNameMap = new Map((driverRows || []).map((driver: any) => [driver.id, profileMap.get(driver.user_id) || td.systemDriver]));
    }

    setAlerts(
      rawAlerts.map((alert: any) => {
        const text = String(alert.message || alert.type || td.newAlert);
        const lower = text.toLowerCase();
        const isDanger = lower.includes("battery") || lower.includes("بطارية") || lower.includes("خطر") || lower.includes("emergency");
        const icon = lower.includes("battery") || lower.includes("بطارية") ? BatteryLow : lower.includes("delay") || lower.includes("تأخر") ? Clock : MapPin;

        return {
          id: alert.id,
          driver: driverNameMap.get(alert.driver_id) || td.systemDriver,
          alert: text,
          status: isDanger ? "danger" : "warning",
          icon,
        };
      })
    );
  }, [geoCountry, geoCity, td]);

  useEffect(() => {
    void fetchDashboardData();
    const interval = setInterval(() => {
      void fetchDashboardData();
    }, 10000);

    const channel = supabase
      .channel("dash-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_requests" }, fetchDashboardData)
      .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, fetchDashboardData)
      .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, fetchDashboardData)
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_orders" }, fetchDashboardData)
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, fetchDashboardData)
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchDashboardData]);

  const dateLocale = locale === "ar" ? "ar-MA" : locale === "fr" ? "fr-FR" : locale === "es" ? "es-ES" : "en-US";

  const incomeChartData = useMemo(() => {
    if (incomeRange === "daily") {
      const today = new Date().toISOString().slice(0, 10);
      const slots = [0, 4, 8, 12, 16, 20];

      return slots.map((hour) => {
        const total = earningsEntries
          .filter((entry: any) => entry.date === today)
          .filter((entry: any) => {
            const stamp = new Date(entry.created_at || `${entry.date}T00:00:00`);
            return stamp.getHours() >= hour && stamp.getHours() < hour + 4;
          })
          .reduce((sum: number, entry: any) => sum + Number(entry.amount || 0), 0);

        return { label: `${hour}`.padStart(2, "0"), value: total };
      });
    }

    if (incomeRange === "weekly") {
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));
        const key = date.toISOString().slice(0, 10);
        const total = earningsEntries
          .filter((entry: any) => entry.date === key)
          .reduce((sum: number, entry: any) => sum + Number(entry.amount || 0), 0);

        return {
          label: date.toLocaleDateString(dateLocale, { weekday: "short" }),
          value: total,
        };
      });
    }

    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      const year = date.getFullYear();
      const month = date.getMonth();
      const total = earningsEntries
        .filter((entry: any) => {
          const entryDate = new Date(entry.date || entry.created_at);
          return entryDate.getFullYear() === year && entryDate.getMonth() === month;
        })
        .reduce((sum: number, entry: any) => sum + Number(entry.amount || 0), 0);

      return {
        label: date.toLocaleDateString(dateLocale, { month: "short" }),
        value: total,
      };
    });
  }, [earningsEntries, incomeRange, dateLocale]);

  const onlinePercent = stats.totalDrivers > 0 ? Math.round((stats.activeDrivers / stats.totalDrivers) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { icon: FileText, label: td.totalRequests, value: stats.requestsToday, color: "text-info", glow: "glow-ring-blue", isCurrency: false },
          { icon: Car, label: td.activeDrivers, value: stats.activeDrivers, color: "text-primary", glow: "glow-ring-orange", isCurrency: false },
          { icon: Zap, label: td.ongoingTrips, value: stats.ongoingRides, color: "text-success", glow: "", isCurrency: false },
          { icon: Package, label: td.pendingDelivery, value: stats.deliveryPending, color: "text-accent", glow: "", isCurrency: false },
          { icon: Package, label: td.activeDelivery, value: stats.deliveryActive, color: "text-info", glow: "glow-ring-blue", isCurrency: false },
          { icon: DollarSign, label: td.todayEarnings, value: stats.incomeToday, color: "text-warning", glow: "glow-ring-orange", isCurrency: true },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="gradient-card rounded-xl p-5 border border-border hover:border-primary/30 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-secondary ${stat.glow}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {stat.value.toLocaleString()} {stat.isCurrency ? td.currency : ""}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 gradient-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <Badge variant="outline" className="text-success border-success/30">
              {nearbyDrivers.length} online
            </Badge>
            <h3 className="font-bold text-foreground">{td.liveMap}</h3>
          </div>
          <div className="h-72">
            <LeafletMap zoom={11} showMarker={false} nearbyDrivers={nearbyDrivers.map((driver) => ({ id: driver.id, lat: driver.lat, lng: driver.lng }))} />
          </div>
        </div>

        <div className="gradient-card rounded-xl border border-border p-5">
          <h3 className="font-bold text-foreground text-right mb-4">{td.driverStatus}</h3>
          <div className="flex items-center justify-center gap-6">
            <DonutChart online={stats.activeDrivers} offline={stats.offlineDrivers} />
            <div className="space-y-3 text-right">
              <div>
                <p className="text-2xl font-bold text-foreground">{onlinePercent}%</p>
                <p className="text-xs text-success">{td.connected} · {stats.activeDrivers}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{100 - onlinePercent}%</p>
                <p className="text-xs text-muted-foreground">{td.disconnected} · {stats.offlineDrivers}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="gradient-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1">
              {(["daily", "weekly", "monthly"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setIncomeRange(range)}
                  className={`text-xs px-3 py-1 rounded-lg transition-colors ${incomeRange === range ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                >
                  {range === "daily" ? td.daily : range === "weekly" ? td.weekly : td.monthly}
                </button>
              ))}
            </div>
            <h3 className="font-bold text-foreground">{td.earningsAnalysis}</h3>
          </div>
          <SimpleBarChart data={incomeChartData} color="hsl(var(--primary))" />
        </div>

        <div className="gradient-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-bold text-foreground text-right">{td.alerts}</h3>
          </div>
          <div className="divide-y divide-border/50">
            {alerts.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">{td.noActiveAlerts}</div>}
            {alerts.map((alert) => (
              <div key={alert.id} className="p-3 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                <Badge variant="outline" className={alert.status === "danger" ? "text-destructive border-destructive/30" : "text-warning border-warning/30"}>
                  {alert.status === "danger" ? `⚠ ${td.danger}` : `⚠ ${td.warning}`}
                </Badge>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <p className="text-sm text-foreground font-medium">{alert.driver}</p>
                    <p className="text-xs text-muted-foreground">{alert.alert}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <alert.icon className={`w-4 h-4 ${alert.status === "danger" ? "text-destructive" : "text-warning"}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="gradient-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-bold text-foreground text-right">{td.recentTrips}</h3>
        </div>
        <div className="divide-y divide-border/50 max-h-72 overflow-auto">
          {recentTrips.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">{td.noTrips}</div>}
          {recentTrips.map((trip) => (
            <div key={trip.id} className="p-3 flex items-center justify-between text-right hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${trip.status === "completed" ? "bg-success/10 text-success" : trip.status === "in_progress" ? "bg-info/10 text-info" : "bg-destructive/10 text-destructive"}`}>
                  {trip.status === "completed" ? td.completed : trip.status === "in_progress" ? td.inProgress : td.cancelled}
                </span>
                <span className="text-primary font-semibold text-sm">{trip.fare || 0} {td.currency}</span>
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