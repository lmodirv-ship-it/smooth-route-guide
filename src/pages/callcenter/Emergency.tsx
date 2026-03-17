import { AlertTriangle, Phone, MapPin, Clock, Shield, ArrowUp, CheckCircle, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const Emergency = () => {
  const emergencies = [
    { id: 1, type: "حادث مروري", client: "عبدالله أحمد", phone: "+212 661-XXX-001", driver: "أحمد الفاسي", driverPhone: "+212 661-D01", location: "طريق الدار البيضاء - الرباط كم 45", time: "منذ 5 دقائق", status: "نشط", trip: "R-042", details: "العميل أبلغ بوقوع حادث خفيف أثناء الرحلة. لا إصابات مؤكدة." },
    { id: 2, type: "تهديد أمني", client: "فاطمة محمد", phone: "+212 662-XXX-002", driver: "غير معروف", driverPhone: "", location: "حي الحسني، شارع 22", time: "منذ 12 دقيقة", status: "قيد المعالجة", trip: "R-043", details: "العميلة تشعر بعدم الأمان. السائق غيّر المسار بشكل مريب." },
  ];

  const protocols = [
    { label: "اتصال بالعميل", icon: Phone, color: "text-info" },
    { label: "اتصال بالسائق", icon: Phone, color: "text-primary" },
    { label: "تتبع الموقع", icon: MapPin, color: "text-success" },
    { label: "تصعيد للإدارة", icon: ArrowUp, color: "text-warning" },
    { label: "اتصال طوارئ 15", icon: Radio, color: "text-destructive" },
    { label: "إغلاق الحالة", icon: CheckCircle, color: "text-success" },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
        <AlertTriangle className="w-5 h-5 text-destructive" />
        <h1 className="text-xl font-bold text-destructive">حالات الطوارئ</h1>
        <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full ml-auto">{emergencies.length} حالة نشطة</span>
      </div>

      {emergencies.length === 0 ? (
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
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                  e.status === "نشط" ? "bg-destructive/10 text-destructive animate-pulse" : "bg-warning/10 text-warning"
                }`}>{e.status}</span>
                <div className="text-right">
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2 justify-end">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    {e.type}
                  </h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end mt-1">
                    <Clock className="w-3 h-3" /> {e.time} • رحلة {e.trip}
                  </p>
                </div>
              </div>

              <div className="bg-secondary/30 rounded-xl p-4 mb-4">
                <p className="text-sm text-muted-foreground">{e.details}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                {[
                  { label: "العميل", value: e.client, sub: e.phone },
                  { label: "السائق", value: e.driver, sub: e.driverPhone || "غير متاح" },
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
                  <Button key={i} size="sm" variant="outline"
                    className={`border-border rounded-lg text-xs flex flex-col gap-1 h-auto py-2 hover:border-primary/30`}>
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
