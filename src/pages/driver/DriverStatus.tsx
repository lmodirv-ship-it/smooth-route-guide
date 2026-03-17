import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Power, Wifi, WifiOff, Battery, Signal, MapPin, Clock, Activity } from "lucide-react";

const DriverStatus = () => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(true);

  const statusInfo = [
    { icon: Signal, label: "قوة الإشارة", value: "ممتازة", color: "text-success" },
    { icon: Battery, label: "البطارية", value: "85%", color: "text-success" },
    { icon: MapPin, label: "دقة الموقع", value: "عالية (GPS)", color: "text-success" },
    { icon: Clock, label: "مدة الاتصال", value: "3 ساعات 45 دقيقة", color: "text-info" },
    { icon: Activity, label: "الرحلات اليوم", value: "8 رحلات", color: "text-primary" },
  ];

  const timeline = [
    { time: "14:30", event: "متصل الآن", active: true },
    { time: "12:00", event: "رحلة #342 مكتملة", active: false },
    { time: "11:15", event: "رحلة #341 مكتملة", active: false },
    { time: "10:30", event: "بدأ الاتصال", active: false },
    { time: "10:00", event: "غير متصل (استراحة)", active: false },
    { time: "08:00", event: "بدأ الاتصال", active: false },
  ];

  return (
    <div className="min-h-screen gradient-dark pb-6" dir="rtl">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)}><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
        <span className="font-bold text-foreground">حالة السائق</span>
        <div className="w-5" />
      </div>

      <div className="px-4 mt-4">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsOnline(!isOnline)}
          className="w-full"
        >
          <div className={`rounded-2xl p-8 text-center transition-all ${isOnline ? "gradient-primary glow-primary" : "gradient-card border border-border"}`}>
            <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-4 ${isOnline ? "bg-primary-foreground/20" : "bg-secondary"}`}>
              {isOnline ? <Wifi className="w-12 h-12 text-primary-foreground" /> : <WifiOff className="w-12 h-12 text-muted-foreground" />}
            </div>
            <h2 className={`text-2xl font-bold ${isOnline ? "text-primary-foreground" : "text-foreground"}`}>
              {isOnline ? "متصل" : "غير متصل"}
            </h2>
            <p className={`text-sm mt-1 ${isOnline ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
              {isOnline ? "أنت ظاهر للعملاء ويمكنك استقبال الطلبات" : "اضغط للاتصال وبدء استقبال الطلبات"}
            </p>
          </div>
        </motion.button>

        <div className="space-y-2 mt-6">
          {statusInfo.map((s, i) => (
            <div key={i} className="gradient-card rounded-xl p-4 border border-border flex items-center justify-between">
              <span className={`text-sm font-medium ${s.color}`}>{s.value}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">{s.label}</span>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
            </div>
          ))}
        </div>

        <h3 className="text-foreground font-bold mt-6 mb-3">سجل اليوم</h3>
        <div className="gradient-card rounded-xl border border-border p-4">
          {timeline.map((t, i) => (
            <div key={i} className="flex items-start gap-3 pb-4 last:pb-0">
              <div className="flex-1 text-right">
                <p className={`text-sm ${t.active ? "text-primary font-bold" : "text-foreground"}`}>{t.event}</p>
              </div>
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full ${t.active ? "bg-primary glow-primary" : "bg-muted-foreground/30"}`} />
                {i < timeline.length - 1 && <div className="w-px h-6 bg-border" />}
              </div>
              <span className="text-xs text-muted-foreground w-12">{t.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DriverStatus;
