import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Car, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface DriverRecord {
  id: string;
  name: string;
  phone: string;
  status: string;
  rating: number | null;
  driverType: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: "نشط", color: "bg-success/15 text-success border-success/30" },
  inactive: { label: "غير نشط", color: "bg-muted text-muted-foreground border-border" },
  busy: { label: "مشغول", color: "bg-orange-500/15 text-orange-600 border-orange-500/30" },
};

const SupervisorDrivers = () => {
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("drivers")
        .select("id, user_id, status, rating, driver_type")
        .eq("driver_type", "ride")
        .order("created_at", { ascending: false });

      if (!data) { setLoading(false); return; }

      const userIds = data.map(d => d.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, phone")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      setDrivers(data.map(d => {
        const p = profileMap.get(d.user_id);
        return {
          id: d.id,
          name: p?.name || "—",
          phone: p?.phone || "—",
          status: d.status,
          rating: d.rating,
          driverType: d.driver_type,
        };
      }));
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = drivers.filter(d =>
    !search || d.name.includes(search) || d.phone.includes(search)
  );

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">{drivers.length} سائق</Badge>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Car className="w-5 h-5 text-primary" />
          السائقون
        </h2>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو الهاتف" className="pr-10" />
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الاسم</TableHead>
              <TableHead className="text-right">الهاتف</TableHead>
              <TableHead className="text-center">الحالة</TableHead>
              <TableHead className="text-center">التقييم</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">لا يوجد سائقون</TableCell>
              </TableRow>
            ) : filtered.map(d => (
              <TableRow key={d.id}>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
};

export default SupervisorDrivers;
