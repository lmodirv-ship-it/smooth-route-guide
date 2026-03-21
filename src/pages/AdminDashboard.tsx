import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Car, DollarSign, TrendingUp, BarChart3, Bell,
  Search, Shield, Settings, MapPin,
  AlertTriangle, Clock, FileText, UserCheck,
  XCircle, ChevronDown, Activity, Zap, BatteryLow, Loader2,
  Bot, Send, MessageSquare, X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import logo from "@/assets/hn-driver-logo.png";
import { supabase } from "@/lib/firestoreClient";
import { auth } from "@/lib/firebase";
import { sanitizePlainText } from "@/lib/inputSecurity";
import { useNearbyDrivers } from "@/hooks/useNearbyDrivers";
import LeafletMap from "@/components/LeafletMap";

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

type AiMsg = { role: "user" | "assistant"; content: string };

// ── Donut SVG Component (no recharts needed) ──
const DonutChart = ({ online, offline }: { online: number; offline: number }) => {
  const total = online + offline;
  const pct = total > 0 ? (online / total) * 100 : 0;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const onlineStroke = (pct / 100) * circumference;
  const offlineStroke = circumference - onlineStroke;

  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={radius} fill="none" stroke="hsl(220, 10%, 20%)" strokeWidth="14" />
      <circle
        cx="70" cy="70" r={radius} fill="none"
        stroke="hsl(145, 63%, 42%)" strokeWidth="14"
        strokeDasharray={`${onlineStroke} ${offlineStroke}`}
        strokeDashoffset={circumference / 4}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text x="70" y="64" textAnchor="middle" fill="hsl(40, 20%, 95%)" fontSize="11" fontWeight="600">Online</text>
      <text x="70" y="82" textAnchor="middle" fill="hsl(145, 63%, 42%)" fontSize="13" fontWeight="700">{Math.round(pct)}%</text>
    </svg>
  );
};

