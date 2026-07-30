/**
 * صلاحيات أدوات المساعد — تفعيل/تعطيل الأدوات وتحديد سقف يومي لعمليات الكتابة،
 * مع سجلّ آخر العمليات المعلّقة والمنفَّذة.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Database, ShieldAlert } from "lucide-react";

type Perm = {
  id: string; tool_name: string; label: string; description: string | null;
  kind: "read" | "write"; risk: string; is_enabled: boolean; auto_execute: boolean;
  daily_limit: number | null; sort_order: number | null;
};

type Cmd = {
  id: string; tool_name: string | null; command_text: string | null;
  status: string; created_at: string; executed_at: string | null;
};

const RISK: Record<string, string> = { low: "منخفض", medium: "متوسط", high: "مرتفع" };
const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "بانتظار الموافقة", variant: "outline" },
  executed: { label: "نُفِّذت", variant: "default" },
  rejected: { label: "مرفوضة", variant: "secondary" },
  failed: { label: "فشلت", variant: "destructive" },
};

export default function AiToolPermissions() {
  const db = supabase as any;
  const [perms, setPerms] = useState<Perm[]>([]);
  const [cmds, setCmds] = useState<Cmd[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [p, c] = await Promise.all([
      db.from("ai_tool_permissions").select("*").order("sort_order"),
      db.from("smart_assistant_commands").select("id, tool_name, command_text, status, created_at, executed_at")
        .not("tool_name", "is", null).order("created_at", { ascending: false }).limit(30),
    ]);
    setPerms(p.data ?? []);
    setCmds(c.data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = async (row: Perm, values: Partial<Perm>) => {
    setPerms((list) => list.map((x) => (x.id === row.id ? { ...x, ...values } : x)));
    const { error } = await db.from("ai_tool_permissions").update(values).eq("id", row.id);
    if (error) { toast({ title: "تعذّر الحفظ", description: error.message, variant: "destructive" }); load(); }
  };

  const group = (kind: "read" | "write") => perms.filter((p) => p.kind === kind);

  const Table = ({ kind }: { kind: "read" | "write" }) => (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        {kind === "read" ? <Database className="w-4 h-4 text-primary" /> : <ShieldAlert className="w-4 h-4 text-destructive" />}
        <h2 className="text-sm font-semibold flex-1">
          {kind === "read" ? "أدوات القراءة (تنفيذ فوري)" : "أدوات التعديل (تتطلب موافقتك اليدوية)"}
        </h2>
        <Badge variant="outline">{group(kind).length}</Badge>
      </div>
      <div className="divide-y divide-border">
        {group(kind).map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-[200px] flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{p.label}</span>
                {kind === "write" && (
                  <Badge variant={p.risk === "high" ? "destructive" : "outline"} className="text-[10px]">
                    خطورة: {RISK[p.risk] ?? p.risk}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
              <code className="text-[10px] text-muted-foreground/70" dir="ltr">{p.tool_name}</code>
            </div>
            {kind === "write" && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">سقف يومي</span>
                <Input
                  type="number" min={0} className="h-8 w-20"
                  value={p.daily_limit ?? 0}
                  onChange={(e) => patch(p, { daily_limit: Number(e.target.value) })}
                />
              </div>
            )}
            {kind === "write" && (
              <div className="flex items-center gap-2" title="عند التفعيل تُنفَّذ هذه الأداة مباشرة دون طلب موافقتك">
                <span className={`text-xs ${p.auto_execute ? "text-destructive" : "text-muted-foreground"}`}>تنفيذ تلقائي</span>
                <Switch checked={!!p.auto_execute} onCheckedChange={(v) => patch(p, { auto_execute: v })} />
              </div>
            )}
            <Switch checked={p.is_enabled} onCheckedChange={(v) => patch(p, { is_enabled: v })} />

          </div>
        ))}
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">صلاحيات أدوات المساعد</h1>
          <p className="text-xs text-muted-foreground mt-1">
            تحكّم في ما يستطيع المساعد الذكي قراءته أو اقتراح تعديله. كل عملية تعديل تبقى معلّقة حتى تضغط «تنفيذ» في الدردشة.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-1">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} تحديث
        </Button>
      </div>

      <Table kind="read" />
      <Table kind="write" />

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">آخر العمليات المقترحة</h2>
        </div>
        {cmds.length === 0 ? (
          <p className="px-4 py-6 text-xs text-muted-foreground text-center">لا توجد عمليات بعد.</p>
        ) : (
          <div className="divide-y divide-border">
            {cmds.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-xs">
                <Badge variant={STATUS[c.status]?.variant ?? "outline"} className="text-[10px]">
                  {STATUS[c.status]?.label ?? c.status}
                </Badge>
                <span className="flex-1">{c.command_text}</span>
                <span className="text-muted-foreground">{new Date(c.created_at).toLocaleString("ar-MA")}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
