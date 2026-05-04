import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Loader2, Bell, ArrowRight, Eye, Headphones, Zap, CheckCircle, Send, XCircle, Clock, Truck, Package, Phone, Store, MapPin, User, PhoneCall, Search, Building2, Star, Globe, MessageCircle, RefreshCw, TrendingUp
} from "lucide-react";
import packageImg from "@/assets/icons/package-real.png";
import checkImg from "@/assets/icons/check-real.png";
import foodImg from "@/assets/icons/food-real.png";
import bikeImg from "@/assets/icons/bike-real.png";
import trendImg from "@/assets/icons/trend-real.png";
import carImg from "@/assets/icons/car-real.png";
import alertImg from "@/assets/icons/alert-real.png";
import phoneImg from "@/assets/icons/phone-real.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCall as useInAppCall } from "@/contexts/CallContext";

const ORDER_STAGES = [
  { key: "pending", label: "بانتظار", icon: "⏳" },
  { key: "confirmed", label: "مؤكد", icon: "✅" },
  { key: "ready_for_driver", label: "للسائق", icon: "🏍️" },
  { key: "driver_assigned", label: "تعيين", icon: "📍" },
  { key: "picked_up", label: "استلام", icon: "📦" },
  { key: "delivered", label: "تسليم", icon: "🎉" },
];

const CCDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    newOrders: 0, confirmed: 0, readyForPickup: 0, inTransit: 0,
    delivered: 0, cancelled: 0, activeDrivers: 0, totalDrivers: 0,
    openComplaints: 0, callsToday: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pipelineFilter, setPipelineFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const inAppCall = useInAppCall();

  // ───── Prospecting (شركاء محتملين) ─────
  const [prospects, setProspects] = useState<any[]>([]);
  const [prospectFilter, setProspectFilter] = useState<"all" | "pending" | "callback" | "no_answer" | "called">("pending");
  const [prospectCityFilter, setProspectCityFilter] = useState<string>("all");
  const [prospectStats, setProspectStats] = useState({ total: 0, pending: 0, called: 0, interested: 0, converted: 0 });
  const [prospectLoading, setProspectLoading] = useState(false);
  const [triggeringScan, setTriggeringScan] = useState(false);

  const fetchProspects = useCallback(async () => {
    setProspectLoading(true);
    const { data } = await supabase
      .from("prospects")
      .select("*")
      .order("call_priority", { ascending: false })
      .order("rating", { ascending: false })
      .limit(80);
    setProspects(data || []);
    const { data: all } = await supabase.from("prospects").select("status, call_status");
    if (all) {
      setProspectStats({
        total: all.length,
        pending: all.filter((p: any) => p.call_status === "pending").length,
        called: all.filter((p: any) => p.call_status === "called").length,
        interested: all.filter((p: any) => p.status === "interested").length,
        converted: all.filter((p: any) => p.status === "converted").length,
      });
    }
    setProspectLoading(false);
  }, []);

  useEffect(() => {
    fetchProspects();
    const ch = supabase.channel("cc-prospects-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "prospects" }, fetchProspects)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchProspects]);

  const updateProspect = async (id: string, updates: Record<string, any>) => {
    const { error } = await supabase.from("prospects").update(updates).eq("id", id);
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else { toast({ title: "تم التحديث ✅" }); fetchProspects(); }
  };

  const triggerAutoScan = async () => {
    setTriggeringScan(true);
    try {
      const { error } = await supabase.functions.invoke("auto-prospect", { body: { sync_mailbluster: true } });
      if (error) throw error;
      toast({ title: "🔍 بدأ البحث التلقائي عن شركاء جدد..." });
      setTimeout(fetchProspects, 3000);
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setTriggeringScan(false);
    }
  };

  const prospectCities = Array.from(new Set(prospects.map((p) => p.city).filter(Boolean)));
  const filteredProspects = prospects.filter((p) => {
    if (prospectFilter !== "all" && p.call_status !== prospectFilter) return false;
    if (prospectCityFilter !== "all" && p.city !== prospectCityFilter) return false;
    return true;
  });

  const fetchAll = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [
      pendingRes, confirmedRes, readyRes, transitRes, deliveredRes, cancelledRes,
      activeRes, totalRes, compRes, callRes, ordersRes, alertsRes
    ] = await Promise.all([
      supabase.from("delivery_orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("delivery_orders").select("id", { count: "exact", head: true }).eq("status", "confirmed"),
      supabase.from("delivery_orders").select("id", { count: "exact", head: true }).in("status", ["ready", "picked_up"]),
      supabase.from("delivery_orders").select("id", { count: "exact", head: true }).eq("status", "in_transit"),
      supabase.from("delivery_orders").select("id", { count: "exact", head: true }).eq("status", "delivered"),
      supabase.from("delivery_orders").select("id", { count: "exact", head: true }).eq("status", "cancelled"),
      supabase.from("drivers").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("drivers").select("id", { count: "exact", head: true }),
      supabase.from("complaints").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("call_logs").select("id", { count: "exact", head: true }).gte("created_at", today),
      supabase.from("delivery_orders").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("alerts").select("*").eq("status", "active").order("created_at", { ascending: false }).limit(5),
    ]);

    setStats({
      newOrders: pendingRes.count || 0,
      confirmed: confirmedRes.count || 0,
      readyForPickup: readyRes.count || 0,
      inTransit: transitRes.count || 0,
      delivered: deliveredRes.count || 0,
      cancelled: cancelledRes.count || 0,
      activeDrivers: activeRes.count || 0,
      totalDrivers: totalRes.count || 0,
      openComplaints: compRes.count || 0,
      callsToday: callRes.count || 0,
    });

    if (ordersRes.data) {
      const uids = [...new Set(ordersRes.data.map(o => o.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, name, phone").in("id", uids);
      const pMap = new Map((profiles || []).map((p) => [p.id, p]));
      setRecentOrders(ordersRes.data.map(o => ({
        ...o,
        userName: (pMap.get(o.user_id))?.name || "—",
        userPhone: (pMap.get(o.user_id))?.phone || "—",
      })));
    }

    setAlerts(alertsRes.data || []);
    setLoading(false);
  }, []);

  // Check for escalated orders (pending > 5 min without driver)
  const escalatedOrders = recentOrders.filter(o => {
    if (o.status !== "pending") return false;
    const ageMs = Date.now() - new Date(o.created_at).getTime();
    return ageMs > 5 * 60 * 1000; // 5 minutes
  });

  useEffect(() => {
    fetchAll();
    const ch = supabase.channel("cc-dash-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_orders" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "complaints" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, fetchAll)
      .subscribe();
    // Realtime only — no polling (per project policy)
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll]);

  const statCards = [
    { img: packageImg, label: "طلبات جديدة", value: stats.newOrders, gradient: "from-amber-500/20 to-orange-600/10", textColor: "text-amber-400", pulse: stats.newOrders > 0, path: "/call-center/delivery" },
    { img: checkImg, label: "تم التأكيد", value: stats.confirmed, gradient: "from-blue-500/20 to-cyan-600/10", textColor: "text-blue-400", path: "/call-center/delivery" },
    { img: foodImg, label: "جاهز / مستلم", value: stats.readyForPickup, gradient: "from-purple-500/20 to-violet-600/10", textColor: "text-purple-400", path: "/call-center/delivery" },
    { img: bikeImg, label: "في الطريق", value: stats.inTransit, gradient: "from-cyan-500/20 to-teal-600/10", textColor: "text-cyan-400", path: "/call-center/delivery" },
    { img: trendImg, label: "مكتمل اليوم", value: stats.delivered, gradient: "from-emerald-500/20 to-green-600/10", textColor: "text-emerald-400", path: "/call-center/delivery" },
    { img: carImg, label: "سائقون متاحون", value: `${stats.activeDrivers}/${stats.totalDrivers}`, gradient: "from-green-500/20 to-lime-600/10", textColor: "text-green-400", path: "/call-center/drivers" },
    { img: alertImg, label: "شكاوى مفتوحة", value: stats.openComplaints, gradient: "from-red-500/20 to-rose-600/10", textColor: "text-red-400", path: "/call-center/complaints" },
    { img: phoneImg, label: "مكالمات اليوم", value: stats.callsToday, gradient: "from-indigo-500/20 to-blue-600/10", textColor: "text-indigo-400", path: "/call-center/incoming" },
  ];

  const getStatusInfo = (status) => {
    const map = {
      pending: { label: "بانتظار التأكيد", color: "text-amber-400", bg: "bg-amber-500/20", dot: "bg-amber-400" },
      confirmed: { label: "مؤكد", color: "text-blue-400", bg: "bg-blue-500/20", dot: "bg-blue-400" },
      ready_for_driver: { label: "جاهز للسائق", color: "text-purple-400", bg: "bg-purple-500/20", dot: "bg-purple-400" },
      driver_assigned: { label: "تم التعيين", color: "text-cyan-400", bg: "bg-cyan-500/20", dot: "bg-cyan-400" },
      picked_up: { label: "تم الاستلام", color: "text-teal-400", bg: "bg-teal-500/20", dot: "bg-teal-400" },
      in_transit: { label: "في الطريق", color: "text-sky-400", bg: "bg-sky-500/20", dot: "bg-sky-400" },
      delivered: { label: "تم التسليم", color: "text-emerald-400", bg: "bg-emerald-500/20", dot: "bg-emerald-400" },
      cancelled: { label: "ملغي", color: "text-red-400", bg: "bg-red-500/20", dot: "bg-red-400" },
    };
    return map[status] || { label: status, color: "text-muted-foreground", bg: "bg-muted", dot: "bg-muted-foreground" };
  };

  const filteredPipelineOrders = recentOrders.filter(o => {
    if (pipelineFilter === "all") return true;
    return o.status === pipelineFilter;
  });

  const handleOrderAction = async (orderId: string, newStatus: string, extra?: Record<string, any>) => {
    const updates: Record<string, any> = { status: newStatus, updated_at: new Date().toISOString(), ...extra };
    const { error } = await supabase.from("delivery_orders").update(updates).eq("id", orderId);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم تحديث الطلب ✅" });
      fetchAll();
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center py-32 min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">جاري تحميل البيانات...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 min-h-screen" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            مباشر
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <h1 className="text-lg font-black text-foreground tracking-tight">مركز التحكم</h1>
            <p className="text-[10px] text-muted-foreground/60 font-medium">HN Delivery Control Center</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/5 border border-primary/20 flex items-center justify-center">
            <Headphones className="w-5 h-5 text-primary" />
          </div>
        </div>
      </div>

      {/* Flow Steps */}
      <div className="rounded-2xl bg-gradient-to-r from-black/40 via-black/20 to-black/40 border border-white/[0.06] p-3 overflow-x-auto backdrop-blur-sm">
        <div className="flex items-center gap-1.5 min-w-max justify-center">
          {[
            { icon: "👤", label: "طلب" },
            { icon: "📱", label: "تطبيق" },
            { icon: "📞", label: "اتصال" },
            { icon: "🍽️", label: "تأكيد" },
            { icon: "🏍️", label: "سائق" },
            { icon: "📦", label: "استلام" },
            { icon: "✅", label: "توصيل" },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="bg-white/[0.04] border border-white/[0.08] px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-foreground/80 whitespace-nowrap flex items-center gap-1">
                <span className="text-sm">{step.icon}</span>
                {step.label}
              </span>
              {i < 6 && <ArrowRight className="w-3 h-3 text-primary/50 flex-shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* Stat Buttons */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {statCards.map((s, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => navigate(s.path)}
            className={`group relative rounded-xl border border-white/[0.06] bg-gradient-to-br ${s.gradient} backdrop-blur-sm hover:border-white/[0.12] hover:scale-[1.04] active:scale-[0.98] transition-all duration-200 cursor-pointer text-center aspect-square flex flex-col items-center justify-center p-2`}
          >
            {s.pulse && (
              <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
            <div className="w-9 h-9 rounded-lg overflow-hidden mb-1.5">
              <img src={s.img} alt={s.label} className="w-full h-full object-contain" loading="lazy" />
            </div>
            <p className={`text-xl font-black ${s.textColor}`}>{s.value}</p>
            <p className="text-[9px] text-muted-foreground/70 mt-0.5 leading-tight">{s.label}</p>
          </motion.button>
        ))}
      </div>

      {/* ⚠️ Escalated Orders - pending > 5 min */}
      {escalatedOrders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-amber-950/30 border border-amber-500/25 p-4 backdrop-blur-sm"
        >
          <h2 className="text-foreground font-bold text-xs mb-2.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            ⚠️ طلبات متأخرة — بدون سائق منذ أكثر من 5 دقائق ({escalatedOrders.length})
          </h2>
          <div className="space-y-1.5">
            {escalatedOrders.map(o => {
              const mins = Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000);
              return (
                <div key={o.id} className="flex items-center justify-between gap-2 bg-amber-500/5 rounded-lg p-2.5 border border-amber-500/10">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[9px] px-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                      onClick={() => {
                        handleOrderAction(o.id, "confirmed");
                        toast({ title: "تم تأكيد الطلب وسيتم إرساله للسائق" });
                      }}
                    >✅ تأكيد</Button>
                    <span className="text-[10px] text-amber-400 font-bold">{mins} دقيقة</span>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    <span className="text-[11px] text-foreground/80">{o.store_name || "طلب"} — {o.userName}</span>
                    <Package className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-red-950/20 border border-red-500/15 p-4 backdrop-blur-sm"
        >
          <h2 className="text-foreground font-bold text-xs mb-2.5 flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-red-400" />
            تنبيهات نشطة ({alerts.length})
          </h2>
          <div className="space-y-1.5">
            {alerts.map(a => (
              <div key={a.id} className="flex items-center gap-2.5 bg-red-500/5 rounded-lg p-2.5 border border-red-500/10">
                <Zap className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                <p className="text-[11px] text-foreground/80 flex-1">{a.message}</p>
                <span className="text-[9px] text-muted-foreground/50">
                  {new Date(a.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ───────── Order Pipeline Management ───────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Button size="sm" variant="ghost" className="text-[10px] rounded-lg gap-1 text-primary hover:text-primary hover:bg-primary/10 h-7 px-2" onClick={() => navigate("/call-center/delivery")}>
            <Eye className="w-3 h-3" />عرض الكل
          </Button>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <img src={packageImg} alt="طلبات" className="w-5 h-5 object-contain" />
            إدارة الطلبات
          </h2>
        </div>

        {/* Pipeline filter tabs */}
        <div className="flex flex-wrap gap-1.5 mb-3 justify-end">
          {[
            { key: "all", label: "الكل", icon: "📋" },
            { key: "pending", label: "بانتظار التأكيد", icon: "⏳" },
            { key: "confirmed", label: "مؤكد", icon: "✅" },
            { key: "ready_for_driver", label: "جاهز للسائق", icon: "🏍️" },
            { key: "driver_assigned", label: "تم التعيين", icon: "📍" },
            { key: "picked_up", label: "تم الاستلام", icon: "📦" },
            { key: "delivered", label: "تم التسليم", icon: "🎉" },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setPipelineFilter(t.key)}
              className={`text-[10px] px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                pipelineFilter === t.key
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-white/[0.04] text-muted-foreground border border-white/[0.06] hover:bg-white/[0.08]"
              }`}
            >
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* Orders table with actions */}
        <div className="rounded-2xl bg-gradient-to-b from-black/30 to-black/10 border border-white/[0.06] overflow-hidden backdrop-blur-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="p-3 text-center text-[11px] font-bold text-foreground/80">إجراء</th>
                <th className="p-3 text-center text-[11px] font-bold text-foreground/80">المرحلة</th>
                <th className="p-3 text-right text-[11px] font-bold text-foreground/80">السعر</th>
                <th className="p-3 text-center text-[11px] font-bold text-foreground/80">الحالة</th>
                <th className="p-3 text-right text-[11px] font-bold text-foreground/80">المطعم</th>
                <th className="p-3 text-center text-[11px] font-bold text-foreground/80">الوقت</th>
                <th className="p-3 text-right text-[11px] font-bold text-foreground/80">الزبون</th>
              </tr>
            </thead>
            <tbody>
              {filteredPipelineOrders.length === 0 && (
                <tr><td colSpan={7} className="p-10 text-center text-muted-foreground/50 text-sm">لا توجد طلبات مطابقة</td></tr>
              )}
              {filteredPipelineOrders.map(o => {
                const si = getStatusInfo(o.status);
                return (
                  <tr
                    key={o.id}
                    className={`border-b border-white/[0.05] last:border-0 hover:bg-white/[0.03] transition-colors cursor-pointer ${selectedOrder?.id === o.id ? "bg-primary/5" : ""}`}
                    onClick={() => setSelectedOrder(o)}
                  >
                    {/* Action buttons */}
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {o.status === "pending" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOrderAction(o.id, "confirmed"); }}
                            className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[9px] font-bold hover:bg-emerald-500/30 transition-colors"
                            title="تأكيد الطلب"
                          >✅ تأكيد</button>
                        )}
                        {o.status === "confirmed" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOrderAction(o.id, "ready_for_driver"); }}
                            className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-[9px] font-bold hover:bg-blue-500/30 transition-colors"
                            title="إرسال للسائق"
                          >🏍️ للسائق</button>
                        )}
                        {["pending", "confirmed", "ready_for_driver"].includes(o.status) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedOrder(o); setCancelDialogOpen(true); }}
                            className="px-1.5 py-1 rounded-lg bg-red-500/20 text-red-400 text-[9px] font-bold hover:bg-red-500/30 transition-colors"
                            title="إلغاء"
                          >✕</button>
                        )}
                        {!["pending", "confirmed", "ready_for_driver"].includes(o.status) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedOrder(o); }}
                            className="w-7 h-7 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-primary" />
                          </button>
                        )}
                      </div>
                    </td>
                    {/* Progress pipeline */}
                    <td className="p-2">
                      <div className="flex items-center gap-0.5 justify-center">
                        {ORDER_STAGES.map((stage, i) => {
                          const stageIdx = ORDER_STAGES.findIndex(s => s.key === o.status);
                          const isActive = i <= stageIdx;
                          const isCurrent = i === stageIdx;
                          return (
                            <div key={stage.key} className="flex items-center gap-0.5">
                              <div
                                className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] transition-all ${
                                  isCurrent ? "bg-primary text-primary-foreground scale-110 ring-2 ring-primary/30" :
                                  isActive ? "bg-emerald-500/30 text-emerald-400" : "bg-white/[0.06] text-muted-foreground/40"
                                }`}
                                title={stage.label}
                              >{stage.icon}</div>
                              {i < ORDER_STAGES.length - 1 && (
                                <div className={`w-2 h-0.5 rounded ${isActive ? "bg-emerald-500/40" : "bg-white/[0.06]"}`} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="p-3 text-primary font-bold text-sm">{o.total_price || o.estimated_price || 0} DH</td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-bold ${si.bg} ${si.color} border border-white/[0.06]`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${si.dot}`} />
                        {si.label}
                      </span>
                    </td>
                    <td className="p-3 text-foreground/80 text-xs font-medium">{o.store_name || "—"}</td>
                    <td className="p-3 text-center text-muted-foreground/60 text-xs">
                      {new Date(o.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="p-3 text-right">
                      <p className="text-xs font-bold text-foreground/90">{o.userName}</p>
                      <p className="text-[10px] text-muted-foreground/50">{o.userPhone}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Order Detail Panel */}
      {selectedOrder && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-b from-black/40 to-black/20 border border-primary/20 p-5 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <Button size="sm" variant="ghost" onClick={() => setSelectedOrder(null)} className="text-muted-foreground text-xs">✕ إغلاق</Button>
            <h3 className="text-sm font-bold text-foreground">تفاصيل الطلب #{selectedOrder.id.slice(0, 8)}</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-right">
            <div className="rounded-xl bg-white/[0.04] p-3 border border-white/[0.06]">
              <p className="text-[10px] text-muted-foreground mb-1">الزبون</p>
              <p className="text-xs font-bold text-foreground">{selectedOrder.userName}</p>
              <p className="text-[10px] text-muted-foreground">{selectedOrder.userPhone}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full gap-1.5 text-[10px] h-7 rounded-lg border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                onClick={() => inAppCall.startCall({ id: selectedOrder.user_id, name: selectedOrder.userName || "زبون" })}
              >
                <PhoneCall className="w-3 h-3" />اتصل بالزبون
              </Button>
            </div>
            <div className="rounded-xl bg-white/[0.04] p-3 border border-white/[0.06]">
              <p className="text-[10px] text-muted-foreground mb-1">المطعم</p>
              <p className="text-xs font-bold text-foreground">{selectedOrder.store_name || "—"}</p>
            </div>
            <div className="rounded-xl bg-white/[0.04] p-3 border border-white/[0.06]">
              <p className="text-[10px] text-muted-foreground mb-1">العنوان</p>
              <p className="text-xs font-bold text-foreground">{selectedOrder.delivery_address || "—"}</p>
            </div>
            <div className="rounded-xl bg-white/[0.04] p-3 border border-white/[0.06]">
              <p className="text-[10px] text-muted-foreground mb-1">المبلغ</p>
              <p className="text-xs font-bold text-primary">{selectedOrder.total_price || selectedOrder.estimated_price || 0} DH</p>
            </div>
          </div>

          {/* Stage progress bar */}
          <div className="rounded-xl bg-white/[0.04] p-4 border border-white/[0.06] mb-4">
            <div className="flex items-center justify-between gap-1">
              {ORDER_STAGES.map((stage, i) => {
                const stageIdx = ORDER_STAGES.findIndex(s => s.key === selectedOrder.status);
                const isActive = i <= stageIdx;
                const isCurrent = i === stageIdx;
                return (
                  <div key={stage.key} className="flex items-center gap-1 flex-1">
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                        isCurrent ? "bg-primary text-primary-foreground scale-110 ring-2 ring-primary/30 shadow-lg shadow-primary/20" :
                        isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-white/[0.06] text-muted-foreground/30"
                      }`}>{stage.icon}</div>
                      <span className={`text-[8px] font-bold whitespace-nowrap ${isCurrent ? "text-primary" : isActive ? "text-emerald-400/70" : "text-muted-foreground/30"}`}>{stage.label}</span>
                    </div>
                    {i < ORDER_STAGES.length - 1 && (
                      <div className={`h-0.5 flex-1 rounded ${isActive ? "bg-emerald-500/40" : "bg-white/[0.06]"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons for selected order */}
          <div className="flex flex-wrap gap-2 justify-end">
            {selectedOrder.status === "pending" && (
              <Button size="sm" onClick={() => handleOrderAction(selectedOrder.id, "confirmed")} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs">
                <CheckCircle className="w-3.5 h-3.5" />تأكيد الطلب
              </Button>
            )}
            {selectedOrder.status === "confirmed" && (
              <Button size="sm" onClick={() => handleOrderAction(selectedOrder.id, "ready_for_driver")} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs">
                <Send className="w-3.5 h-3.5" />إرسال للسائق
              </Button>
            )}
            {["pending", "confirmed", "ready_for_driver"].includes(selectedOrder.status) && (
              <Button size="sm" variant="outline" onClick={() => setCancelDialogOpen(true)} className="gap-1.5 border-destructive text-destructive rounded-xl text-xs">
                <XCircle className="w-3.5 h-3.5" />إلغاء الطلب
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* ───────── Prospecting — التنقيب عن الشركاء ───────── */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-[10px] rounded-lg gap-1 text-primary hover:bg-primary/10 h-7 px-2"
              onClick={() => navigate("/call-center/prospecting")}
            >
              <Eye className="w-3 h-3" />الصفحة الكاملة
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-[10px] rounded-lg gap-1 h-7 px-2 border-primary/30 text-primary"
              onClick={triggerAutoScan}
              disabled={triggeringScan}
            >
              {triggeringScan ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              بحث تلقائي عن شركاء
            </Button>
          </div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            التنقيب عن الشركاء
          </h2>
        </div>

        {/* Prospect stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
          {[
            { label: "الإجمالي", value: prospectStats.total, color: "text-foreground", bg: "from-slate-500/20 to-slate-600/10" },
            { label: "في الانتظار", value: prospectStats.pending, color: "text-amber-400", bg: "from-amber-500/20 to-orange-600/10" },
            { label: "تم الاتصال", value: prospectStats.called, color: "text-blue-400", bg: "from-blue-500/20 to-cyan-600/10" },
            { label: "مهتم", value: prospectStats.interested, color: "text-emerald-400", bg: "from-emerald-500/20 to-green-600/10" },
            { label: "شريك ✓", value: prospectStats.converted, color: "text-purple-400", bg: "from-purple-500/20 to-violet-600/10" },
          ].map((s, i) => (
            <div key={i} className={`rounded-xl bg-gradient-to-br ${s.bg} border border-white/[0.06] p-2.5 text-center`}>
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[9px] text-muted-foreground/70 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-1.5 mb-3 justify-end">
          {prospectCities.length > 0 && (
            <select
              value={prospectCityFilter}
              onChange={(e) => setProspectCityFilter(e.target.value)}
              className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground"
            >
              <option value="all">كل المدن</option>
              {prospectCities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {[
            { key: "pending", label: "في الانتظار", icon: "⏳" },
            { key: "callback", label: "إعادة اتصال", icon: "🔁" },
            { key: "no_answer", label: "لم يرد", icon: "📵" },
            { key: "called", label: "تم الاتصال", icon: "✅" },
            { key: "all", label: "الكل", icon: "📋" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setProspectFilter(t.key as any)}
              className={`text-[10px] px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                prospectFilter === t.key
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-white/[0.04] text-muted-foreground border border-white/[0.06] hover:bg-white/[0.08]"
              }`}
            >
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* Prospects table */}
        <div className="rounded-2xl bg-gradient-to-b from-black/30 to-black/10 border border-white/[0.06] overflow-hidden backdrop-blur-sm">
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-black/60 backdrop-blur-md z-10">
                <tr className="border-b border-white/[0.08]">
                  <th className="p-2.5 text-center text-[11px] font-bold text-foreground/80">إجراءات</th>
                  <th className="p-2.5 text-center text-[11px] font-bold text-foreground/80">حالة الاتصال</th>
                  <th className="p-2.5 text-center text-[11px] font-bold text-foreground/80">التقييم</th>
                  <th className="p-2.5 text-right text-[11px] font-bold text-foreground/80">الفئة</th>
                  <th className="p-2.5 text-right text-[11px] font-bold text-foreground/80">المدينة / المنطقة</th>
                  <th className="p-2.5 text-right text-[11px] font-bold text-foreground/80">الهاتف</th>
                  <th className="p-2.5 text-right text-[11px] font-bold text-foreground/80">الشريك المحتمل</th>
                </tr>
              </thead>
              <tbody>
                {prospectLoading && (
                  <tr><td colSpan={7} className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" /></td></tr>
                )}
                {!prospectLoading && filteredProspects.length === 0 && (
                  <tr><td colSpan={7} className="p-10 text-center text-muted-foreground/50 text-sm">لا يوجد شركاء محتملين مطابقين</td></tr>
                )}
                {filteredProspects.map((p) => {
                  const wa = (p.phone || "").replace(/\D/g, "");
                  const callStatusColors: Record<string, string> = {
                    pending: "bg-amber-500/20 text-amber-400",
                    called: "bg-emerald-500/20 text-emerald-400",
                    no_answer: "bg-yellow-500/20 text-yellow-400",
                    callback: "bg-purple-500/20 text-purple-400",
                    no_phone: "bg-red-500/20 text-red-400",
                  };
                  const callStatusLabels: Record<string, string> = {
                    pending: "⏳ في الانتظار",
                    called: "✅ تم الاتصال",
                    no_answer: "📵 لم يرد",
                    callback: "🔁 إعادة اتصال",
                    no_phone: "🚫 بدون هاتف",
                  };
                  return (
                    <tr key={p.id} className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.03] transition-colors">
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {p.phone && (
                            <>
                              <a href={`tel:${p.phone}`} onClick={() => updateProspect(p.id, { call_status: "called"})}>
                                <button className="px-1.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors" title="اتصال">
                                  <Phone className="w-3 h-3" />
                                </button>
                              </a>
                              {wa && (
                                <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
                                  <button className="px-1.5 py-1 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors" title="واتساب">
                                    <MessageCircle className="w-3 h-3" />
                                  </button>
                                </a>
                              )}
                            </>
                          )}
                          <button
                            onClick={() => updateProspect(p.id, { call_status: "no_answer" })}
                            className="px-1.5 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 text-[9px] font-bold hover:bg-yellow-500/30 transition-colors"
                            title="لم يرد"
                          >📵</button>
                          <button
                            onClick={() => updateProspect(p.id, { call_status: "callback" })}
                            className="px-1.5 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-[9px] font-bold hover:bg-purple-500/30 transition-colors"
                            title="إعادة الاتصال"
                          >🔁</button>
                          <button
                            onClick={() => updateProspect(p.id, { status: "interested", call_status: "called" })}
                            className="px-1.5 py-1 rounded-lg bg-emerald-600/30 text-emerald-300 text-[9px] font-bold hover:bg-emerald-600/40 transition-colors"
                            title="مهتم"
                          >⭐</button>
                          <button
                            onClick={() => updateProspect(p.id, { status: "not_interested", call_status: "called" })}
                            className="px-1.5 py-1 rounded-lg bg-red-500/20 text-red-400 text-[9px] font-bold hover:bg-red-500/30 transition-colors"
                            title="غير مهتم"
                          >✕</button>
                          {p.website && (
                            <a href={p.website} target="_blank" rel="noreferrer">
                              <button className="px-1.5 py-1 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors" title="الموقع">
                                <Globe className="w-3 h-3" />
                              </button>
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        <span className={`inline-block text-[9px] px-2 py-1 rounded-full font-bold ${callStatusColors[p.call_status] || "bg-muted"}`}>
                          {callStatusLabels[p.call_status] || p.call_status}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        {p.rating > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-bold">
                            <Star className="w-3 h-3 fill-amber-400" />{Number(p.rating).toFixed(1)}
                          </span>
                        ) : <span className="text-[10px] text-muted-foreground/40">—</span>}
                      </td>
                      <td className="p-2 text-right text-[10px] text-foreground/70">{p.category || "—"}</td>
                      <td className="p-2 text-right text-[10px] text-foreground/70">
                        <div className="flex items-center gap-1 justify-end">
                          <span>{p.city || "—"}</span>
                          {p.area && <span className="text-muted-foreground/50">· {p.area}</span>}
                          <MapPin className="w-3 h-3 text-muted-foreground/40" />
                        </div>
                      </td>
                      <td className="p-2 text-right text-[10px] font-mono text-foreground/80">{p.phone || <span className="text-red-400/60">بدون</span>}</td>
                      <td className="p-2 text-right">
                        <p className="text-xs font-bold text-foreground/90 flex items-center gap-1 justify-end">
                          {p.name}
                          {p.call_priority === "high" && <span className="text-[8px] px-1 py-0.5 rounded bg-red-500/20 text-red-400">🔥</span>}
                        </p>
                        {p.address && <p className="text-[9px] text-muted-foreground/50 truncate max-w-[200px] mr-auto">{p.address}</p>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Cancel Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>إلغاء الطلب</AlertDialogTitle>
            <AlertDialogDescription>هل تريد إلغاء هذا الطلب؟ سيتم إبلاغ الزبون.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="سبب الإلغاء (اختياري)..."
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>تراجع</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (selectedOrder) {
                  handleOrderAction(selectedOrder.id, "cancelled", { cancel_reason: cancelReason || "ملغي من مركز الاتصال" });
                }
                setCancelDialogOpen(false);
                setCancelReason("");
              }}
            >تأكيد الإلغاء</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* In-App Call Dialog */}
</div>
  );
};

export default CCDashboard;
