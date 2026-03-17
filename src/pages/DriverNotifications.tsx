import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Bell, Car, DollarSign, Star, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/firestoreClient";

const DriverNotifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.from("notifications")
        .select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(30);
      setNotifications(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    setNotifications(n => n.map(x => x.id === id ? { ...x, read_at: new Date().toISOString() } : x));
  };

  const iconMap: Record<string, any> = { trip: Car, earning: DollarSign, rating: Star, alert: AlertTriangle, system: CheckCircle, general: Bell };
  const colorMap: Record<string, string> = { trip: "text-info", earning: "text-primary", rating: "text-warning", alert: "text-destructive", system: "text-success", general: "text-muted-foreground" };

  if (loading) return <div className="min-h-screen gradient-dark flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen gradient-dark">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <div />
        <h1 className="font-bold text-foreground text-lg">الإشعارات</h1>
        <button onClick={() => navigate(-1)}><ArrowRight className="w-6 h-6 text-muted-foreground" /></button>
      </div>

      <div className="px-4 mt-4 space-y-3 pb-8">
        {notifications.length === 0 && <p className="text-center text-muted-foreground py-12">لا توجد إشعارات</p>}
        {notifications.map((n, i) => {
          const Icon = iconMap[n.type] || Bell;
          const color = colorMap[n.type] || "text-muted-foreground";
          return (
            <motion.div key={n.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => !n.read_at && markRead(n.id)}
              className={`gradient-card rounded-xl p-4 border transition-colors cursor-pointer ${!n.read_at ? "border-primary/30" : "border-border"}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 text-right">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleString("ar-SA", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                    </span>
                    <h3 className="font-medium text-foreground">{n.type === "trip" ? "رحلة" : n.type === "earning" ? "أرباح" : n.type === "rating" ? "تقييم" : "إشعار"}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                </div>
                <div className={`w-10 h-10 rounded-full bg-secondary flex items-center justify-center ${!n.read_at ? "glow-ring-orange" : ""}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default DriverNotifications;
