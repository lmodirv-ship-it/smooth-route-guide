import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Calendar, ArrowUpRight, Percent, Store, Car, Bike, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

const COMMISSION_RATE = 0.05;

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
  const [searchEntity, setSearchEntity] = useState("");

  // Per-entity data
  const [stores, setStores] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [deliveryOrders, setDeliveryOrders] = useState<any[]>([]);
  const [driverProfiles, setDriverProfiles] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const fetchAll = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

      const [todayRes, weekRes, monthRes, allRes, deliveryRes, tripsRes, ratesRes, storesRes, driversRes] = await Promise.all([
        supabase.from("earnings").select("amount").gte("date", today),
        supabase.from("earnings").select("amount").gte("date", weekAgo),
        supabase.from("earnings").select("amount").gte("date", monthAgo),
        supabase.from("earnings").select("amount, date, driver_id").gte("date", monthAgo).order("date"),
        supabase.from("delivery_orders").select("total_price, delivery_fee, store_id, store_name, driver_id").eq("status", "delivered").gte("created_at", monthAgo),
        supabase.from("payments").select("amount").eq("status", "completed").gte("created_at", monthAgo),
        supabase.from("commission_rates").select("category, rate"),
        supabase.from("stores").select("id, name, store_code, commission_rate, city, country"),
        supabase.from("drivers").select("id, user_id, driver_code, driver_type"),
      ]);

      setTodayTotal((todayRes.data || []).reduce((s, e) => s + Number(e.amount), 0));
      setWeekTotal((weekRes.data || []).reduce((s, e) => s + Number(e.amount), 0));
      setMonthTotal((monthRes.data || []).reduce((s, e) => s + Number(e.amount), 0));
      setEarningsData(allRes.data || []);
      setDeliveryTotal((deliveryRes.data || []).reduce((s, e) => s + Number(e.total_price || 0), 0));
      setTripsTotal((tripsRes.data || []).reduce((s, e) => s + Number(e.amount || 0), 0));
      setDeliveryOrders(deliveryRes.data || []);
      setStores(storesRes.data || []);
      setDrivers(driversRes.data || []);

      if (ratesRes.data) {
        const map: Record<string, number> = {};
        (ratesRes.data as any[]).forEach((r: any) => { map[r.category] = Number(r.rate); });
        setCommissionRates(map);
      }

      // Fetch driver names
      const driverUserIds = (driversRes.data || []).map((d: any) => d.user_id);
      if (driverUserIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", driverUserIds);
        const map = new Map<string, string>();
        (profiles || []).forEach((p: any) => map.set(p.id, p.name));
        setDriverProfiles(map);
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

  // Per-store earnings
  const storeEarnings = useMemo(() => {
    const map = new Map<string, number>();
    deliveryOrders.forEach((o: any) => {
      if (o.store_id) {
        map.set(o.store_id, (map.get(o.store_id) || 0) + Number(o.total_price || 0));
      }
    });
    return stores.map(s => {
      const revenue = map.get(s.id) || 0;
      const rate = (s.commission_rate ?? 5) / 100;
      return { ...s, revenue, commission: revenue * rate };
    }).filter(s => s.revenue > 0 || searchEntity);
  }, [stores, deliveryOrders, searchEntity]);

  // Per-driver earnings
  const driverEarnings = useMemo(() => {
    const map = new Map<string, number>();
    earningsData.forEach((e: any) => {
      if (e.driver_id) {
        map.set(e.driver_id, (map.get(e.driver_id) || 0) + Number(e.amount));
      }
    });
    const avgRate = Object.values(commissionRates).length > 0
      ? Object.values(commissionRates).reduce((a, b) => a + b, 0) / Object.values(commissionRates).length / 100
      : COMMISSION_RATE;
    return drivers.map(d => {
      const revenue = map.get(d.id) || 0;
      const name = driverProfiles.get(d.user_id) || "سائق";
      return { ...d, name, revenue, commission: revenue * avgRate };
    }).filter(d => d.revenue > 0 || searchEntity);
  }, [drivers, earningsData, driverProfiles, commissionRates, searchEntity]);

  const filteredStores = storeEarnings.filter(s =>
    !searchEntity || s.name?.includes(searchEntity) || (s.store_code || "").includes(searchEntity)
  );

  const filteredDrivers = driverEarnings.filter(d =>
    !searchEntity || d.name?.includes(searchEntity) || (d.driver_code || "").includes(searchEntity)
  );

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

      {/* Search for entity breakdown */}
      <div className="relative max-w-md mr-auto">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={searchEntity} onChange={e => setSearchEntity(e.target.value)} placeholder="بحث بالرقم أو الاسم..." className="pr-10" />
      </div>

      {/* Per-Restaurant Earnings Table */}
      <div className="gradient-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Store className="w-5 h-5 text-orange-500" />
          <h3 className="font-bold text-foreground">أرباح المطاعم والمتاجر</h3>
          <Badge variant="secondary">{filteredStores.length}</Badge>
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الرقم</TableHead>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">المدينة</TableHead>
                <TableHead className="text-right">نسبة العمولة</TableHead>
                <TableHead className="text-right">إجمالي المبيعات</TableHead>
                <TableHead className="text-right">عمولة المنصة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStores.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد بيانات</TableCell></TableRow>
              ) : filteredStores.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-sm font-bold">{s.store_code || "—"}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.city || "—"}</TableCell>
                  <TableCell>{s.commission_rate ?? 5}%</TableCell>
                  <TableCell className="font-bold">{s.revenue.toFixed(2)} د.م</TableCell>
                  <TableCell className="font-bold text-primary">{s.commission.toFixed(2)} د.م</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Per-Driver Earnings Table */}
      <div className="gradient-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Car className="w-5 h-5 text-blue-500" />
          <h3 className="font-bold text-foreground">أرباح السائقين</h3>
          <Badge variant="secondary">{filteredDrivers.length}</Badge>
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الرقم</TableHead>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">النوع</TableHead>
                <TableHead className="text-right">إجمالي الأرباح</TableHead>
                <TableHead className="text-right">عمولة المنصة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDrivers.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد بيانات</TableCell></TableRow>
              ) : filteredDrivers.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-sm font-bold">{d.driver_code || "—"}</TableCell>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={d.driver_type === "delivery" ? "text-info border-info/30" : "text-primary border-primary/30"}>
                      {d.driver_type === "delivery" ? "طلبيات" : d.driver_type === "both" ? "الكل" : "ركاب"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold">{d.revenue.toFixed(2)} د.م</TableCell>
                  <TableCell className="font-bold text-primary">{d.commission.toFixed(2)} د.م</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
