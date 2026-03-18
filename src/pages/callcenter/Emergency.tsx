import { AlertTriangle, Phone, MapPin, Clock, Shield, ArrowUp, CheckCircle, Radio, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";

const protocols = [
  { label: "اتصال بالعميل", icon: Phone, color: "text-info" },
  { label: "اتصال بالسائق", icon: Phone, color: "text-primary" },
  { label: "تتبع الموقع", icon: MapPin, color: "text-success" },
  { label: "تصعيد للإدارة", icon: ArrowUp, color: "text-warning" },
  { label: "اتصال طوارئ 15", icon: Radio, color: "text-destructive" },
  { label: "إغلاق الحالة", icon: CheckCircle, color: "text-success" },
];

const Emergency = () => {
  const { data: alerts, loading } = useFirestoreCollection<any>({
    table: "alerts",
    filters: [{ field: "status", value: "active" }],
    orderByField: "created_at",
    orderDirection: "desc",
    realtime: true,
  });

  const emergencies = useMemo(() => alerts.map((alert) => ({
    id: alert.id,
    type: alert.type === "danger" ? "حادث أو خطر" : alert.type === "battery" ? "بطارية منخفضة" : alert.type === "location" ? "انحراف مسار" : "تنبيه عاجل",
    client: alert.client_name || alert.user_name || "عميل",
    phone: alert.client_phone || alert.user_phone || "—",
    driver: alert.driver_name || "سائق",
    driverPhone: alert.driver_phone || "—",
    location: alert.location || alert.message || "غير محدد",
    time: alert.created_at ? new Date(alert.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) : "—",
    status: "نشط",
    trip: alert.trip_id || alert.related_id || alert.id.slice(0, 8),
    details: alert.message || "تنبيه تشغيلي يحتاج تدخلاً فورياً.",
  })), [alerts]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
        <AlertTriangle className="w-5 h-5 text-destructive" />
        <h1 className="text-xl font-bold text-destructive">حالات الطوارئ</h1>
        <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full ml-auto">{emergencies.length} حالة نشطة</span>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : emergencies.length === 0 ? (
        <div className="gradient-card rounded-2xl p-16 border border-border text-center">
          <Shield className="w-20 h-20 text-success mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground">لا توجد حالات طوارئ نشطة</h2>
          <p className="text-sm text-muted-foreground mt-2">النظام آمن حالياً</p>
        </div>
      ) : (
        <div className="space-y-4">
          {emergencies.map((e, idx) => (
            <motion.div key={e.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="gradient-card rounded-2xl p-5 border border-destructive/30 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-1.5 h-full bg-destructive" />

              <div className="flex items-start justify-between mb-4">
                <span className="text-xs px-3 py-1 rounded-full font-medium bg-destructive/10 text-destructive animate-pulse">{e.status}</span>
                <div className="text-right">
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2 justify-end">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    {e.type}
                  </h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end mt-1">
                    <Clock className="w-3 h-3" /> {e.time} • حالة {e.trip}
                  </p>
                </div>
              </div>

              <div className="bg-secondary/30 rounded-xl p-4 mb-4">
                <p className="text-sm text-muted-foreground">{e.details}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                {[
                  { label: "العميل", value: e.client, sub: e.phone },
                  { label: "السائق", value: e.driver, sub: e.driverPhone },
                  { label: "الموقع", value: e.location, sub: "" },
                ].map((item, i) => (
                  <div key={i} className="bg-secondary/20 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-medium text-foreground">{item.value}</p>
                    {item.sub && <p className="text-xs text-muted-foreground">{item.sub}</p>}
                  </div>
                ))}
              </div>

              <h4 className="text-sm font-bold text-foreground mb-2">إجراءات الطوارئ</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                {protocols.map((p, i) => (
                  <Button key={i} size="sm" variant="outline" className="border-border rounded-lg text-xs flex flex-col gap-1 h-auto py-2 hover:border-primary/30">
                    <p.icon className={`w-4 h-4 ${p.color}`} />
                    <span className="text-foreground">{p.label}</span>
                  </Button>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Emergency;
