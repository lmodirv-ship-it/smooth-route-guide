/**
 * فواتير الذكاء الاصطناعي / قياس الاستهلاك — مشترك بين الصفحتين.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Props = { title: string; subtitle: string; groupBy: "model" | "day" };

export default function AiUsageView({ title, subtitle, groupBy }: Props) {
  const db = supabase as any;
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await db.from("ai_usage_log").select("*").order("usage_date", { ascending: false }).limit(2000);
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const grouped = useMemo(() => {
    const map = new Map<string, { key: string; requests: number; input: number; output: number; cost: number }>();
    rows.forEach((r) => {
      const key = groupBy === "model" ? String(r.model_ref) : String(r.usage_date);
      const cur = map.get(key) ?? { key, requests: 0, input: 0, output: 0, cost: 0 };
      cur.requests += r.requests ?? 0;
      cur.input += r.input_tokens ?? 0;
      cur.output += r.output_tokens ?? 0;
      cur.cost += Number(r.cost ?? 0);
      map.set(key, cur);
    });
    return [...map.values()].sort((a, b) => b.cost - a.cost);
  }, [rows, groupBy]);

  const totals = useMemo(() => grouped.reduce(
    (a, g) => ({ requests: a.requests + g.requests, tokens: a.tokens + g.input + g.output, cost: a.cost + g.cost }),
    { requests: 0, tokens: 0, cost: 0 },
  ), [grouped]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4 me-1" /> تحديث</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">إجمالي الطلبات</div><div className="text-2xl font-bold">{totals.requests}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">إجمالي التوكنات</div><div className="text-2xl font-bold">{totals.tokens}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">التكلفة</div><div className="text-2xl font-bold">{totals.cost.toFixed(2)}</div></Card>
      </div>

      <div className="rounded-xl border border-border bg-card/40 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="p-2 text-start w-10">#</th>
              <th className="p-2 text-start">{groupBy === "model" ? "النموذج" : "اليوم"}</th>
              <th className="p-2 text-start w-28">الطلبات</th>
              <th className="p-2 text-start w-32">توكنات الإدخال</th>
              <th className="p-2 text-start w-32">توكنات الإخراج</th>
              <th className="p-2 text-start w-28">التكلفة</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="p-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>}
            {!loading && grouped.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">لا يوجد استهلاك مسجّل بعد</td></tr>
            )}
            {!loading && grouped.map((g, i) => (
              <tr key={g.key} className="border-t border-border/50 hover:bg-muted/20">
                <td className="p-2 text-muted-foreground">{i + 1}</td>
                <td className="p-2 font-mono text-xs">{g.key}</td>
                <td className="p-2">{g.requests}</td>
                <td className="p-2">{g.input}</td>
                <td className="p-2">{g.output}</td>
                <td className="p-2">{g.cost.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
