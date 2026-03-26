import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UtensilsCrossed, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface StoreRecord {
  id: string;
  name: string;
  category: string;
  area: string;
  isOpen: boolean;
  rating: number | null;
}

const SupervisorRestaurants = () => {
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("stores")
        .select("id, name, category, area, is_open, rating")
        .order("name");

      setStores((data || []).map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
        area: s.area || "—",
        isOpen: s.is_open,
        rating: s.rating,
      })));
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = stores.filter(s =>
    !search || s.name.includes(search) || s.area.includes(search) || s.category.includes(search)
  );

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">{stores.length} مطعم/متجر</Badge>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5 text-orange-500" />
          المطاعم والمتاجر
        </h2>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو المنطقة" className="pr-10" />
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الاسم</TableHead>
              <TableHead className="text-right">الفئة</TableHead>
              <TableHead className="text-right">المنطقة</TableHead>
              <TableHead className="text-center">الحالة</TableHead>
              <TableHead className="text-center">التقييم</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">لا توجد مطاعم</TableCell>
              </TableRow>
            ) : filtered.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-medium text-right">{s.name}</TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">{s.category}</TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">{s.area}</TableCell>
                <TableCell className="text-center">
                  <Badge className={s.isOpen
                    ? "bg-success/15 text-success border-success/30"
                    : "bg-destructive/15 text-destructive border-destructive/30"
                  }>
                    {s.isOpen ? "مفتوح" : "مغلق"}
                  </Badge>
                </TableCell>
                <TableCell className="text-center text-muted-foreground">
                  {s.rating ? `⭐ ${Number(s.rating).toFixed(1)}` : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
};

export default SupervisorRestaurants;
