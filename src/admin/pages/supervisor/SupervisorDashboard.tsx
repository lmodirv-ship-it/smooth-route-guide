import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Car, Send, Headphones, UtensilsCrossed, Loader2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const SupervisorDashboard = () => {
  const [stats, setStats] = useState({ drivers: 0, deliveryDrivers: 0, callCenter: 0, restaurants: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [driversRes, deliveryRes, callCenterRes, restaurantsRes] = await Promise.all([
        supabase.from("drivers").select("id", { count: "exact", head: true }).eq("driver_type", "ride"),
        supabase.from("drivers").select("id", { count: "exact", head: true }).eq("driver_type", "delivery"),
        supabase.from("call_center").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("stores").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        drivers: driversRes.count || 0,
        deliveryDrivers: deliveryRes.count || 0,
        callCenter: callCenterRes.count || 0,
        restaurants: restaurantsRes.count || 0,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const cards = [
    { label: "السائقون", value: stats.drivers, icon: Car, color: "text-primary", bg: "bg-primary/10" },
    { label: "سائقو التوصيل", value: stats.deliveryDrivers, icon: Send, color: "text-success", bg: "bg-success/10" },
    { label: "طلبات مركز الاتصال", value: stats.callCenter, icon: Headphones, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "المطاعم", value: stats.restaurants, icon: UtensilsCrossed, color: "text-orange-500", bg: "bg-orange-500/10" },
  ];

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-orange-500" />
        <h1 className="text-2xl font-bold text-foreground">لوحة المراقبة</h1>
        <Badge variant="secondary">مشرف</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border p-5 glass-strong">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <span className="text-3xl font-bold text-foreground">{card.value}</span>
            </div>
            <p className="text-sm text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default SupervisorDashboard;
