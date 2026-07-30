/**
 * إدارة نماذج الذكاء الاصطناعي العالمية.
 * جدول موحّد: شعار حقيقي، حالة، حدود، مفتاح API، تفعيل، اختبار.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, RefreshCw, Trash2, Zap, KeyRound, ExternalLink, Power, PowerOff } from "lucide-react";
import { AI_PROVIDERS, providerInfo, providerLogo } from "@/admin/data/aiProviders";

type Model = Record<string, any>;

const CATEGORY_LABEL: Record<string, string> = {
  llm: "نص", image: "صور", video: "فيديو", tts: "صوت", stt: "تفريغ", embedding: "تضمين",
};

export default function AiModels() {
  const db = supabase as any;
  const [rows, setRows] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [testing, setTesting] = useState<string | null>(null);
  const [keyRow, setKeyRow] = useState<Model | null>(null);
  const [keyValue, setKeyValue] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({ provider: "google" });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db
      .from("ai_models").select("*")
      .order("priority", { ascending: true }).order("display_name", { ascending: true }).limit(500);
    if (error) toast({ title: "خطأ في التحميل", description: error.message, variant: "destructive" });
    setRows(data ?? []);
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) => `${r.display_name} ${r.provider} ${r.model_id}`.toLowerCase().includes(s));
  }, [rows, search]);

  const patch = async (id: string, values: Record<string, any>) => {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...values } : r)));
    const { error } = await db.from("ai_models").update(values).eq("id", id);
    if (error) { toast({ title: "تعذّر الحفظ", description: error.message, variant: "destructive" }); load(); }
  };

  const remove = async (id: string) => {
    const { error } = await db.from("ai_models").delete().eq("id", id);
    if (error) return toast({ title: "تعذّر الحذف", description: error.message, variant: "destructive" });
    load();
  };

  const addModel = async () => {
    if (!draft.model_id || !draft.display_name) {
      return toast({ title: "أدخل model_id والاسم المعروض", variant: "destructive" });
    }
    const info = providerInfo(draft.provider);
    const { error } = await db.from("ai_models").insert({
      provider: draft.provider || "google",
      model_id: draft.model_id,
      display_name: draft.display_name,
      base_url: draft.base_url || null,
      secret_name: draft.secret_name || null,
      website_url: info?.keysUrl || null,
      logo_key: draft.provider,
      category: draft.category || "llm",
    });
    if (error) return toast({ title: "تعذّرت الإضافة", description: error.message, variant: "destructive" });
    setDraft({ provider: draft.provider });
    toast({ title: "تمت إضافة النموذج" });
    load();
  };

  const bulk = async (value: boolean) => {
    const { error } = await db.from("ai_models").update({ is_enabled: value, status: value ? "enabled" : "disabled" }).not("id", "is", null);
    if (error) return toast({ title: "تعذّر التحديث", description: error.message, variant: "destructive" });
    load();
  };

  const testModel = async (row: Model) => {
    setTesting(row.id);
    try {
      const { data, error } = await supabase.functions.invoke("ai-model-verify", {
        body: { model_row_id: row.id },
      });
      if (error) throw error;
      const ok = !!(data as any)?.ok;
      toast({
        title: ok ? "الاتصال ناجح ✅" : "فشل الاختبار ❌",
        description: (data as any)?.message ?? "",
        variant: ok ? "default" : "destructive",
      });
      load();
    } catch (e: any) {
      toast({ title: "فشل الاختبار", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setTesting(null);
    }
  };

  const saveKey = async () => {
    if (!keyRow) return;
    await patch(keyRow.id, { api_key: keyValue || null });
    setKeyRow(null); setKeyValue("");
    toast({ title: "تم حفظ المفتاح" });
  };

  const mask = (k?: string | null) => (k ? `${k.slice(0, 3)}••••${k.slice(-4)}` : "—");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">إدارة نماذج وأدوات الذكاء الاصطناعي</h1>
          <p className="text-xs text-muted-foreground mt-1">
            اضغط على شعار المزوّد لفتح صفحة الحصول على المفتاح، ثم اضغط «مفتاح» لإدخاله وتفعيل النموذج داخل المنصة.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => bulk(true)}><Power className="w-4 h-4 me-1" /> تشغيل الكل</Button>
          <Button size="sm" variant="destructive" onClick={() => bulk(false)}><PowerOff className="w-4 h-4 me-1" /> تعطيل الكل</Button>
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4 me-1" /> تحديث</Button>
        </div>
      </div>

      {/* Quick add */}
      <div className="rounded-xl border border-primary/40 bg-card/60 p-3 flex flex-wrap items-center gap-2">
        <Select value={draft.provider} onValueChange={(v) => setDraft((d) => ({ ...d, provider: v }))}>
          <SelectTrigger className="h-9 w-[190px]"><SelectValue placeholder="المزوّد" /></SelectTrigger>
          <SelectContent className="max-h-72">
            {AI_PROVIDERS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input className="h-9 w-[190px]" placeholder="model_id" value={draft.model_id ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, model_id: e.target.value }))} />
        <Input className="h-9 w-[190px]" placeholder="الاسم المعروض" value={draft.display_name ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, display_name: e.target.value }))} />
        <Input className="h-9 w-[170px]" placeholder="Base URL (اختياري)" value={draft.base_url ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, base_url: e.target.value }))} />
        <Input className="h-9 w-[160px]" placeholder="اسم السر (اختياري)" value={draft.secret_name ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, secret_name: e.target.value }))} />
        <Button size="sm" onClick={addModel}><Plus className="w-4 h-4 me-1" /> إضافة</Button>
        <Input className="h-9 w-[180px] ms-auto" placeholder="بحث…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card/40 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="p-2 text-start w-10">#</th>
              <th className="p-2 text-start">النموذج</th>
              <th className="p-2 text-start w-20">النوع</th>
              <th className="p-2 text-start w-20">مجاني</th>
              <th className="p-2 text-start w-24">الحالة</th>
              <th className="p-2 text-start w-24">المفتاح</th>
              <th className="p-2 text-start w-20">RPM</th>
              <th className="p-2 text-start w-20">يومي</th>
              <th className="p-2 text-start w-20">شهري</th>
              <th className="p-2 text-start w-20">الأولوية</th>
              <th className="p-2 text-start w-20">تفعيل</th>
              <th className="p-2 text-start w-44">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={12} className="p-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={12} className="p-6 text-center text-muted-foreground">لا توجد نماذج — استعمل زر الإضافة أعلاه</td></tr>
            )}
            {!loading && filtered.map((r, i) => {
              const info = providerInfo(r.provider);
              return (
                <tr key={r.id} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="p-2 text-muted-foreground">{i + 1}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <a href={info?.keysUrl || r.website_url || "#"} target="_blank" rel="noopener noreferrer" title="الحصول على مفتاح API">
                        <img src={providerLogo(r.provider)} alt={`${r.provider} logo`} width={24} height={24}
                          loading="lazy" className="rounded" />
                      </a>
                      <div>
                        <div className="font-medium">{r.display_name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{r.provider} · {r.model_id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-2"><Badge variant="outline">{CATEGORY_LABEL[r.category] ?? r.category}</Badge></td>
                  <td className="p-2">
                    <Switch checked={!!r.is_free} onCheckedChange={(v) => patch(r.id, { is_free: v })} />
                  </td>
                  <td className="p-2">
                    <Badge variant={r.last_test_ok === true ? "default" : r.last_test_ok === false ? "destructive" : "secondary"}>
                      {r.last_test_ok === true ? "مُشغّل" : r.last_test_ok === false ? "فشل" : "غير مُختبر"}
                    </Badge>
                  </td>
                  <td className="p-2 font-mono text-[11px]">{mask(r.api_key)}</td>
                  {(["rpm_limit", "daily_limit", "monthly_limit", "priority"] as const).map((col) => (
                    <td className="p-2" key={col}>
                      <Input
                        className="h-8 w-16 text-center"
                        type="number"
                        value={r[col] ?? ""}
                        onChange={(e) => setRows((p) => p.map((x) => x.id === r.id ? { ...x, [col]: e.target.value } : x))}
                        onBlur={(e) => patch(r.id, { [col]: e.target.value === "" ? null : Number(e.target.value) })}
                      />
                    </td>
                  ))}
                  <td className="p-2">
                    <Switch checked={!!r.is_enabled}
                      onCheckedChange={(v) => patch(r.id, { is_enabled: v, status: v ? "enabled" : "disabled" })} />
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" title="اختبار" onClick={() => testModel(r)} disabled={testing === r.id}>
                        {testing === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setKeyRow(r); setKeyValue(r.api_key ?? ""); }}>
                        <KeyRound className="w-4 h-4 me-1" /> مفتاح
                      </Button>
                      <a href={info?.keysUrl || "#"} target="_blank" rel="noopener noreferrer">
                        <Button size="icon" variant="ghost" title="موقع المزوّد"><ExternalLink className="w-4 h-4" /></Button>
                      </a>
                      <Button size="icon" variant="ghost" onClick={() => remove(r.id)} title="حذف">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!keyRow} onOpenChange={(o) => !o && setKeyRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>مفتاح API — {keyRow?.display_name}</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">
            يُخزَّن المفتاح في قاعدة البيانات محميًا بصلاحية المسؤول فقط، ولا يُستعمل إلا داخل الخادم.
          </p>
          <Input value={keyValue} onChange={(e) => setKeyValue(e.target.value)} placeholder="sk-..." type="password" />
          {keyRow && (
            <a className="text-xs text-primary underline" target="_blank" rel="noopener noreferrer"
              href={providerInfo(keyRow.provider)?.keysUrl || "#"}>
              الحصول على المفتاح من موقع المزوّد ↗
            </a>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setKeyRow(null)}>إلغاء</Button>
            <Button onClick={saveKey}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
