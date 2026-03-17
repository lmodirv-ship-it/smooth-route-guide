import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Phone, PhoneIncoming, Clock, Users, AlertTriangle,
  CheckCircle, Car, Headphones, Activity, Zap, BarChart3, Loader2, Package
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const CCDashboard = () => {
  const [stats, setStats] = useState({ pendingRequests: 0, activeComplaints: 0, activeDrivers: 0, openTickets: 0, callsToday: 0, deliveryPending: 0 });
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [reqRes, compRes, drvRes, tickRes, callRes, delRes] = await Promise.all([
      supabase.from("ride_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("complaints").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("drivers").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("call_logs").select("id", { count: "exact", head: true }).gte("created_at", today),
      supabase.from("delivery_orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    setStats({
      pendingRequests: reqRes.count || 0, activeComplaints: compRes.count || 0,
      activeDrivers: drvRes.count || 0, openTickets: tickRes.count || 0, callsToday: callRes.count || 0,
      deliveryPending: delRes.count || 0,
    });

    const { data: calls } = await supabase.from("call_logs").select("*").order("created_at", { ascending: false }).limit(10);
    setRecentCalls(calls || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
    const ch = supabase.channel("cc-dash-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_requests" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "complaints" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "call_logs" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_orders" }, fetchStats)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchStats]);

  const statCards = [
    { icon: PhoneIncoming, label: "مكالمات اليوم", value: stats.callsToday, color: "text-primary", bg: "bg-primary/10" },
    { icon: Clock, label: "الطلبات المعلقة", value: stats.pendingRequests, color: "text-warning", bg: "bg-warning/10" },
    { icon: AlertTriangle, label: "الشكاوى النشطة", value: stats.activeComplaints, color: "text-destructive", bg: "bg-destructive/10" },
    { icon: Car, label: "السائقون المتاحون", value: stats.activeDrivers, color: "text-success", bg: "bg-success/10" },
    { icon: CheckCircle, label: "التذاكر المفتوحة", value: stats.openTickets, color: "text-info", bg: "bg-info/10" },
    { icon: Package, label: "توصيل معلّق", value: stats.deliveryPending, color: "text-accent", bg: "bg-accent/10" },
  ];

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1.5 bg-success/10 text-success px-3 py-1 rounded-full text-xs"><Activity className="w-3 h-3" />مباشر</div>
        <h1 className="text-xl font-bold text-foreground">لوحة مركز الاتصال</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {statCards.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="gradient-card rounded-xl p-4 border border-border">
            <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <h2 className="text-foreground font-bold mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />آخر المكالمات</h2>
      <div className="gradient-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-xs">
              <td className="p-3">الحالة</td><td className="p-3">السبب</td><td className="p-3">المتصل</td><td className="p-3 text-right">الوقت</td>
            </tr>
          </thead>
          <tbody>
            {recentCalls.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">لا توجد مكالمات</td></tr>}
            {recentCalls.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === "answered" ? "bg-success/10 text-success" : c.status === "missed" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                    {c.status === "answered" ? "مجاب" : c.status === "missed" ? "فائت" : c.status}
                  </span>
                </td>
                <td className="p-3 text-foreground text-xs">{c.reason || "—"}</td>
                <td className="p-3 text-foreground text-xs">{c.caller_name || c.caller_phone || "—"}</td>
                <td className="p-3 text-right text-muted-foreground text-xs">{new Date(c.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CCDashboard;
