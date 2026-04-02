import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, Search, Package, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import DeliveryOrdersBoard from "@/admin/components/DeliveryOrdersBoard";

interface DeliveryDriver {
  id: string;
  name: string;
  phone: string;
  status: string;
  rating: number | null;
  driver_code: string | null;
  todayDeliveries: number;
  todayEarnings: number;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: "نشط", color: "bg-success/15 text-success border-success/30" },
  inactive: { label: "غير نشط", color: "bg-muted text-muted-foreground border-border" },
  busy: { label: "مشغول", color: "bg-orange-500/15 text-orange-600 border-orange-500/30" },
};

const SupervisorDelivery = () => {
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"drivers" | "orders">("drivers");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("drivers")
        .select("id, user_id, status, rating, driver_code")
        .in("driver_type", ["delivery", "both"])
        .order("created_at", { ascending: false });

      if (!data) { setLoading(false); return; }

      const userIds = data.map(d => d.user_id);
      const driverIds = data.map(d => d.id);
      
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [profilesRes, ordersRes] = await Promise.all([
        supabase.from("profiles").select("id, name, phone").in("id", userIds),
        supabase.from("delivery_orders").select("driver_id, total_price, delivery_fee")
          .in("driver_id", driverIds).eq("status", "delivered")
          .gte("created_at", todayStart.toISOString()),
      ]);

      const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p]));
      
      // Aggregate today stats per driver
      const statsMap = new Map<string, { count: number; earnings: number }>();
      (ordersRes.data || []).forEach((o: any) => {
        const prev = statsMap.get(o.driver_id) || { count: 0, earnings: 0 };
        statsMap.set(o.driver_id, {
          count: prev.count + 1,
          earnings: prev.earnings + (Number(o.delivery_fee) || Number(o.total_price) || 0),
        });
      });

      setDrivers(data.map(d => {
        const p = profileMap.get(d.user_id);
        const stats = statsMap.get(d.id) || { count: 0, earnings: 0 };
        return {
          id: d.id,
          name: p?.name || "—",
          phone: p?.phone || "—",
          status: d.status,
          rating: d.rating,
          driver_code: d.driver_code,
          todayDeliveries: stats.count,
          todayEarnings: stats.earnings,
        };
      }));
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = drivers.filter(d =>
    !search || d.name.includes(search) || d.phone.includes(search) || (d.driver_code || "").includes(search)
  );

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => setTab("drivers")}
            className={`text-xs px-4 py-2 rounded-lg transition-colors ${tab === "drivers" ? "bg-info/20 text-info border border-info/30" : "bg-secondary text-muted-foreground"}`}>
            🏍️ سائقو التوصيل ({drivers.length})
          </button>
          <button onClick={() => setTab("orders")}
            className={`text-xs px-4 py-2 rounded-lg transition-colors ${tab === "orders" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-secondary text-muted-foreground"}`}>
            📦 طلبات التوصيل
          </button>
        </div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Send className="w-5 h-5 text-success" />
          إدارة التوصيل
        </h2>
      </div>

      {tab === "orders" ? (
        <DeliveryOrdersBoard title="طلبات التوصيل - المشرف" />
      ) : (
        <>
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو الهاتف أو الرمز" className="pr-10" />
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الرمز</TableHead>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">الهاتف</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                  <TableHead className="text-center">التقييم</TableHead>
                  <TableHead className="text-center">توصيلات اليوم</TableHead>
                  <TableHead className="text-center">أرباح اليوم</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">لا يوجد سائقو توصيل</TableCell>
                  </TableRow>
                ) : filtered.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs font-bold text-primary">{d.driver_code || "—"}</TableCell>
                    <TableCell className="font-medium text-right">{d.name}</TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">{d.phone}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={STATUS_MAP[d.status]?.color || STATUS_MAP.inactive.color}>
                        {STATUS_MAP[d.status]?.label || d.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {d.rating ? `⭐ ${Number(d.rating).toFixed(1)}` : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="flex items-center justify-center gap-1 text-xs">
                        <Package className="w-3.5 h-3.5 text-emerald-400" />
                        {d.todayDeliveries}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="flex items-center justify-center gap-1 text-xs font-bold">
                        <TrendingUp className="w-3.5 h-3.5 text-primary" />
                        {d.todayEarnings} DH
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default SupervisorDelivery;
