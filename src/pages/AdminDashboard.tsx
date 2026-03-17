import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Users, Car, DollarSign, TrendingUp, BarChart3, Bell,
  Search, Shield, Eye, Settings, Headphones, MapPin,
  AlertTriangle, CheckCircle, Clock, FileText, UserCheck,
  XCircle, ChevronDown, Activity, Zap, BatteryLow, Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import logo from "@/assets/hn-driver-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useNearbyDrivers } from "@/hooks/useNearbyDrivers";
import GoogleMapWrapper from "@/components/GoogleMap";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell
} from "recharts";

// ── Types ────────────────────────────────────────────────────
interface DashboardStats {
  requestsToday: number;
  activeDrivers: number;
  ongoingRides: number;
  incomeToday: number;
  totalDrivers: number;
  offlineDrivers: number;
}

interface RecentTrip {
  id: string;
  user_id: string;
  driver_id: string | null;
  start_location: string | null;
  end_location: string | null;
  fare: number | null;
  status: string;
  started_at: string | null;
  created_at: string;
}

interface RideRequest {
  id: string;
  pickup: string;
  destination: string;
  price: number | null;
  status: string;
  created_at: string;
  user_id: string;
}

// ── Component ────────────────────────────────────────────────
const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [incomeRange, setIncomeRange] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [stats, setStats] = useState<DashboardStats>({
    requestsToday: 0, activeDrivers: 0, ongoingRides: 0,
    incomeToday: 0, totalDrivers: 0, offlineDrivers: 0,
  });
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningRequest, setAssigningRequest] = useState<RideRequest | null>(null);
  const [availableDrivers, setAvailableDrivers] = useState<{ id: string; name: string; rating: number | null }[]>([]);
  const { drivers: nearbyDrivers } = useNearbyDrivers();

  // ── Action handlers ──
  const handleAcceptRequest = async (req: RideRequest) => {
    setProcessingId(req.id);
    try {
      // Find first available active driver
      const { data: drivers } = await supabase
        .from("drivers")
        .select("id, user_id, rating")
        .eq("status", "active")
        .limit(1) as any;

      if (!drivers || drivers.length === 0) {
        toast({ title: "لا يوجد سائقين متاحين", variant: "destructive" });
        return;
      }

      const driver = drivers[0];

      const { error: updateErr } = await supabase
        .from("ride_requests")
        .update({ status: "accepted" })
        .eq("id", req.id);
      if (updateErr) throw updateErr;

      const { error: tripErr } = await supabase.from("trips").insert({
        user_id: req.user_id,
        driver_id: driver.id,
        start_location: req.pickup,
        end_location: req.destination,
        fare: req.price || 0,
        status: "in_progress",
      });
      if (tripErr) throw tripErr;

      toast({ title: "تم قبول الطلب وتعيين سائق بنجاح" });
      setRideRequests(prev => prev.filter(r => r.id !== req.id));
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelRequest = async (req: RideRequest) => {
    setProcessingId(req.id);
    try {
      const { error } = await supabase
        .from("ride_requests")
        .update({ status: "rejected" })
        .eq("id", req.id);
      if (error) throw error;
      toast({ title: "تم إلغاء الطلب" });
      setRideRequests(prev => prev.filter(r => r.id !== req.id));
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenAssignDialog = async (req: RideRequest) => {
    setAssigningRequest(req);
    setAssignDialogOpen(true);
    // Fetch active drivers with names
    const { data: driversData } = await supabase
      .from("drivers")
      .select("id, user_id, rating")
      .eq("status", "active") as any;

    if (driversData && driversData.length > 0) {
      const userIds = driversData.map((d: any) => d.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", userIds);
      const nameMap = new Map(profiles?.map(p => [p.id, p.name]) || []);
      setAvailableDrivers(
        driversData.map((d: any) => ({
          id: d.id,
          name: nameMap.get(d.user_id) || "سائق",
          rating: d.rating,
        }))
      );
    } else {
      setAvailableDrivers([]);
    }
  };

  const handleAssignDriver = async (driverId: string) => {
    if (!assigningRequest) return;
    setProcessingId(assigningRequest.id);
    try {
      const { error: updateErr } = await supabase
        .from("ride_requests")
        .update({ status: "accepted" })
        .eq("id", assigningRequest.id);
      if (updateErr) throw updateErr;

      const { error: tripErr } = await supabase.from("trips").insert({
        user_id: assigningRequest.user_id,
        driver_id: driverId,
        start_location: assigningRequest.pickup,
        end_location: assigningRequest.destination,
        fare: assigningRequest.price || 0,
        status: "in_progress",
      });
      if (tripErr) throw tripErr;

      toast({ title: "تم تعيين السائق بنجاح" });
      setRideRequests(prev => prev.filter(r => r.id !== assigningRequest.id));
      setAssignDialogOpen(false);
      setAssigningRequest(null);
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  // ── Fetch dashboard data ──
  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date().toISOString().slice(0, 10);

      const [reqRes, activeRes, totalRes, ridesRes, incomeRes] = await Promise.all([
        supabase.from("ride_requests").select("id", { count: "exact", head: true }).gte("created_at", today),
        supabase.from("drivers").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("drivers").select("id", { count: "exact", head: true }),
        supabase.from("trips").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
        supabase.from("earnings").select("amount").gte("date", today),
      ]);

      const totalIncome = (incomeRes.data || []).reduce((s, e) => s + Number(e.amount), 0);
      const active = activeRes.count || 0;
      const total = totalRes.count || 0;

      setStats({
        requestsToday: reqRes.count || 0,
        activeDrivers: active,
        ongoingRides: ridesRes.count || 0,
        incomeToday: totalIncome,
        totalDrivers: total,
        offlineDrivers: total - active,
      });
    };

    const fetchTrips = async () => {
      const { data } = await supabase
        .from("trips")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (data) setRecentTrips(data);
    };

    const fetchRequests = async () => {
      const { data } = await supabase
        .from("ride_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) setRideRequests(data);
    };

    fetchStats();
    fetchTrips();
    fetchRequests();

    // Realtime
    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_requests" }, () => { fetchRequests(); fetchStats(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, () => { fetchTrips(); fetchStats(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, () => fetchStats())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Chart data ──
  const rideChartData = useMemo(() => [
    { name: "اليوم", rides: stats.requestsToday },
    { name: "أمس", rides: Math.floor(stats.requestsToday * 0.85) },
    { name: "قبل يومين", rides: Math.floor(stats.requestsToday * 1.1) },
  ], [stats.requestsToday]);

  const incomeChartData = useMemo(() => {
    const days = ["سبت", "أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة"];
    return days.map(d => ({ name: d, income: Math.floor(Math.random() * 1500 + 500), expenses: Math.floor(Math.random() * 400 + 100) }));
  }, [incomeRange]);

  const driverStatusData = useMemo(() => [
    { name: "متصل", value: stats.activeDrivers, color: "hsl(145, 63%, 42%)" },
    { name: "غير متصل", value: stats.offlineDrivers, color: "hsl(220, 10%, 35%)" },
  ], [stats.activeDrivers, stats.offlineDrivers]);

  const onlinePercent = stats.totalDrivers > 0
    ? Math.round((stats.activeDrivers / stats.totalDrivers) * 100) : 0;

  const alerts = [
    { driver: "محمد السعيد", alert: "بعيد عن نقطة الاستلام", status: "completed", icon: MapPin },
    { driver: "أحمد الحربي", alert: "بطارية الهاتف ضعيفة", status: "warning", icon: BatteryLow },
    { driver: "خالد العمري", alert: "تأخر في الوصول", status: "warning", icon: Clock },
  ];

  const sidebar = [
    { id: "dashboard", icon: BarChart3, label: "لوحة التحكم" },
    { id: "requests", icon: FileText, label: "الطلبات", badge: rideRequests.length },
    { id: "drivers", icon: Car, label: "السائقين", badge: stats.activeDrivers },
    { id: "users", icon: Users, label: "العملاء" },
    { id: "analytics", icon: TrendingUp, label: "التحليلات" },
    { id: "map", icon: MapPin, label: "الخريطة" },
    { id: "settings", icon: Settings, label: "الإعدادات" },
  ];

  return (
    <div className="min-h-screen gradient-dark flex" dir="rtl">
      {/* ── Sidebar ── */}
      <aside className="w-64 glass-strong border-l border-border hidden lg:flex flex-col">
        <div className="p-4 flex items-center gap-3 border-b border-border">
          <img src={logo} alt="HN" className="w-9 h-9" />
          <span className="font-bold text-lg text-gradient-primary font-display">Admin Dashboard</span>
        </div>

        {/* Admin profile */}
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">المسؤول</p>
            <p className="text-xs text-muted-foreground">Administrator</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {sidebar.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
                activeSection === item.id
                  ? "gradient-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
              </div>
              {item.badge ? (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activeSection === item.id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/20 text-primary"
                }`}>{item.badge}</span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <DollarSign className="w-5 h-5" />
            <span className="text-sm">المالية</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <Settings className="w-5 h-5" />
            <span className="text-sm">الإعدادات</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-auto">
        {/* Top Bar */}
        <header className="glass-strong border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="بحث..." className="bg-secondary/60 border-border h-9 rounded-lg pr-9 text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 relative hover:bg-secondary rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive animate-pulse" />
            </button>
            <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <MapPin className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <Activity className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* ━━ 1. Quick Stats ━━ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: FileText, label: "طلبات اليوم", value: stats.requestsToday, color: "text-info", glow: "glow-ring-blue", prefix: "" },
              { icon: Car, label: "سائقين نشطين", value: stats.activeDrivers, color: "text-primary", glow: "glow-ring-orange", prefix: "" },
              { icon: Zap, label: "رحلات جارية", value: stats.ongoingRides, color: "text-success", glow: "", prefix: "" },
              { icon: DollarSign, label: "الأرباح اليوم", value: stats.incomeToday, color: "text-warning", glow: "glow-ring-orange", prefix: "ر.س " },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="gradient-card rounded-xl p-5 border border-border hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-secondary ${stat.glow}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground">{stat.prefix}{stat.value.toLocaleString("ar-SA")}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* ━━ Row 2: Ride Requests Chart + Driver Status + Live Map ━━ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Ride Requests Chart */}
            <div className="gradient-card rounded-xl border border-border p-5">
              <h3 className="font-bold text-foreground mb-4">طلبات الرحلات</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={rideChartData}>
                    <defs>
                      <linearGradient id="rideGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(205, 78%, 56%)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(205, 78%, 56%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                    <XAxis dataKey="name" stroke="hsl(220, 10%, 45%)" fontSize={12} />
                    <YAxis stroke="hsl(220, 10%, 45%)" fontSize={12} />
                    <Tooltip contentStyle={{ background: "hsl(220, 18%, 11%)", border: "1px solid hsl(220, 15%, 20%)", borderRadius: 8, color: "#fff" }} />
                    <Area type="monotone" dataKey="rides" stroke="hsl(205, 78%, 56%)" fill="url(#rideGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Driver Status Donut */}
            <div className="gradient-card rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-foreground">حالة السائقين</h3>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-6">
                <div className="relative w-36 h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={driverStatusData}
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                      >
                        {driverStatusData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs text-muted-foreground">متصل</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{onlinePercent}%</p>
                    <p className="text-xs text-success">متصل Online</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{100 - onlinePercent}%</p>
                    <p className="text-xs text-muted-foreground">غير متصل Offline</p>
                  </div>
                  <div className="pt-2 border-t border-border space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-muted-foreground">الإجمالي</span>
                      <span className="text-foreground font-semibold">{stats.totalDrivers}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full" style={{ background: "hsl(220, 10%, 35%)" }} />
                      <span className="text-muted-foreground">غير متصل</span>
                      <span className="text-foreground font-semibold">{stats.offlineDrivers}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Map */}
            <div className="gradient-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-bold text-foreground">الرحلات الجارية</h3>
                <XCircle className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground" />
              </div>
              <div className="h-56">
                <GoogleMapWrapper
                  zoom={11}
                  showMarker={false}
                  nearbyDrivers={nearbyDrivers.map(d => ({ id: d.id, lat: d.lat, lng: d.lng }))}
                />
              </div>
              <div className="p-3 max-h-32 overflow-auto space-y-2">
                {recentTrips.filter(t => t.status === "in_progress").slice(0, 3).map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-secondary/50">
                    <Badge variant="outline" className="text-primary border-primary/30">عرض</Badge>
                    <span className="text-muted-foreground">{t.start_location?.slice(0, 20) || "غير محدد"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ━━ Row 3: Income Analysis ━━ */}
          <div className="gradient-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">تحليل الأرباح</h3>
              <div className="flex gap-2">
                {(["daily", "weekly", "monthly"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setIncomeRange(r)}
                    className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                      incomeRange === r ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r === "daily" ? "يومي" : r === "weekly" ? "أسبوعي" : "شهري"}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeChartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                  <XAxis dataKey="name" stroke="hsl(220, 10%, 45%)" fontSize={12} />
                  <YAxis stroke="hsl(220, 10%, 45%)" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(220, 18%, 11%)", border: "1px solid hsl(220, 15%, 20%)", borderRadius: 8, color: "#fff" }} />
                  <Bar dataKey="income" fill="hsl(205, 78%, 56%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="hsl(32, 95%, 55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ━━ Row 4: Ride Requests + Recent Trips ━━ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Ride Requests */}
            <div className="gradient-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-bold text-foreground">طلبات جديدة</h3>
                <Badge variant="outline" className="text-info border-info/30">{rideRequests.length} طلب</Badge>
              </div>
              <div className="divide-y divide-border/50 max-h-72 overflow-auto">
                {rideRequests.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground text-sm">لا توجد طلبات حالياً</div>
                )}
                {rideRequests.map((req) => (
                  <div key={req.id} className="p-4 hover:bg-secondary/30 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={processingId === req.id} onClick={() => handleAcceptRequest(req)} className="text-xs h-7 text-success border-success/30 hover:bg-success/10">
                          {processingId === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><UserCheck className="w-3 h-3 ml-1" /> قبول</>}
                        </Button>
                        <Button size="sm" variant="outline" disabled={processingId === req.id} onClick={() => handleOpenAssignDialog(req)} className="text-xs h-7 text-info border-info/30 hover:bg-info/10">
                          <Car className="w-3 h-3 ml-1" /> تعيين
                        </Button>
                        <Button size="sm" variant="outline" disabled={processingId === req.id} onClick={() => handleCancelRequest(req)} className="text-xs h-7 text-destructive border-destructive/30 hover:bg-destructive/10">
                          <XCircle className="w-3 h-3 ml-1" /> إلغاء
                        </Button>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-foreground font-medium">{req.pickup || "—"}</p>
                        <p className="text-xs text-muted-foreground">{req.destination || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="text-primary font-semibold">{req.price || 0} ر.س</span>
                      <span>{new Date(req.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Trips */}
            <div className="gradient-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-bold text-foreground">آخر الرحلات</h3>
              </div>
              <div className="divide-y divide-border/50 max-h-72 overflow-auto">
                {recentTrips.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground text-sm">لا توجد رحلات</div>
                )}
                {recentTrips.map((trip) => (
                  <div key={trip.id} className="p-4 hover:bg-secondary/30 transition-colors flex items-center justify-between">
                    <Badge variant="outline" className="text-primary border-primary/30">عرض</Badge>
                    <div className="flex-1 mx-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {trip.started_at ? new Date(trip.started_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          trip.status === "completed" ? "bg-success/10 text-success" :
                          trip.status === "in_progress" ? "bg-info/10 text-info" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {trip.status === "completed" ? "مكتمل" : trip.status === "in_progress" ? "جارية" : trip.status}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{trip.start_location?.slice(0, 25) || "غير محدد"}</p>
                      <p className="text-xs text-muted-foreground">{trip.fare ? `${trip.fare} ر.س` : "—"}</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                      <Car className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ━━ Row 5: Driver Alerts ━━ */}
          <div className="gradient-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-bold text-foreground">تنبيهات السائقين</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-right">
                    <th className="p-3 text-xs text-muted-foreground font-medium">الحالة</th>
                    <th className="p-3 text-xs text-muted-foreground font-medium">التنبيه</th>
                    <th className="p-3 text-xs text-muted-foreground font-medium">السائق</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="p-3">
                        <Badge variant="outline" className={
                          a.status === "completed" ? "text-success border-success/30" : "text-destructive border-destructive/30"
                        }>
                          {a.status === "completed" ? "مكتمل" : "تحذير"}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-foreground">{a.alert}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                            <a.icon className="w-4 h-4 text-warning" />
                          </div>
                          <span className="text-sm text-foreground font-medium">{a.driver}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Assign Driver Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="gradient-card border-border" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-foreground">تعيين سائق للطلب</DialogTitle>
          </DialogHeader>
          {assigningRequest && (
            <div className="mb-4 p-3 rounded-lg bg-secondary/50 text-sm">
              <p className="text-foreground font-medium">{assigningRequest.pickup}</p>
              <p className="text-muted-foreground text-xs">← {assigningRequest.destination}</p>
              <p className="text-primary font-semibold mt-1">{assigningRequest.price || 0} ر.س</p>
            </div>
          )}
          {availableDrivers.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">لا يوجد سائقين متاحين حالياً</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-auto">
              {availableDrivers.map((d) => (
                <button
                  key={d.id}
                  disabled={processingId !== null}
                  onClick={() => handleAssignDriver(d.id)}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <Button size="sm" variant="outline" className="text-xs text-primary border-primary/30">
                    {processingId ? <Loader2 className="w-3 h-3 animate-spin" /> : "تعيين"}
                  </Button>
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm text-foreground font-medium">{d.name}</p>
                      <p className="text-xs text-warning">★ {d.rating || "—"}</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                      <Car className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
