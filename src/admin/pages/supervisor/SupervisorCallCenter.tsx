import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Headphones, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface CallRecord {
  id: string;
  request: string;
  status: string;
  createdAt: string;
  userName: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  open: { label: "مفتوح", color: "bg-orange-500/15 text-orange-600 border-orange-500/30" },
  in_progress: { label: "قيد المعالجة", color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  closed: { label: "مغلق", color: "bg-success/15 text-success border-success/30" },
};

const SupervisorCallCenter = () => {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("call_center")
        .select("id, request, status, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!data) { setLoading(false); return; }

      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p.name || "—"]));

      setCalls(data.map(c => ({
        id: c.id,
        request: c.request || "—",
        status: c.status,
        createdAt: c.created_at,
        userName: profileMap.get(c.user_id) || "—",
      })));
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = calls.filter(c =>
    !search || c.userName.includes(search) || c.request.includes(search)
  );

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">{calls.length} طلب</Badge>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Headphones className="w-5 h-5 text-blue-500" />
          مركز الاتصال
        </h2>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو الطلب" className="pr-10" />
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">العميل</TableHead>
              <TableHead className="text-right">الطلب</TableHead>
              <TableHead className="text-center">الحالة</TableHead>
              <TableHead className="text-center">التاريخ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">لا توجد طلبات</TableCell>
              </TableRow>
            ) : filtered.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium text-right">{c.userName}</TableCell>
                <TableCell className="text-right text-muted-foreground text-sm max-w-xs truncate">{c.request}</TableCell>
                <TableCell className="text-center">
                  <Badge className={STATUS_MAP[c.status]?.color || STATUS_MAP.open.color}>
                    {STATUS_MAP[c.status]?.label || c.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-center text-muted-foreground text-xs">
                  {new Date(c.createdAt).toLocaleDateString("ar-MA")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
};

export default SupervisorCallCenter;
