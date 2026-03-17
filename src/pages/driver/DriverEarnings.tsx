import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, DollarSign, TrendingUp, Calendar, BarChart3, Car } from "lucide-react";

const DriverEarnings = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");

  const data = {
    day: { total: "250 DH", trips: 8, hours: "6:30", avg: "31 DH" },
    week: { total: "1,200 DH", trips: 42, hours: "38:00", avg: "29 DH" },
    month: { total: "3,750 DH", trips: 156, hours: "142:00", avg: "24 DH" },
  };

  const current = data[period];

  const dailyBreakdown = [
    { day: "الإثنين", amount: 280, trips: 9 },
    { day: "الثلاثاء", amount: 310, trips: 11 },
    { day: "الأربعاء", amount: 190, trips: 6 },
    { day: "الخميس", amount: 350, trips: 12 },
    { day: "الجمعة", amount: 420, trips: 14 },
    { day: "السبت", amount: 250, trips: 8 },
    { day: "الأحد", amount: 200, trips: 7 },
  ];

  const maxAmount = Math.max(...dailyBreakdown.map(d => d.amount));

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
          <p className="text-4xl font-bold text-gradient-primary mt-2">{current.total}</p>
        </motion.div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: Car, label: "الرحلات", value: current.trips },
            { icon: Calendar, label: "الساعات", value: current.hours },
            { icon: TrendingUp, label: "المتوسط", value: current.avg },
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
            {dailyBreakdown.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">{d.amount}</span>
                <div className="w-full rounded-t-md gradient-primary transition-all" style={{ height: `${(d.amount / maxAmount) * 100}%` }} />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {dailyBreakdown.map((d, i) => (
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
