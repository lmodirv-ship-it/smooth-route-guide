import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Calendar, ArrowUpRight, Percent, Store, Car, Bike } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const COMMISSION_RATE = 0.05; // 5%

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
            <text x={x + bw / 2} y={h - bh - 6} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="9">{d.value.toFixed(1)}</text>
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
  const [deliveryTotal, setDeliveryTotal] = useState(0);
  const [tripsTotal, setTripsTotal] = useState(0);
  const [commissionRates, setCommissionRates] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchAll = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

      const [todayRes, weekRes, monthRes, allRes, deliveryRes, tripsRes, ratesRes] = await Promise.all([
        supabase.from("earnings").select("amount").gte("date", today),
        supabase.from("earnings").select("amount").gte("date", weekAgo),
        supabase.from("earnings").select("amount").gte("date", monthAgo),
        supabase.from("earnings").select("amount, date, driver_id").gte("date", monthAgo).order("date"),
        supabase.from("delivery_orders").select("total_price, delivery_fee").eq("status", "delivered").gte("created_at", monthAgo),
        supabase.from("payments").select("amount").eq("status", "completed").gte("created_at", monthAgo),
        supabase.from("commission_rates").select("category, rate"),
      ]);

      setTodayTotal((todayRes.data || []).reduce((s, e) => s + Number(e.amount), 0));
      setWeekTotal((weekRes.data || []).reduce((s, e) => s + Number(e.amount), 0));
      setMonthTotal((monthRes.data || []).reduce((s, e) => s + Number(e.amount), 0));
      setEarningsData(allRes.data || []);
      setDeliveryTotal((deliveryRes.data || []).reduce((s, e) => s + Number(e.total_price || 0), 0));
      setTripsTotal((tripsRes.data || []).reduce((s, e) => s + Number(e.amount || 0), 0));

      if (ratesRes.data) {
        const map: Record<string, number> = {};
        (ratesRes.data as any[]).forEach((r: any) => { map[r.category] = Number(r.rate); });
        setCommissionRates(map);
      }
    };
    fetchAll();
  }, []);

  const platformCommission = useMemo(() => {
    const avgRate = Object.values(commissionRates).length > 0
      ? Object.values(commissionRates).reduce((a, b) => a + b, 0) / Object.values(commissionRates).length / 100
      : COMMISSION_RATE;
    return {
      fromDrivers: monthTotal * avgRate,
      fromDelivery: deliveryTotal * avgRate,
      fromTrips: tripsTotal * avgRate,
      total: (monthTotal + deliveryTotal + tripsTotal) * avgRate,
      rate: avgRate * 100,
    };
  }, [monthTotal, deliveryTotal, tripsTotal, commissionRates]);

  const chartData = useMemo(() => {
    if (range === "daily") {
      const hours = ["00", "04", "08", "12", "16", "20"];
      return hours.map((hour) => {
        const total = earningsData
          .filter((entry) => entry.date === new Date().toISOString().slice(0, 10))
          .reduce((sum, entry) => sum + Number(entry.amount || 0), 0) / (hours.length || 1);
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
    return Array.from({ length: 4 }, (_, index) => {
      const monthIndex = currentMonth - (3 - index);
      const total = earningsData
        .filter((entry) => new Date(entry.date).getMonth() === monthIndex)
        .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
      return { label: `ش ${index + 1}`, value: total };
    });
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

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "أرباح اليوم", value: todayTotal, icon: DollarSign, color: "text-green-500" },
          { label: "أرباح الأسبوع", value: weekTotal, icon: Calendar, color: "text-blue-500" },
          { label: "أرباح الشهر", value: monthTotal, icon: TrendingUp, color: "text-primary" },
        ].map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="gradient-card rounded-xl p-5 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1 text-xs text-green-500">
                <ArrowUpRight className="w-3 h-3" />+
              </div>
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="text-2xl font-bold text-foreground">{card.value.toLocaleString()} د.م</p>
          </motion.div>
        ))}
      </div>

      {/* Platform Commission Section */}
      <div className="gradient-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">النسبة: {platformCommission.rate.toFixed(1)}%</span>
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">أرباح المنصة (العمولات)</h3>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "من السائقين", value: platformCommission.fromDrivers, icon: Car, color: "bg-blue-500/10 text-blue-500" },
            { label: "من التوصيل", value: platformCommission.fromDelivery, icon: Bike, color: "bg-orange-500/10 text-orange-500" },
            { label: "من الرحلات", value: platformCommission.fromTrips, icon: DollarSign, color: "bg-green-500/10 text-green-500" },
            { label: "إجمالي العمولات", value: platformCommission.total, icon: TrendingUp, color: "bg-primary/10 text-primary" },
          ].map((item, i) => (
            <div key={i} className="rounded-lg border border-border p-3 text-right">
              <div className="flex items-center justify-end gap-2 mb-2">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center`}>
                  <item.icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-lg font-bold text-foreground">{item.value.toFixed(2)} د.م</p>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
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
