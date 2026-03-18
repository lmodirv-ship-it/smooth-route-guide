import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Calendar, ArrowUpRight } from "lucide-react";
import { supabase } from "@/lib/firestoreClient";

const SimpleBarChart = ({ data, color }: { data: { label: string; value: number }[]; color: string }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  const bw = 32, gap = 12, h = 200;
  const cw = data.length * (bw + gap);
  return (
    <svg width="100%" height={h + 30} viewBox={`0 0 ${cw + 20} ${h + 30}`} className="w-full">
      {data.map((d, i) => {
        const bh = (d.value / max) * h;
        const x = 10 + i * (bw + gap);
        return (
          <g key={i}>
            <rect x={x} y={h - bh} width={bw} height={bh} rx={4} fill={color} opacity={0.85} style={{ transition: "all 0.5s ease" }} />
            <text x={x + bw / 2} y={h + 18} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">{d.label}</text>
            <text x={x + bw / 2} y={h - bh - 6} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="9">{d.value}</text>
          </g>
        );
      })}
    </svg>
  );
};

const AdminEarnings = () => {
  const [range, setRange] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [todayTotal, setTodayTotal] = useState(0);
  const [weekTotal, setWeekTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);
  const [earningsData, setEarningsData] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const [todayRes, weekRes, monthRes, allRes] = await Promise.all([
        supabase.from("earnings").select("amount").gte("date", today),
        supabase.from("earnings").select("amount").gte("date", weekAgo),
        supabase.from("earnings").select("amount").gte("date", monthAgo),
        supabase.from("earnings").select("amount, date, driver_id").gte("date", monthAgo).order("date"),
      ]);
      setTodayTotal((todayRes.data || []).reduce((s, e) => s + Number(e.amount), 0));
      setWeekTotal((weekRes.data || []).reduce((s, e) => s + Number(e.amount), 0));
      setMonthTotal((monthRes.data || []).reduce((s, e) => s + Number(e.amount), 0));
      setEarningsData(allRes.data || []);
    };
    fetch();
  }, []);

  const chartData = useMemo(() => {
    if (range === "daily") {
      const hours = ["00", "04", "08", "12", "16", "20"];
      return hours.map((hour) => {
        const total = earningsData
          .filter((entry) => entry.date === new Date().toISOString().slice(0, 10))
          .filter((entry) => {
            const date = new Date(`${entry.date}T${hour}:00:00`);
            return date.getHours() === Number(hour);
          })
          .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
        return { label: `${hour}:00`, value: total };
      });
    }

    if (range === "weekly") {
      const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      const grouped = new Map<number, number>();
      earningsData.forEach((e) => {
        const dayIdx = new Date(e.date).getDay();
        grouped.set(dayIdx, (grouped.get(dayIdx) || 0) + Number(e.amount));
      });
      return days.map((label, index) => ({ label: label.slice(0, 3), value: grouped.get(index) || 0 }));
    }

    const currentMonth = new Date().getMonth();
    const monthly = Array.from({ length: 4 }, (_, index) => {
      const monthIndex = currentMonth - (3 - index);
      const total = earningsData
        .filter((entry) => new Date(entry.date).getMonth() === monthIndex)
        .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
      return { label: `ش ${index + 1}`, value: total };
    });
    return monthly;
  }, [range, earningsData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">تحليل الأرباح</h1>
          <TrendingUp className="w-6 h-6 text-primary" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "أرباح اليوم", value: todayTotal, icon: DollarSign, color: "text-success", trend: "+" },
          { label: "أرباح الأسبوع", value: weekTotal, icon: Calendar, color: "text-info", trend: "+" },
          { label: "أرباح الشهر", value: monthTotal, icon: TrendingUp, color: "text-primary", trend: "+" },
        ].map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="gradient-card rounded-xl p-5 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1 text-xs text-success">
                <ArrowUpRight className="w-3 h-3" />{card.trend}
              </div>
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="text-2xl font-bold text-foreground">{card.value.toLocaleString()} ر.س</p>
          </motion.div>
        ))}
      </div>

      <div className="gradient-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            {(["daily", "weekly", "monthly"] as const).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`text-xs px-4 py-2 rounded-lg transition-colors ${range === r ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {r === "daily" ? "يومي" : r === "weekly" ? "أسبوعي" : "شهري"}
              </button>
            ))}
          </div>
          <h3 className="font-bold text-foreground">الرسم البياني</h3>
        </div>
        <div className="h-64">
          <SimpleBarChart data={chartData} color="hsl(var(--primary))" />
        </div>
      </div>
    </div>
  );
};

export default AdminEarnings;
