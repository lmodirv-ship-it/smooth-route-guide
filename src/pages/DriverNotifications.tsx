import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Bell, Car, DollarSign, Star, AlertTriangle, CheckCircle } from "lucide-react";

const DriverNotifications = () => {
  const navigate = useNavigate();

  const notifications = [
    { id: 1, type: "trip", icon: Car, title: "رحلة جديدة", desc: "طلب رحلة من حي الملقا إلى حي العليا", time: "منذ ٥ دقائق", read: false, color: "text-info" },
    { id: 2, type: "earning", icon: DollarSign, title: "إيداع أرباح", desc: "تم إيداع ٢٥٠ ر.س في حسابك", time: "منذ ساعة", read: false, color: "text-primary" },
    { id: 3, type: "rating", icon: Star, title: "تقييم جديد", desc: "حصلت على تقييم ٥ نجوم من العميل", time: "منذ ٣ ساعات", read: true, color: "text-warning" },
    { id: 4, type: "alert", icon: AlertTriangle, title: "تنبيه", desc: "يرجى تحديث بيانات المركبة", time: "منذ يوم", read: true, color: "text-destructive" },
    { id: 5, type: "system", icon: CheckCircle, title: "تم التحقق", desc: "تمت الموافقة على وثائقك بنجاح", time: "منذ ٣ أيام", read: true, color: "text-success" },
  ];

  return (
    <div className="min-h-screen gradient-dark">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <div />
        <h1 className="font-bold text-foreground text-lg">الإشعارات</h1>
        <button onClick={() => navigate(-1)}>
          <ArrowRight className="w-6 h-6 text-muted-foreground" />
        </button>
      </div>

      <div className="px-4 mt-4 space-y-3 pb-8">
        {notifications.map((n, i) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`gradient-card rounded-xl p-4 border transition-colors ${
              n.read ? "border-border" : "border-primary/30"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 text-right">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{n.time}</span>
                  <h3 className="font-medium text-foreground">{n.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{n.desc}</p>
              </div>
              <div className={`icon-circle w-10 h-10 ${!n.read ? "glow-ring-orange" : ""}`}>
                <n.icon className={`w-5 h-5 ${n.color}`} />
              </div>
            </div>
            {!n.read && <div className="w-2 h-2 rounded-full bg-primary absolute top-3 left-3" />}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default DriverNotifications;
