import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, BatteryLow, Clock, MapPin, MessageCircle, CheckCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AdminAlerts = () => {
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("all");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("alerts").select("*").order("created_at", { ascending: false }).limit(100);
    if (filter === "active") q = q.eq("status", "active");
    if (filter === "resolved") q = q.eq("status", "resolved");
    const { data } = await q;
    if (!data || data.length === 0) {
      setAlerts([]);
      setLoading(false);
      return;
    }
    // Get driver names
    const driverIds: string[] = [...new Set(data.filter(a => a.driver_id).map(a => a.driver_id))] as string[];
    let nameMap = new Map<string, string>();
    if (driverIds.length > 0) {
      const { data: drivers } = await supabase.from("drivers").select("id, user_id").in("id", driverIds as string[]) as any;
      if (drivers?.length) {
        const uids = drivers.map((d: any) => d.user_id);
        const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", uids);
        const driverUserMap = new Map<string, string>(drivers.map((d: any) => [d.id, d.user_id]));
        const profMap = new Map<string, string>(profiles?.map(p => [p.id, p.name]) || []);
        driverIds.forEach(did => {
          const uid = driverUserMap.get(did) || "";
          nameMap.set(did, profMap.get(uid) || "سائق");
        });
      }
    }
    setAlerts(data.map(a => ({ ...a, driverName: nameMap.get(a.driver_id) || "—" })));
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchAlerts();
    const ch = supabase.channel("admin-alerts-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, fetchAlerts)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAlerts]);

  const resolveAlert = async (id: string) => {
    await supabase.from("alerts").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", id);
    toast({ title: "تم حل التنبيه" });
    fetchAlerts();
  };

  const typeIcon = (type: string) => {
    if (type === "danger") return AlertTriangle;
    if (type === "battery") return BatteryLow;
    if (type === "location") return MapPin;
    if (type === "complaint") return MessageCircle;
    return Clock;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-2">
          {(["all", "active", "resolved"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-4 py-2 rounded-lg transition-colors ${filter === f ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {f === "all" ? "الكل" : f === "active" ? "🔴 نشطة" : "✅ محلولة"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">التنبيهات</h1>
          <AlertTriangle className="w-6 h-6 text-warning" />
        </div>
      </div>

      {loading && <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}

      {!loading && alerts.length === 0 && (
        <div className="gradient-card rounded-xl p-12 border border-border text-center text-muted-foreground">لا توجد تنبيهات</div>
      )}

      <div className="space-y-3">
        {alerts.map((alert, i) => {
          const Icon = typeIcon(alert.type);
          const isDanger = alert.type === "danger";
          return (
            <motion.div key={alert.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className={`gradient-card rounded-xl border p-4 flex items-center justify-between transition-all ${
                isDanger ? "border-destructive/30 hover:border-destructive/50" : "border-warning/30 hover:border-warning/50"
              }`}>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={isDanger ? "text-destructive border-destructive/30" : alert.status === "resolved" ? "text-success border-success/30" : "text-warning border-warning/30"}>
                  {alert.status === "resolved" ? "محلول" : isDanger ? "خطر" : "تحذير"}
                </Badge>
                <span className="text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}</span>
                {alert.status === "active" && (
                  <Button size="sm" variant="outline" onClick={() => resolveAlert(alert.id)} className="text-xs h-7 text-success border-success/30">
                    <CheckCircle className="w-3 h-3 ml-1" />حل
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3 text-right">
                <div>
                  <p className="text-sm text-foreground font-semibold">{alert.driverName}</p>
                  <p className="text-xs text-muted-foreground">{alert.message}</p>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDanger ? "bg-destructive/10" : "bg-warning/10"}`}>
                  <Icon className={`w-5 h-5 ${isDanger ? "text-destructive" : "text-warning"}`} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminAlerts;
