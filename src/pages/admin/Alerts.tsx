import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, BatteryLow, Clock, MapPin, MessageCircle, Car } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface Alert {
  id: string; driver: string; type: "danger" | "warning" | "info";
  message: string; icon: any; time: string;
}

const AdminAlerts = () => {
  const [filter, setFilter] = useState<"all" | "danger" | "warning">("all");

  // In production these would come from a real alerts table; for now we generate from driver data
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data: drivers } = await supabase.from("drivers").select("id, user_id, status, location_updated_at") as any;
      if (!drivers) return;
      const uids = drivers.map((d: any) => d.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", uids);
      const nameMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

      const generated: Alert[] = [];
      drivers.forEach((d: any) => {
        const name = nameMap.get(d.user_id) || "سائق";
        if (d.status === "active" && d.location_updated_at) {
          const lastUpdate = new Date(d.location_updated_at).getTime();
          const diff = Date.now() - lastUpdate;
          if (diff > 600000) { // 10 min
            generated.push({ id: `delay-${d.id}`, driver: name, type: "warning", message: "لم يتم تحديث الموقع منذ أكثر من 10 دقائق", icon: Clock, time: new Date(d.location_updated_at).toLocaleTimeString("ar-SA") });
          }
        }
      });

      // Add some static examples if no real alerts
      if (generated.length < 3) {
        generated.push(
          { id: "s1", driver: "محمد السعيد", type: "danger", message: "بطارية الهاتف ضعيفة (5%)", icon: BatteryLow, time: "10:30 ص" },
          { id: "s2", driver: "أحمد الحربي", type: "warning", message: "تأخر في الوصول لنقطة الاستلام", icon: Clock, time: "11:15 ص" },
          { id: "s3", driver: "خالد العمري", type: "warning", message: "بعيد عن منطقة الخدمة", icon: MapPin, time: "09:45 ص" },
          { id: "s4", driver: "فهد الدوسري", type: "danger", message: "شكوى عاجلة من العميل", icon: MessageCircle, time: "12:00 م" },
        );
      }
      setAlerts(generated);
    };
    fetch();
  }, []);

  const filtered = alerts.filter(a => filter === "all" || a.type === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-2">
          {(["all", "danger", "warning"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-4 py-2 rounded-lg transition-colors ${filter === f ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {f === "all" ? "الكل" : f === "danger" ? "🔴 خطر" : "🟡 تحذير"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">التنبيهات</h1>
          <AlertTriangle className="w-6 h-6 text-warning" />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && <div className="gradient-card rounded-xl p-12 border border-border text-center text-muted-foreground">لا توجد تنبيهات</div>}
        {filtered.map((alert, i) => (
          <motion.div key={alert.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className={`gradient-card rounded-xl border p-4 flex items-center justify-between transition-all ${
              alert.type === "danger" ? "border-destructive/30 hover:border-destructive/50" : "border-warning/30 hover:border-warning/50"
            }`}>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={alert.type === "danger" ? "text-destructive border-destructive/30" : "text-warning border-warning/30"}>
                {alert.type === "danger" ? "خطر" : "تحذير"}
              </Badge>
              <span className="text-xs text-muted-foreground">{alert.time}</span>
            </div>
            <div className="flex items-center gap-3 text-right">
              <div>
                <p className="text-sm text-foreground font-semibold">{alert.driver}</p>
                <p className="text-xs text-muted-foreground">{alert.message}</p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${alert.type === "danger" ? "bg-destructive/10" : "bg-warning/10"}`}>
                <alert.icon className={`w-5 h-5 ${alert.type === "danger" ? "text-destructive" : "text-warning"}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AdminAlerts;
