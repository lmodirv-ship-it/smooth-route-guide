/**
 * ToolActivity — بطاقات نشاط الأدوات داخل دردشة المسؤول:
 * نتائج القراءة الفورية + بطاقات الموافقة اليدوية على عمليات الكتابة.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Check, X, ChevronDown, ChevronUp, Loader2, Database, ShieldAlert, AlertTriangle, Download } from "lucide-react";

/** تحويل نتيجة أداة إلى CSV (يدعم Excel عبر BOM) وتنزيلها. */
function downloadCsv(name: string, result: any) {
  const rows: any[] = Array.isArray(result)
    ? result
    : (Object.values(result ?? {}).find((v) => Array.isArray(v) && v.length && typeof v[0] === "object") as any[]) ??
      [flatten(result)];
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(flatten(r)))));
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(","), ...rows.map((r) => {
    const f = flatten(r);
    return headers.map((h) => esc(f[h])).join(",");
  })].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function flatten(o: any, prefix = ""): Record<string, any> {
  if (o === null || typeof o !== "object") return { [prefix || "value"]: o };
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(o)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(out, flatten(v, key));
    else out[key] = Array.isArray(v) ? `${v.length} عنصر` : v;
  }
  return out;
}


export type ToolEvent =
  | { type: "tool"; name: string; label: string; kind: "read" | "write"; status: "done" | "error"; args: any; result: any }
  | { type: "approval"; command_id: string; name: string; label: string; risk: string; args: any; description: string; state?: string }
  | { type: "usage"; requests: number; input: number; output: number; cost: number }
  | { type: "error"; message: string };

const RISK_LABEL: Record<string, string> = { low: "منخفض", medium: "متوسط", high: "مرتفع" };

function ArgsList({ args }: { args: any }) {
  const entries = Object.entries(args ?? {});
  if (!entries.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {entries.map(([k, v]) => (
        <Badge key={k} variant="secondary" className="text-[11px] font-normal">
          {k}: {String(v)}
        </Badge>
      ))}
    </div>
  );
}

function ReadCard({ ev }: { ev: Extract<ToolEvent, { type: "tool" }> }) {
  const [open, setOpen] = useState(false);
  const failed = ev.status === "error";
  return (
    <Card className="p-3 border-border/60">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex-1 flex items-center gap-2 text-right">
          <Database className={`h-4 w-4 shrink-0 ${failed ? "text-destructive" : "text-primary"}`} />
          <span className="text-sm font-medium flex-1">{ev.label}</span>
          <Badge variant={failed ? "destructive" : "outline"} className="text-[10px]">
            {failed ? "فشل" : "تم"}
          </Badge>
          {open ? <ChevronUp className="h-4 w-4 opacity-60" /> : <ChevronDown className="h-4 w-4 opacity-60" />}
        </button>
        {!failed && (
          <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-[11px]"
            onClick={() => downloadCsv(ev.name, ev.result)} title="تصدير Excel/CSV">
            <Download className="h-3.5 w-3.5" /> تصدير
          </Button>
        )}
      </div>

      <ArgsList args={ev.args} />
      {open && (
        <pre dir="ltr" className="mt-2 max-h-64 overflow-auto rounded-md bg-muted/50 p-2 text-[11px] leading-relaxed">
          {JSON.stringify(ev.result, null, 2)}
        </pre>
      )}
    </Card>
  );
}

function ApprovalCard({ ev }: { ev: Extract<ToolEvent, { type: "approval" }> }) {
  const [state, setState] = useState<"pending" | "executed" | "rejected" | "failed">("pending");
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<string>("");

  const act = async (action: "approve" | "reject") => {
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-admin-execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ command_id: ev.command_id, action }),
      });
      const out = await resp.json();
      if (!resp.ok || out?.ok === false) {
        setState("failed");
        setDetail(out?.error ?? "فشل التنفيذ");
        toast({ title: "تعذّر التنفيذ", description: out?.error ?? "", variant: "destructive" });
        return;
      }
      if (action === "reject") {
        setState("rejected");
        toast({ title: "تم رفض العملية" });
      } else {
        setState("executed");
        setDetail(out?.result?.summary ?? "");
        toast({ title: "تم التنفيذ", description: out?.result?.summary ?? "" });
      }
    } catch (e: any) {
      setState("failed");
      setDetail(e?.message ?? "");
    } finally {
      setBusy(false);
    }
  };

  const high = ev.risk === "high";
  return (
    <Card className={`p-3 border ${high ? "border-destructive/50" : "border-primary/40"}`}>
      <div className="flex items-center gap-2">
        {high ? <ShieldAlert className="h-4 w-4 text-destructive" /> : <AlertTriangle className="h-4 w-4 text-primary" />}
        <span className="text-sm font-semibold flex-1">{ev.label}</span>
        <Badge variant={high ? "destructive" : "outline"} className="text-[10px]">خطورة: {RISK_LABEL[ev.risk] ?? ev.risk}</Badge>
      </div>
      <p className="text-xs text-muted-foreground mt-1">عملية تعديل — لن تُنفَّذ إلا بموافقتك.</p>
      <ArgsList args={ev.args} />

      {state === "pending" ? (
        <div className="flex gap-2 mt-3">
          <Button size="sm" onClick={() => act("approve")} disabled={busy} className="gap-1">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} تنفيذ
          </Button>
          <Button size="sm" variant="outline" onClick={() => act("reject")} disabled={busy} className="gap-1">
            <X className="h-3.5 w-3.5" /> رفض
          </Button>
        </div>
      ) : (
        <div className="mt-3 text-xs">
          <Badge variant={state === "executed" ? "default" : state === "rejected" ? "secondary" : "destructive"}>
            {state === "executed" ? "نُفِّذت" : state === "rejected" ? "مرفوضة" : "فشلت"}
          </Badge>
          {detail && <span className="ms-2 text-muted-foreground">{detail}</span>}
        </div>
      )}
    </Card>
  );
}

export default function ToolActivity({ items }: { items: ToolEvent[] }) {
  if (!items.length) return null;
  const usage = items.find((i) => i.type === "usage") as Extract<ToolEvent, { type: "usage" }> | undefined;
  return (
    <div className="space-y-2">
      {items.map((ev, i) => {
        if (ev.type === "tool") return <ReadCard key={i} ev={ev} />;
        if (ev.type === "approval") return <ApprovalCard key={ev.command_id} ev={ev} />;
        if (ev.type === "error") return (
          <Card key={i} className="p-3 border-destructive/50 text-sm text-destructive">{ev.message}</Card>
        );
        return null;
      })}
      {usage && (
        <p className="text-[11px] text-muted-foreground text-center">
          {usage.requests} طلب · {usage.input + usage.output} رمز · ≈ {usage.cost}$
        </p>
      )}
    </div>
  );
}
