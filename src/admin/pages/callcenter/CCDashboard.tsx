import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Loader2, Bell, ArrowRight, Eye, Headphones, Zap, CheckCircle, Send, XCircle, Clock, Truck, Package, Phone, Store, MapPin, User
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
      supabase.from("delivery_orders").select("*").order("created_at", { ascending: false }).limit(8),
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

  useEffect(() => {
    fetchAll();
    const ch = supabase.channel("cc-dash-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_orders" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "complaints" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, fetchAll)
      .subscribe();
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
      pending: { label: "جديد", color: "text-amber-400", bg: "bg-amber-500/20", dot: "bg-amber-400" },
      confirmed: { label: "مؤكد", color: "text-blue-400", bg: "bg-blue-500/20", dot: "bg-blue-400" },
      preparing: { label: "تحضير", color: "text-orange-400", bg: "bg-orange-500/20", dot: "bg-orange-400" },
      ready: { label: "جاهز", color: "text-purple-400", bg: "bg-purple-500/20", dot: "bg-purple-400" },
      driver_assigned: { label: "سائق معيّن", color: "text-cyan-400", bg: "bg-cyan-500/20", dot: "bg-cyan-400" },
      picked_up: { label: "تم الاستلام", color: "text-teal-400", bg: "bg-teal-500/20", dot: "bg-teal-400" },
      in_transit: { label: "في الطريق", color: "text-sky-400", bg: "bg-sky-500/20", dot: "bg-sky-400" },
      delivered: { label: "مكتمل", color: "text-emerald-400", bg: "bg-emerald-500/20", dot: "bg-emerald-400" },
      cancelled: { label: "ملغي", color: "text-red-400", bg: "bg-red-500/20", dot: "bg-red-400" },
    };
    return map[status] || { label: status, color: "text-muted-foreground", bg: "bg-muted", dot: "bg-muted-foreground" };
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

      {/* Alerts */}
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

      {/* Recent Orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Button
            size="sm"
            variant="ghost"
            className="text-[10px] rounded-lg gap-1 text-primary hover:text-primary hover:bg-primary/10 h-7 px-2"
            onClick={() => navigate("/call-center/delivery")}
          >
            <Eye className="w-3 h-3" />
            الكل
          </Button>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <img src={packageImg} alt="طلبات" className="w-5 h-5 object-contain" />
            آخر الطلبات
          </h2>
        </div>

        <div className="rounded-2xl bg-gradient-to-b from-black/30 to-black/10 border border-white/[0.06] overflow-hidden backdrop-blur-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="p-3 text-right text-sm font-bold text-foreground/80">إجراء</th>
                <th className="p-3 text-right text-sm font-bold text-foreground/80">السعر</th>
                <th className="p-3 text-center text-sm font-bold text-foreground/80">الحالة</th>
                <th className="p-3 text-right text-sm font-bold text-foreground/80">المطعم</th>
                <th className="p-3 text-center text-sm font-bold text-foreground/80">الوقت</th>
                <th className="p-3 text-right text-sm font-bold text-foreground/80">الزبون</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 && (
                <tr><td colSpan={6} className="p-10 text-center text-muted-foreground/50 text-sm">لا توجد طلبات بعد</td></tr>
              )}
              {recentOrders.map(o => {
                const si = getStatusInfo(o.status);
                return (
                  <tr
                    key={o.id}
                    className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.03] transition-colors cursor-pointer"
                    onClick={() => navigate("/call-center/delivery")}
                  >
                    <td className="p-3">
                      <button className="w-7 h-7 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
                        <Eye className="w-3.5 h-3.5 text-primary" />
                      </button>
                    </td>
                    <td className="p-3 text-primary font-bold text-sm">{o.estimated_price || 0} DH</td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-bold ${si.bg} ${si.color} border border-white/[0.06]`}>
                        <span className={`w-2 h-2 rounded-full ${si.dot}`} />
                        {si.label}
                      </span>
                    </td>
                    <td className="p-3 text-foreground/80 text-sm font-medium">{o.store_name || "—"}</td>
                    <td className="p-3 text-center text-muted-foreground/60 text-sm">
                      {new Date(o.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="p-3 text-right">
                      <p className="text-sm font-bold text-foreground/90">{o.userName}</p>
                      <p className="text-xs text-muted-foreground/50">{o.userPhone}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CCDashboard;
