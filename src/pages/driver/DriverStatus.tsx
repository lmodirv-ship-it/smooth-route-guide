import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Wifi, WifiOff, Signal, MapPin, Activity, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DriverStatus = () => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [todayTrips, setTodayTrips] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: driver } = await supabase.from("drivers").select("id, status").eq("user_id", user.id).maybeSingle();
      if (driver) {
        setIsOnline(driver.status === "active");
        const today = new Date().toISOString().slice(0, 10);
        const { count } = await supabase.from("trips").select("id", { count: "exact", head: true })
          .eq("driver_id", driver.id).gte("created_at", today);
        setTodayTrips(count || 0);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const toggleStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const newStatus = isOnline ? "inactive" : "active";
    await supabase.from("drivers").update({ status: newStatus }).eq("user_id", user.id);
    setIsOnline(!isOnline);
  };

  const statusInfo = [
    { icon: Signal, label: "الحالة", value: isOnline ? "متصل" : "غير متصل", color: isOnline ? "text-success" : "text-destructive" },
    { icon: MapPin, label: "تحديد الموقع", value: "GPS نشط", color: "text-success" },
    { icon: Activity, label: "الرحلات اليوم", value: `${todayTrips} رحلات`, color: "text-primary" },
  ];

  if (loading) return <div className="min-h-screen gradient-dark flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen gradient-dark pb-6" dir="rtl">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)}><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
        <span className="font-bold text-foreground">حالة السائق</span>
        <div className="w-5" />
      </div>

      <div className="px-4 mt-4">
        <motion.button whileTap={{ scale: 0.98 }} onClick={toggleStatus} className="w-full">
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
      </div>
    </div>
  );
};

export default DriverStatus;
