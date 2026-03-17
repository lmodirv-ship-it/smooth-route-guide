import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Package, Clock, Users, AlertTriangle, CheckCircle, Car, Activity,
  Loader2, PhoneIncoming, Bike, UtensilsCrossed, TrendingUp, Bell,
  ArrowRight, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/firestoreClient";

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
      const pMap = new Map((profiles as any[])?.map((p: any) => [p.id, p]) || []);
      setRecentOrders(ordersRes.data.map(o => ({
        ...o,
        userName: (pMap.get(o.user_id) as any)?.name || "—",
        userPhone: (pMap.get(o.user_id) as any)?.phone || "—",
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
    { icon: Package, label: "طلبات جديدة", value: stats.newOrders, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", pulse: stats.newOrders > 0 },
    { icon: CheckCircle, label: "تم التأكيد", value: stats.confirmed, color: "text-info", bg: "bg-info/10", border: "border-info/20" },
    { icon: UtensilsCrossed, label: "جاهز / مستلم", value: stats.readyForPickup, color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
    { icon: Bike, label: "في الطريق", value: stats.inTransit, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
    { icon: TrendingUp, label: "مكتمل اليوم", value: stats.delivered, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
    { icon: Car, label: "سائقون متاحون", value: `${stats.activeDrivers}/${stats.totalDrivers}`, color: "text-success", bg: "bg-success/10", border: "border-success/20" },
    { icon: AlertTriangle, label: "شكاوى مفتوحة", value: stats.openComplaints, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" },
    { icon: PhoneIncoming, label: "مكالمات اليوم", value: stats.callsToday, color: "text-info", bg: "bg-info/10", border: "border-info/20" },
  ];

  const getStatusInfo = (status: string) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      pending: { label: "جديد", color: "text-amber-400", bg: "bg-amber-400/10" },
      confirmed: { label: "مؤكد", color: "text-info", bg: "bg-info/10" },
      preparing: { label: "تحضير", color: "text-orange-400", bg: "bg-orange-400/10" },
      ready: { label: "جاهز", color: "text-purple-400", bg: "bg-purple-400/10" },
      driver_assigned: { label: "سائق معيّن", color: "text-cyan-400", bg: "bg-cyan-400/10" },
      picked_up: { label: "تم الاستلام", color: "text-primary", bg: "bg-primary/10" },
      in_transit: { label: "في الطريق", color: "text-primary", bg: "bg-primary/10" },
      delivered: { label: "مكتمل", color: "text-emerald-400", bg: "bg-emerald-400/10" },
      cancelled: { label: "ملغي", color: "text-destructive", bg: "bg-destructive/10" },
    };
    return map[status] || { label: status, color: "text-muted-foreground", bg: "bg-secondary" };
  };

  if (loading) return (
    <div className="flex justify-center items-center py-32">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-success/10 text-success px-3 py-1.5 rounded-full text-xs font-bold">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            مباشر
          </div>
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">مركز التحكم — التوصيل</h1>
          <p className="text-xs text-muted-foreground text-right">HN Delivery Control Center</p>
        </div>
      </div>

      {/* Flow Diagram */}
      <div className="glass rounded-xl p-3 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max justify-center text-xs">
          {[
            { icon: "👤", label: "الزبون يطلب" },
            { icon: "📱", label: "التطبيق" },
            { icon: "📞", label: "مركز الاتصال" },
            { icon: "🍽️", label: "تأكيد المطعم" },
            { icon: "🏍️", label: "تعيين سائق" },
            { icon: "📦", label: "استلام" },
            { icon: "🚀", label: "توصيل" },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="bg-card border border-border px-3 py-2 rounded-lg font-bold whitespace-nowrap flex items-center gap-1.5">
                <span>{step.icon}</span>
                {step.label}
              </span>
              {i < 6 && <ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`glass rounded-xl p-4 border ${s.border} cursor-pointer hover:scale-[1.02] transition-transform`}
            onClick={() => {
              if (s.label.includes("طلبات")) navigate("/call-center/delivery");
              if (s.label.includes("سائق")) navigate("/call-center/drivers");
              if (s.label.includes("شكاوى")) navigate("/call-center/complaints");
            }}
          >
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3 ${s.pulse ? "animate-pulse" : ""}`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="glass rounded-xl border border-destructive/20 p-4">
          <h2 className="text-foreground font-bold text-sm mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4 text-destructive" />
            تنبيهات نشطة
          </h2>
          <div className="space-y-2">
            {alerts.map(a => (
              <div key={a.id} className="flex items-center gap-3 bg-destructive/5 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                <p className="text-xs text-foreground flex-1">{a.message}</p>
                <span className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Button size="sm" variant="outline" className="text-xs rounded-lg gap-1" onClick={() => navigate("/call-center/delivery")}>
            <Eye className="w-3 h-3" />
            عرض الكل
          </Button>
          <h2 className="text-foreground font-bold flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            آخر الطلبات
          </h2>
        </div>

        <div className="glass rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs">
                <td className="p-3">الإجراء</td>
                <td className="p-3">السعر</td>
                <td className="p-3">الحالة</td>
                <td className="p-3">المطعم</td>
                <td className="p-3">الوقت</td>
                <td className="p-3 text-right">الزبون</td>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">لا توجد طلبات بعد</td></tr>
              )}
              {recentOrders.map(o => {
                const si = getStatusInfo(o.status);
                return (
                  <tr key={o.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors cursor-pointer"
                    onClick={() => navigate("/call-center/delivery")}>
                    <td className="p-3">
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] text-primary">
                        <Eye className="w-3 h-3" />
                      </Button>
                    </td>
                    <td className="p-3 text-primary font-bold text-xs">{o.estimated_price || 0} DH</td>
                    <td className="p-3">
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${si.bg} ${si.color}`}>
                        {si.label}
                      </span>
                    </td>
                    <td className="p-3 text-foreground text-xs">{o.store_name || "—"}</td>
                    <td className="p-3 text-muted-foreground text-[10px]">
                      {new Date(o.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="p-3 text-right">
                      <p className="text-xs font-bold text-foreground">{o.userName}</p>
                      <p className="text-[10px] text-muted-foreground">{o.userPhone}</p>
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
