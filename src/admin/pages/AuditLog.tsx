/**
 * سجل الإجراءات — قراءة فقط من db_audit_log عبر دالة admin_get_recent_audit.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function AuditLog() {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("admin_get_recent_audit", { _limit: 300 });
    if (error) toast({ title: "تعذّر التحميل", description: error.message, variant: "destructive" });
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => !search.trim() || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">سجل الإجراءات</h1>
          <p className="text-xs text-muted-foreground mt-1">آخر التغييرات الحسّاسة في قاعدة البيانات.</p>
        </div>
        <div className="flex gap-2">
          <Input className="h-9 w-[200px]" placeholder="بحث…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4 me-1" /> تحديث</Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/40 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="p-2 text-start w-10">#</th>
              <th className="p-2 text-start">الجدول</th>
              <th className="p-2 text-start w-28">العملية</th>
              <th className="p-2 text-start">السجل</th>
              <th className="p-2 text-start">المنفّذ</th>
              <th className="p-2 text-start w-44">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="p-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">لا توجد سجلات</td></tr>
            )}
            {!loading && filtered.map((r, i) => (
              <tr key={r.id} className="border-t border-border/50 hover:bg-muted/20">
                <td className="p-2 text-muted-foreground">{i + 1}</td>
                <td className="p-2 font-mono text-xs">{r.table_name}</td>
                <td className="p-2">
                  <Badge variant={r.operation === "DELETE" ? "destructive" : r.operation === "INSERT" ? "default" : "secondary"}>
                    {r.operation}
                  </Badge>
                </td>
                <td className="p-2 font-mono text-[11px] truncate max-w-[220px]">{r.row_id}</td>
                <td className="p-2 font-mono text-[11px] truncate max-w-[220px]">{r.actor_id ?? "—"}</td>
                <td className="p-2 text-xs">{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
