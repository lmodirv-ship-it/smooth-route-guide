/**
 * مفاتيح المزوّدين — إضافة/فحص/استيراد نماذج مزوّدي الذكاء الاصطناعي.
 * المفاتيح تُخزَّن في `ai_provider_keys` (مسموح للمسؤولين فقط) وتظهر مجموعاتها في صفحة الدردشة الإدارية.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, ExternalLink, KeyRound, Wifi, Download, RefreshCw } from "lucide-react";
import { AI_PROVIDERS, providerInfo, providerLogo } from "@/admin/data/aiProviders";

const db = supabase as any;

function mask(key?: string | null) {
  if (!key) return "—";
  if (key.length <= 10) return "•••••";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

export default function ProviderKeysSection() {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({ provider: "openai" });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.from("ai_provider_keys").select("*").order("provider");
    if (error) toast({ title: "تعذّر تحميل المفاتيح", description: error.message, variant: "destructive" });
    setRows(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!draft.api_key?.trim()) return toast({ title: "أدخل المفتاح", variant: "destructive" });
    const info = providerInfo(draft.provider);
    const { error } = await db.from("ai_provider_keys").upsert({
      provider: draft.provider || "openai",
      label: draft.label || info?.label || draft.provider,
      api_key: draft.api_key.trim(),
      base_url: draft.base_url?.trim() || null,
      is_enabled: true,
      status: "unknown",
    }, { onConflict: "provider" });
    if (error) return toast({ title: "تعذّرت الإضافة", description: error.message, variant: "destructive" });
    setDraft({ provider: draft.provider });
    toast({ title: "تمت إضافة المفتاح" });
    load();
  };

  const patch = async (id: string, values: Record<string, any>) => {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...values } : r)));
    const { error } = await db.from("ai_provider_keys").update(values).eq("id", id);
    if (error) { toast({ title: "تعذّر الحفظ", description: error.message, variant: "destructive" }); load(); }
  };

  const remove = async (id: string) => {
    const { error } = await db.from("ai_provider_keys").delete().eq("id", id);
    if (error) return toast({ title: "تعذّر الحذف", description: error.message, variant: "destructive" });
    setRows((p) => p.filter((r) => r.id !== id));
  };

  const call = async (row: Record<string, any>, action: "test" | "import") => {
    setBusy(`${row.id}:${action}`);
    const { data, error } = await supabase.functions.invoke("ai-provider-keys", {
      body: { action, key_id: row.id },
    });
    setBusy(null);
    if (error) return toast({ title: "فشل الاتصال بالخدمة", description: error.message, variant: "destructive" });
    if (!(data as any)?.ok) {
      toast({ title: "المفتاح غير صالح", description: (data as any)?.error ?? "تحقق من المفتاح أو العنوان", variant: "destructive" });
    } else if (action === "test") {
      toast({ title: `مفتاح صالح ✅ (${(data as any).ms}ms)`, description: `عدد النماذج المتاحة: ${(data as any).models_count}` });
    } else {
      toast({ title: `تم استيراد ${(data as any).imported} نموذج`, description: "ستظهر مباشرة في قائمة النماذج بصفحة الدردشة" });
    }
    load();
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <KeyRound className="w-4 h-4" /> مفاتيح المزوّدين — تظهر نماذجها في صفحة الدردشة (AI with Admin)
        </h2>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4 me-1" /> تحديث</Button>
      </div>

      {/* add form */}
      <div className="rounded-xl border border-border bg-card/40 p-4 grid gap-2 md:grid-cols-[200px_1fr_220px_auto]">
        <Select value={draft.provider} onValueChange={(v) => setDraft((d) => ({ ...d, provider: v }))}>
          <SelectTrigger><SelectValue placeholder="المزوّد" /></SelectTrigger>
          <SelectContent className="max-h-72">
            {AI_PROVIDERS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <span className="flex items-center gap-2">
                  <img src={providerLogo(p.id)} alt="" width={16} height={16} loading="lazy" className="rounded" />
                  {p.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="password" placeholder="API Key" value={draft.api_key ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, api_key: e.target.value }))} />
        <Input placeholder="Base URL (اختياري)" value={draft.base_url ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, base_url: e.target.value }))} />
        <Button onClick={add}><Plus className="w-4 h-4 me-1" /> إضافة</Button>
        <p className="md:col-span-4 text-[11px] text-muted-foreground">
          احصل على المفتاح من{" "}
          <a className="text-primary inline-flex items-center gap-1" target="_blank" rel="noreferrer"
            href={providerInfo(draft.provider)?.keysUrl || "#"}>
            {providerInfo(draft.provider)?.label} <ExternalLink className="w-3 h-3" />
          </a>{" "}
          — يُخزَّن مشفَّر الوصول (المسؤولون فقط) ولا يُعرض كاملاً بعد الحفظ.
        </p>
      </div>

      {/* table */}
      <div className="rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="p-2 text-start">المزوّد</th>
              <th className="p-2 text-start">المفتاح</th>
              <th className="p-2 text-start">العنوان</th>
              <th className="p-2 text-start">الحالة</th>
              <th className="p-2 text-start">النماذج</th>
              <th className="p-2 text-start">مُفعّل</th>
              <th className="p-2 text-start">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="p-6 text-center"><Loader2 className="w-4 h-4 animate-spin inline" /></td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">لا توجد مفاتيح بعد — أضف مفتاح مزوّد أعلاه.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-2">
                  <span className="flex items-center gap-2">
                    <img src={providerLogo(r.provider)} alt="" width={20} height={20} loading="lazy" className="rounded" />
                    <span className="font-medium">{r.label || providerInfo(r.provider)?.label || r.provider}</span>
                  </span>
                </td>
                <td className="p-2 font-mono">{mask(r.api_key)}</td>
                <td className="p-2 font-mono text-[10px] text-muted-foreground">{r.base_url || "افتراضي"}</td>
                <td className="p-2">
                  <Badge variant={r.status === "connected" ? "default" : r.status === "error" ? "destructive" : "outline"}>
                    {r.status === "connected" ? "متصل" : r.status === "error" ? "خطأ" : "غير مفحوص"}
                  </Badge>
                </td>
                <td className="p-2">{r.models_count ?? 0}</td>
                <td className="p-2">
                  <Switch checked={!!r.is_enabled} onCheckedChange={(v) => patch(r.id, { is_enabled: v })} />
                </td>
                <td className="p-2">
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => call(r, "test")} disabled={busy === `${r.id}:test`}>
                      {busy === `${r.id}:test` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                      <span className="ms-1">فحص</span>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => call(r, "import")} disabled={busy === `${r.id}:import`}>
                      {busy === `${r.id}:import` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      <span className="ms-1">جلب النماذج</span>
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(r.id)} title="حذف">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
