import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, DollarSign, TrendingUp, Calendar, Car, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { driverNetEarnings, COMMISSION_RATE } from "@/lib/pricing";

const DriverEarnings = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: driver } = await supabase.from("drivers").select("id").eq("user_id", user.id).maybeSingle();
      if (!driver) { setLoading(false); return; }

      const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data } = await supabase.from("trips")
        .select("fare, created_at, status, start_location, end_location")
        .eq("driver_id", driver.id).eq("status", "completed")
        .gte("created_at", monthAgo).order("created_at", { ascending: false });
      setTrips(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const weekAgo = Date.now() - 7 * 86400000;

    const dayTrips = trips.filter(t => t.created_at.slice(0, 10) === todayStr);
    const weekTrips = trips.filter(t => new Date(t.created_at).getTime() >= weekAgo);

    const sum = (arr: any[]) => driverNetEarnings(arr.reduce((s, t) => s + Number(t.fare || 0), 0));

    return {
      day: { total: sum(dayTrips), trips: dayTrips.length, avg: dayTrips.length > 0 ? Math.round(sum(dayTrips) / dayTrips.length) : 0 },
      week: { total: sum(weekTrips), trips: weekTrips.length, avg: weekTrips.length > 0 ? Math.round(sum(weekTrips) / weekTrips.length) : 0 },
      month: { total: sum(trips), trips: trips.length, avg: trips.length > 0 ? Math.round(sum(trips) / trips.length) : 0 },
    };
  }, [trips]);

  const current = stats[period];

  // Weekly breakdown
  const weeklyBreakdown = useMemo(() => {
    const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const grouped = new Map<number, { amount: number; trips: number }>();
    const weekAgo = Date.now() - 7 * 86400000;
    trips.filter(t => new Date(t.created_at).getTime() >= weekAgo).forEach(t => {
      const day = new Date(t.created_at).getDay();
      const existing = grouped.get(day) || { amount: 0, trips: 0 };
      grouped.set(day, { amount: existing.amount + Number(t.fare || 0), trips: existing.trips + 1 });
    });
    return days.map((day, i) => ({ day, amount: grouped.get(i)?.amount || 0, trips: grouped.get(i)?.trips || 0 }));
  }, [trips]);

  const maxAmount = Math.max(...weeklyBreakdown.map(d => d.amount), 1);

  if (loading) return <div className="min-h-screen gradient-dark flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen gradient-dark pb-24" dir="rtl">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate("/driver")}><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
        <span className="font-bold text-foreground">الأرباح</span>
        <div className="w-5" />
      </div>

      <div className="px-4 mt-4">
        <div className="flex gap-2 mb-4">
          {([["day", "اليوم"], ["week", "الأسبوع"], ["month", "الشهر"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setPeriod(key)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${period === key ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {label}
            </button>
          ))}
        </div>

        <motion.div key={period} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="gradient-card rounded-2xl p-6 border border-border text-center mb-4">
          <p className="text-muted-foreground text-sm">إجمالي الأرباح</p>
          <p className="text-4xl font-bold text-gradient-primary mt-2">{current.total} DH</p>
        </motion.div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: Car, label: "الرحلات", value: current.trips },
            { icon: Calendar, label: "المتوسط", value: `${current.avg} DH` },
            { icon: TrendingUp, label: "الإجمالي", value: `${current.total} DH` },
          ].map((s, i) => (
            <div key={i} className="gradient-card rounded-xl p-3 border border-border text-center">
              <s.icon className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-sm font-bold text-foreground mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        <h3 className="text-foreground font-bold mb-3">تفاصيل الأسبوع</h3>
        <div className="gradient-card rounded-xl p-4 border border-border">
          <div className="flex items-end gap-2 h-32 mb-3">
            {weeklyBreakdown.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">{d.amount}</span>
                <div className="w-full rounded-t-md gradient-primary transition-all" style={{ height: `${(d.amount / maxAmount) * 100}%`, minHeight: d.amount > 0 ? "4px" : "0" }} />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {weeklyBreakdown.map((d, i) => (
              <div key={i} className="flex-1 text-center">
                <span className="text-[10px] text-muted-foreground">{d.day.slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverEarnings;