// ── Simple Bar Chart SVG ──
const SimpleBarChart = ({ data, color }: { data: { label: string; value: number }[]; color: string }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  const barWidth = 28;
  const gap = 8;
  const height = 160;
  const chartWidth = data.length * (barWidth + gap);

  return (
    <svg width="100%" height={height + 30} viewBox={`0 0 ${chartWidth + 20} ${height + 30}`} className="w-full">
      {data.map((d, i) => {
        const barHeight = (d.value / max) * height;
        const x = 10 + i * (barWidth + gap);
        return (
          <g key={i}>
            <rect
              x={x} y={height - barHeight} width={barWidth} height={barHeight}
              rx={4} fill={color} opacity={0.85}
              style={{ transition: "height 0.5s ease, y 0.5s ease" }}
            />
            <text x={x + barWidth / 2} y={height + 16} textAnchor="middle" fill="hsl(220, 10%, 45%)" fontSize="9">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
};

// ── Area Chart SVG ──
const SimpleAreaChart = ({ data, color }: { data: { label: string; value: number }[]; color: string }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  const height = 160;
  const width = 300;
  const stepX = width / Math.max(data.length - 1, 1);

  const points = data.map((d, i) => ({
    x: i * stepX,
    y: height - (d.value / max) * height,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L ${points[points.length - 1]?.x || 0} ${height} L 0 ${height} Z`;

  return (
    <svg width="100%" height={height + 25} viewBox={`-10 -5 ${width + 20} ${height + 30}`} className="w-full">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#areaFill)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
      ))}
      {data.map((d, i) => (
        <text key={i} x={i * stepX} y={height + 18} textAnchor="middle" fill="hsl(220, 10%, 45%)" fontSize="9">{d.label}</text>
      ))}
    </svg>
  );
};

// ── AI Chat Streaming ──
const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-agent`;

async function streamAdminAI({ messages, onDelta, onDone, onError }: {
  messages: AiMsg[]; onDelta: (t: string) => void; onDone: () => void; onError: (e: string) => void;
}) {
  const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  const resp = await fetch(AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({ messages }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "خطأ" }));
    onError(err.error || "خطأ في الخدمة");
    return;
  }
  if (!resp.body) { onError("لا توجد استجابة"); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch { buffer = line + "\n" + buffer; break; }
    }
  }
  onDone();
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
  const [tripDetailId, setTripDetailId] = useState<string | null>(null);
  const [driverListOpen, setDriverListOpen] = useState(false);
  const [allDriversList, setAllDriversList] = useState<{ id: string; name: string; status: string; rating: number | null }[]>([]);
  const { drivers: nearbyDrivers } = useNearbyDrivers();

  // AI Agent state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<AiMsg[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    aiScrollRef.current?.scrollTo({ top: aiScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [aiMessages]);

  // ── Action handlers ──
  const handleAcceptRequest = async (req: RideRequest) => {
    setProcessingId(req.id);
    try {
      const { data: drivers } = await supabase
        .from("drivers").select("id, user_id, rating").eq("status", "active").limit(1) as any;
      if (!drivers?.length) { toast({ title: "لا يوجد سائقين متاحين", variant: "destructive" }); return; }
      const driver = drivers[0];
      const { error: u } = await supabase.from("ride_requests").update({ status: "accepted" }).eq("id", req.id);
      if (u) throw u;
      const { error: t } = await supabase.from("trips").insert({
        user_id: req.user_id, driver_id: driver.id, start_location: req.pickup,
        end_location: req.destination, fare: req.price || 0, status: "in_progress",
      });
      if (t) throw t;
      toast({ title: "تم قبول الطلب وتعيين سائق" });
      setRideRequests(prev => prev.filter(r => r.id !== req.id));
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally { setProcessingId(null); }
  };

  const handleCancelRequest = async (req: RideRequest) => {
    setProcessingId(req.id);
    try {
      const { error } = await supabase.from("ride_requests").update({ status: "rejected" }).eq("id", req.id);
      if (error) throw error;
      toast({ title: "تم إلغاء الطلب" });
      setRideRequests(prev => prev.filter(r => r.id !== req.id));
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally { setProcessingId(null); }
  };

  const handleOpenAssignDialog = async (req: RideRequest) => {
    setAssigningRequest(req);
    setAssignDialogOpen(true);
    const { data: driversData } = await supabase.from("drivers").select("id, user_id, rating").eq("status", "active") as any;
    if (driversData?.length) {
      const userIds = driversData.map((d: any) => d.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", userIds);
      const nameMap = new Map(profiles?.map(p => [p.id, p.name]) || []);
      setAvailableDrivers(driversData.map((d: any) => ({ id: d.id, name: nameMap.get(d.user_id) || "سائق", rating: d.rating })));
    } else { setAvailableDrivers([]); }
  };

  const handleAssignDriver = async (driverId: string) => {
    if (!assigningRequest) return;
    setProcessingId(assigningRequest.id);
    try {
      await supabase.from("ride_requests").update({ status: "accepted" }).eq("id", assigningRequest.id);
      await supabase.from("trips").insert({
        user_id: assigningRequest.user_id, driver_id: driverId,
        start_location: assigningRequest.pickup, end_location: assigningRequest.destination,
        fare: assigningRequest.price || 0, status: "in_progress",
      });
      toast({ title: "تم تعيين السائق بنجاح" });
      setRideRequests(prev => prev.filter(r => r.id !== assigningRequest.id));
      setAssignDialogOpen(false);
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally { setProcessingId(null); }
  };

  const handleOpenDriverList = async () => {
    setDriverListOpen(true);
    const { data } = await supabase.from("drivers").select("id, user_id, rating, status") as any;
    if (data?.length) {
      const uids = data.map((d: any) => d.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", uids);
      const nameMap = new Map(profiles?.map(p => [p.id, p.name]) || []);
      setAllDriversList(data.map((d: any) => ({ id: d.id, name: nameMap.get(d.user_id) || "سائق", status: d.status, rating: d.rating })));
    }
  };

  // ── Fetch data ──
  const fetchStats = useCallback(async () => {
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
    setStats({ requestsToday: reqRes.count || 0, activeDrivers: active, ongoingRides: ridesRes.count || 0, incomeToday: totalIncome, totalDrivers: total, offlineDrivers: total - active });
  }, []);

  const fetchTrips = useCallback(async () => {
    const { data } = await supabase.from("trips").select("*").order("created_at", { ascending: false }).limit(8);
    if (data) setRecentTrips(data);
  }, []);

  const fetchRequests = useCallback(async () => {
    const { data } = await supabase.from("ride_requests").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(10);
    if (data) setRideRequests(data);
  }, []);

  useEffect(() => {
    fetchStats(); fetchTrips(); fetchRequests();
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => { fetchStats(); fetchTrips(); fetchRequests(); }, 5000);
    // Realtime
    const channel = supabase.channel("admin-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_requests" }, () => { fetchRequests(); fetchStats(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, () => { fetchTrips(); fetchStats(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, () => fetchStats())
      .subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, [fetchStats, fetchTrips, fetchRequests]);

  // ── Chart data ──
  const rideChartData = useMemo(() => [
    { label: "اليوم", value: stats.requestsToday },
    { label: "أمس", value: Math.max(1, Math.floor(stats.requestsToday * 0.85)) },
    { label: "قبل ٢", value: Math.max(1, Math.floor(stats.requestsToday * 1.1)) },
  ], [stats.requestsToday]);

  const incomeChartData = useMemo(() => {
    const labels = incomeRange === "daily"
      ? ["٦ص", "٩ص", "١٢", "٣م", "٦م", "٩م"]
      : incomeRange === "weekly"
      ? ["سبت", "أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة"]
      : ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو"];
    return labels.map(l => ({ label: l, value: Math.floor(Math.random() * 1500 + 300) }));
  }, [incomeRange]);

  const onlinePercent = stats.totalDrivers > 0 ? Math.round((stats.activeDrivers / stats.totalDrivers) * 100) : 0;

  const alerts = [
    { driver: "محمد السعيد", alert: "بعيد عن نقطة الاستلام", status: "completed" as const, icon: MapPin },
    { driver: "أحمد الحربي", alert: "بطارية الهاتف ضعيفة", status: "warning" as const, icon: BatteryLow },
    { driver: "خالد العمري", alert: "تأخر في الوصول", status: "warning" as const, icon: Clock },
  ];

  const sidebar = [
    { id: "dashboard", icon: BarChart3, label: "Dashboard" },
    { id: "requests", icon: FileText, label: "Ride Requests", badge: rideRequests.length },
    { id: "drivers", icon: Car, label: "Drivers", badge: stats.activeDrivers },
    { id: "users", icon: Users, label: "Clients" },
    { id: "earnings", icon: TrendingUp, label: "Earnings" },
    { id: "map", icon: MapPin, label: "Map" },
    { id: "alerts", icon: AlertTriangle, label: "Alerts" },
  ];

  // ── AI Agent ──
  const sendAiMessage = async (text: string) => {
    const safeText = sanitizePlainText(text, 4000);
    if (!safeText || aiLoading) return;
    const userMsg: AiMsg = { role: "user", content: safeText };
    setAiMessages(prev => [...prev, userMsg]);
    setAiInput("");
    setAiLoading(true);
    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setAiMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };
    await streamAdminAI({
      messages: [...aiMessages, userMsg],
      onDelta: upsert,
      onDone: () => setAiLoading(false),
      onError: (err) => { setAiMessages(p => [...p, { role: "assistant", content: `❌ ${err}` }]); setAiLoading(false); },
    });
  };

  const selectedTrip = recentTrips.find(t => t.id === tripDetailId);

  return (
    <div className="min-h-screen gradient-dark flex" dir="rtl">
      {/* ── Sidebar ── */}
      <aside className="w-64 glass-strong border-l border-border hidden lg:flex flex-col">
        <div className="p-4 flex items-center gap-3 border-b border-border">
          <img src={logo} alt="HN" className="w-9 h-9" />
          <span className="font-bold text-lg text-gradient-primary font-display">Admin Dashboard</span>
        </div>
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Administrator</p>
            <p className="text-xs text-muted-foreground">Username</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {sidebar.map((item) => (
            <button key={item.id} onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${activeSection === item.id ? "gradient-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
              </div>
              {item.badge ? <span className={`text-xs px-2 py-0.5 rounded-full ${activeSection === item.id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/20 text-primary"}`}>{item.badge}</span> : null}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-border space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <DollarSign className="w-5 h-5" /><span className="text-sm">Cashboard</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <Settings className="w-5 h-5" /><span className="text-sm">Settings</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 overflow-auto">
        {/* Top Bar */}
        <header className="glass-strong border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search..." className="bg-secondary/60 border-border h-9 rounded-lg pr-9 text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 relative hover:bg-secondary rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive animate-pulse" />
            </button>
            <button className="p-2 hover:bg-secondary rounded-lg transition-colors"><Activity className="w-5 h-5 text-muted-foreground" /></button>
            <button onClick={() => setAiOpen(true)} className="p-2 hover:bg-secondary rounded-lg transition-colors" title="AI Agent">
              <Bot className="w-5 h-5 text-primary" />
            </button>
            <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* ━━ 1. Stats Cards ━━ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: FileText, label: "Total Requests", value: stats.requestsToday, color: "text-info", glow: "glow-ring-blue", prefix: "" },
              { icon: Car, label: "Active Drivers", value: stats.activeDrivers, color: "text-primary", glow: "glow-ring-orange", prefix: "" },
              { icon: Zap, label: "Ongoing Rides", value: stats.ongoingRides, color: "text-success", glow: "", prefix: "" },
              { icon: DollarSign, label: "Total Income", value: stats.incomeToday, color: "text-warning", glow: "glow-ring-orange", prefix: "$" },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className="gradient-card rounded-xl p-5 border border-border hover:border-primary/30 transition-all group cursor-default">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-secondary ${stat.glow}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground">{stat.prefix}{stat.value.toLocaleString()}</p>
              </motion.div>
            ))}
          </div>

          {/* ━━ Row 2: Ride Requests + Driver Status + Map ━━ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Ride Requests */}
            <div className="gradient-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <Badge variant="outline" className="text-info border-info/30">{rideRequests.length}</Badge>
                <h3 className="font-bold text-foreground">Ride Requests</h3>
              </div>
              <div className="divide-y divide-border/50 max-h-80 overflow-auto">
                {rideRequests.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">No pending requests</div>}
                {rideRequests.map((req) => (
                  <div key={req.id} className="p-3 hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-right flex-1">
                        <p className="text-sm text-foreground font-medium truncate">{req.pickup || "—"}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3 text-primary" />
                          <span className="truncate">{req.destination || "—"}</span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground mr-2">
                        {new Date(req.created_at).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" disabled={processingId === req.id} onClick={() => handleAcceptRequest(req)} className="text-xs h-7 text-success border-success/30 hover:bg-success/10">
                        {processingId === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Accept"}
                      </Button>
                      <Button size="sm" variant="outline" disabled={processingId === req.id} onClick={() => handleOpenAssignDialog(req)} className="text-xs h-7 text-info border-info/30 hover:bg-info/10">
                        Assign
                      </Button>
                      <Button size="sm" variant="outline" disabled={processingId === req.id} onClick={() => handleCancelRequest(req)} className="text-xs h-7 text-destructive border-destructive/30 hover:bg-destructive/10">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Map */}
            <div className="lg:col-span-2 gradient-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <Badge variant="outline" className="text-success border-success/30">{nearbyDrivers.length} online</Badge>
                <h3 className="font-bold text-foreground">Driver Status</h3>
              </div>
              <div className="h-72">
                <LeafletMap zoom={11} showMarker={false} nearbyDrivers={nearbyDrivers.map(d => ({ id: d.id, lat: d.lat, lng: d.lng }))} />
              </div>
            </div>
          </div>

          {/* ━━ Row 3: Driver Status Donut + Earnings ━━ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Driver Status */}
            <div className="gradient-card rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <button onClick={handleOpenDriverList} className="text-xs text-info hover:underline">View all</button>
                <h3 className="font-bold text-foreground">Driver Status</h3>
              </div>
              <div className="flex items-center justify-center gap-8">
                <DonutChart online={stats.activeDrivers} offline={stats.offlineDrivers} />
                <div className="space-y-3 text-right">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{onlinePercent}%</p>
                    <p className="text-xs text-success">Online · {stats.activeDrivers}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{100 - onlinePercent}%</p>
                    <p className="text-xs text-muted-foreground">Offline · {stats.offlineDrivers}</p>
                  </div>
                </div>
              </div>
              {/* Recent active drivers */}
              <div className="mt-4 space-y-2 border-t border-border pt-3">
                {nearbyDrivers.slice(0, 3).map(d => (
                  <div key={d.id} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">★ {d.rating || "—"}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center"><Car className="w-3 h-3 text-success" /></div>
                      <span className="text-foreground font-medium">{d.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Earnings Analytics */}
            <div className="gradient-card rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-1">
                  {(["daily", "weekly", "monthly"] as const).map(r => (
                    <button key={r} onClick={() => setIncomeRange(r)}
                      className={`text-xs px-3 py-1 rounded-lg transition-colors ${incomeRange === r ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                      {r === "daily" ? "D" : r === "weekly" ? "W" : "M"}
                    </button>
                  ))}
                </div>
                <h3 className="font-bold text-foreground">Earnings Analytics</h3>
              </div>
              <div className="h-48">
                <SimpleBarChart data={incomeChartData} color="hsl(205, 78%, 56%)" />
              </div>
            </div>
          </div>

          {/* ━━ Row 4: Recent Activity + Alerts ━━ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <div className="gradient-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-bold text-foreground text-right">Recent Activity</h3>
              </div>
              <div className="divide-y divide-border/50 max-h-72 overflow-auto">
                {recentTrips.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">No trips</div>}
                {recentTrips.map((trip) => (
                  <button key={trip.id} onClick={() => setTripDetailId(trip.id)} className="w-full p-3 hover:bg-secondary/30 transition-colors flex items-center justify-between text-right">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        trip.status === "completed" ? "bg-success/10 text-success" : trip.status === "in_progress" ? "bg-info/10 text-info" : "bg-destructive/10 text-destructive"
                      }`}>{trip.status === "completed" ? "Completed" : trip.status === "in_progress" ? "Ongoing" : "Cancelled"}</span>
                      <span className="text-xs text-muted-foreground">
                        {trip.started_at ? new Date(trip.started_at).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-foreground font-medium truncate max-w-[180px]">{trip.start_location?.slice(0, 22) || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{trip.fare ? `$${trip.fare}` : "—"}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Alerts */}
            <div className="gradient-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-bold text-foreground text-right">Driver Alerts</h3>
              </div>
              <div className="divide-y divide-border/50">
                {alerts.map((a, i) => (
                  <div key={i} className="p-3 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                    <Badge variant="outline" className={a.status === "completed" ? "text-success border-success/30" : "text-destructive border-destructive/30"}>
                      {a.status === "completed" ? "Completed" : "⚠ Warning"}
                    </Badge>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <p className="text-sm text-foreground font-medium">{a.driver}</p>
                        <p className="text-xs text-muted-foreground">{a.alert}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <a.icon className={`w-4 h-4 ${a.status === "warning" ? "text-warning" : "text-success"}`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Assign Driver Dialog ── */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="gradient-card border-border" dir="rtl">
          <DialogHeader><DialogTitle className="text-foreground">تعيين سائق للطلب</DialogTitle></DialogHeader>
          {assigningRequest && (
            <div className="mb-3 p-3 rounded-lg bg-secondary/50 text-sm">
              <p className="text-foreground font-medium">{assigningRequest.pickup}</p>
              <p className="text-muted-foreground text-xs">← {assigningRequest.destination}</p>
              <p className="text-primary font-semibold mt-1">{assigningRequest.price || 0} ر.س</p>
            </div>
          )}
          {availableDrivers.length === 0
            ? <p className="text-center text-muted-foreground py-4">لا يوجد سائقين متاحين</p>
            : <div className="space-y-2 max-h-64 overflow-auto">
                {availableDrivers.map(d => (
                  <button key={d.id} disabled={processingId !== null} onClick={() => handleAssignDriver(d.id)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                    <Button size="sm" variant="outline" className="text-xs text-primary border-primary/30">
                      {processingId ? <Loader2 className="w-3 h-3 animate-spin" /> : "تعيين"}
                    </Button>
                    <div className="flex items-center gap-3">
                      <div><p className="text-sm text-foreground font-medium">{d.name}</p><p className="text-xs text-warning">★ {d.rating || "—"}</p></div>
                      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"><Car className="w-4 h-4 text-primary" /></div>
                    </div>
                  </button>
                ))}
              </div>
          }
        </DialogContent>
      </Dialog>

      {/* ── Trip Detail Dialog ── */}
      <Dialog open={!!tripDetailId} onOpenChange={() => setTripDetailId(null)}>
        <DialogContent className="gradient-card border-border" dir="rtl">
          <DialogHeader><DialogTitle className="text-foreground">تفاصيل الرحلة</DialogTitle></DialogHeader>
          {selectedTrip && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-secondary/50"><p className="text-xs text-muted-foreground">من</p><p className="text-sm text-foreground">{selectedTrip.start_location || "—"}</p></div>
                <div className="p-3 rounded-lg bg-secondary/50"><p className="text-xs text-muted-foreground">إلى</p><p className="text-sm text-foreground">{selectedTrip.end_location || "—"}</p></div>
                <div className="p-3 rounded-lg bg-secondary/50"><p className="text-xs text-muted-foreground">السعر</p><p className="text-sm text-primary font-bold">{selectedTrip.fare || 0} ر.س</p></div>
                <div className="p-3 rounded-lg bg-secondary/50"><p className="text-xs text-muted-foreground">الحالة</p><p className="text-sm text-foreground">{selectedTrip.status}</p></div>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">بدأت</p>
                <p className="text-sm text-foreground">{selectedTrip.started_at ? new Date(selectedTrip.started_at).toLocaleString("ar-SA") : "—"}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Driver List Dialog ── */}
      <Dialog open={driverListOpen} onOpenChange={setDriverListOpen}>
        <DialogContent className="gradient-card border-border max-w-lg" dir="rtl">
          <DialogHeader><DialogTitle className="text-foreground">جميع السائقين</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-80 overflow-auto">
            {allDriversList.map(d => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${d.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    {d.status === "active" ? "متصل" : "غير متصل"}
                  </span>
                  <span className="text-xs text-warning">★ {d.rating || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground font-medium">{d.name}</span>
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"><Car className="w-4 h-4 text-primary" /></div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── AI Agent Floating Panel ── */}
      <AnimatePresence>
        {aiOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 300 }}
            className="fixed left-4 bottom-4 top-16 w-96 z-50 glass-strong rounded-2xl border border-border flex flex-col overflow-hidden shadow-2xl"
            dir="rtl"
          >
            {/* AI Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <button onClick={() => setAiOpen(false)} className="p-1 hover:bg-secondary rounded-lg"><X className="w-4 h-4 text-muted-foreground" /></button>
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground text-sm">🤖 AI Agent</span>
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center"><Bot className="w-4 h-4 text-primary-foreground" /></div>
              </div>
            </div>

            {/* AI Messages */}
            <div ref={aiScrollRef} className="flex-1 overflow-auto p-3 space-y-3">
              {aiMessages.length === 0 && (
                <div className="text-center pt-8 space-y-3">
                  <Bot className="w-12 h-12 text-primary mx-auto" />
                  <p className="text-sm text-foreground font-semibold">مساعد الأدمن الذكي</p>
                  <p className="text-xs text-muted-foreground">أحلل البيانات وأقترح أفضل القرارات</p>
                  <div className="space-y-2 pt-2">
                    {["ما حالة النظام الآن؟", "اقترح أفضل سائق للطلبات", "ما المشاكل الحالية؟"].map((q, i) => (
                      <button key={i} onClick={() => sendAiMessage(q)} className="w-full text-right text-xs p-2 rounded-lg bg-secondary/50 hover:bg-secondary text-foreground transition-colors">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "user" ? "bg-primary/20" : "bg-info/20"}`}>
                    {msg.role === "user" ? <Shield className="w-3.5 h-3.5 text-primary" /> : <Bot className="w-3.5 h-3.5 text-info" />}
                  </div>
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                    <div className="prose prose-sm prose-invert max-w-none text-inherit">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {aiLoading && aiMessages[aiMessages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-info/20 flex items-center justify-center"><Bot className="w-3.5 h-3.5 text-info" /></div>
                  <div className="bg-secondary rounded-xl px-3 py-2"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                </div>
              )}
            </div>

            {/* AI Input */}
            <form onSubmit={e => { e.preventDefault(); sendAiMessage(aiInput); }} className="p-3 border-t border-border flex gap-2">
              <Input value={aiInput} onChange={e => setAiInput(e.target.value)} placeholder="اسأل المساعد..." className="flex-1 bg-secondary/80 border-border rounded-xl text-sm text-right" disabled={aiLoading} />
              <Button type="submit" size="icon" disabled={!aiInput.trim() || aiLoading} className="gradient-primary rounded-xl"><Send className="w-4 h-4" /></Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI FAB */}
      {!aiOpen && (
        <motion.button
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          onClick={() => setAiOpen(true)}
          className="fixed left-6 bottom-6 z-50 w-14 h-14 rounded-full gradient-primary glow-primary flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
        >
          <Bot className="w-6 h-6 text-primary-foreground" />
        </motion.button>
      )}
    </div>
  );
};

export default AdminDashboard;
