/**
 * إدارة نماذج الذكاء الاصطناعي العالمية.
 * لوحة متطوّرة: إحصائيات حيّة، فلاتر متعددة، تحديد جماعي، اختبار جماعي، تصدير CSV،
 * جدول موحّد (شعار حقيقي، حالة، حدود، مفتاح API، تفعيل، اختبار).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, Plus, RefreshCw, Trash2, Zap, KeyRound, ExternalLink, Power, PowerOff,
  Download, ArrowUpDown, Sparkles, ShieldCheck, ShieldAlert, Layers,
} from "lucide-react";
import { AI_PROVIDERS, providerInfo, providerLogo } from "@/admin/data/aiProviders";

type Model = Record<string, any>;

const CATEGORY_LABEL: Record<string, string> = {
  llm: "نص", image: "صور", video: "فيديو", tts: "صوت", stt: "تفريغ", embedding: "تضمين",
};

type SortKey = "priority" | "display_name" | "provider" | "category" | "status";

export default function AiModels() {
  const db = supabase as any;
  const [rows, setRows] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [testing, setTesting] = useState<string | null>(null);
  const [bulkTesting, setBulkTesting] = useState(false);
  const [keyRow, setKeyRow] = useState<Model | null>(null);
  const [keyValue, setKeyValue] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({ provider: "google" });
  const [fProvider, setFProvider] = useState("all");
  const [fCategory, setFCategory] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db
      .from("ai_models").select("*")
      .order("priority", { ascending: true }).order("display_name", { ascending: true }).limit(1000);
    if (error) toast({ title: "خطأ في التحميل", description: error.message, variant: "destructive" });
    setRows(data ?? []);
    setSelected(new Set());
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => ({
    total: rows.length,
    enabled: rows.filter((r) => r.is_enabled).length,
    free: rows.filter((r) => r.is_free).length,
    needKey: rows.filter((r) => !r.is_free && !r.api_key).length,
    ok: rows.filter((r) => r.last_test_ok === true).length,
    failed: rows.filter((r) => r.last_test_ok === false).length,
  }), [rows]);

  const providersInUse = useMemo(
    () => Array.from(new Set(rows.map((r) => r.provider))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (s && !`${r.display_name} ${r.provider} ${r.model_id}`.toLowerCase().includes(s)) return false;
      if (fProvider !== "all" && r.provider !== fProvider) return false;
      if (fCategory !== "all" && r.category !== fCategory) return false;
      if (fStatus === "enabled" && !r.is_enabled) return false;
      if (fStatus === "disabled" && r.is_enabled) return false;
      if (fStatus === "free" && !r.is_free) return false;
      if (fStatus === "needkey" && (r.is_free || r.api_key)) return false;
      if (fStatus === "ok" && r.last_test_ok !== true) return false;
      if (fStatus === "failed" && r.last_test_ok !== false) return false;
      return true;
    });
    out = [...out].sort((a, b) => {
      const va = sortKey === "status" ? (a.is_enabled ? 1 : 0) : (a[sortKey] ?? "");
      const vb = sortKey === "status" ? (b.is_enabled ? 1 : 0) : (b[sortKey] ?? "");
      if (typeof va === "number" && typeof vb === "number") return sortAsc ? va - vb : vb - va;
      return sortAsc
        ? String(va).localeCompare(String(vb), "ar")
        : String(vb).localeCompare(String(va), "ar");
    });
    return out;
  }, [rows, search, fProvider, fCategory, fStatus, sortKey, sortAsc]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortAsc((v) => !v);
    else { setSortKey(k); setSortAsc(true); }
  };

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
    const ids = selected.size ? Array.from(selected) : filtered.map((r) => r.id);
    if (!ids.length) return;
    const { error } = await db.from("ai_models")
      .update({ is_enabled: value, status: value ? "enabled" : "disabled" }).in("id", ids);
    if (error) return toast({ title: "تعذّر التحديث", description: error.message, variant: "destructive" });
    toast({ title: value ? `تم تشغيل ${ids.length} نموذجًا` : `تم تعطيل ${ids.length} نموذجًا` });
    load();
  };

  const bulkDelete = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    const { error } = await db.from("ai_models").delete().in("id", ids);
    if (error) return toast({ title: "تعذّر الحذف", description: error.message, variant: "destructive" });
    toast({ title: `تم حذف ${ids.length} نموذجًا` });
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

  const testBatch = async () => {
    const targets = (selected.size ? filtered.filter((r) => selected.has(r.id)) : filtered).slice(0, 25);
    if (!targets.length) return;
    setBulkTesting(true);
    let ok = 0;
    for (const row of targets) {
      try {
        const { data } = await supabase.functions.invoke("ai-model-verify", { body: { model_row_id: row.id } });
        if ((data as any)?.ok) ok++;
      } catch { /* تجاهل ونتابع */ }
    }
    setBulkTesting(false);
    toast({ title: `اكتمل الاختبار: ${ok}/${targets.length} ناجح` });
    load();
  };

  const exportCsv = () => {
    const cols = ["display_name", "provider", "model_id", "category", "is_free", "is_enabled", "rpm_limit", "daily_limit", "monthly_limit", "priority", "last_test_ok"];
    const csv = [cols.join(","), ...filtered.map((r) => cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `ai-models-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const saveKey = async () => {
    if (!keyRow) return;
    await patch(keyRow.id, { api_key: keyValue || null });
    setKeyRow(null); setKeyValue("");
    toast({ title: "تم حفظ المفتاح" });
  };

  const mask = (k?: string | null) => (k ? `${k.slice(0, 3)}••••${k.slice(-4)}` : "—");

  const allVisibleSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const toggleAll = () => {
    setSelected(allVisibleSelected ? new Set() : new Set(filtered.map((r) => r.id)));
  };
  const toggleOne = (id: string) => {
    setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const statCards = [
    { label: "الإجمالي", value: stats.total, icon: Layers, tone: "text-primary" },
    { label: "مُفعّل", value: stats.enabled, icon: Power, tone: "text-primary" },
    { label: "مجاني", value: stats.free, icon: Sparkles, tone: "text-primary" },
    { label: "بحاجة لمفتاح", value: stats.needKey, icon: KeyRound, tone: "text-muted-foreground" },
    { label: "اختبار ناجح", value: stats.ok, icon: ShieldCheck, tone: "text-primary" },
    { label: "اختبار فاشل", value: stats.failed, icon: ShieldAlert, tone: "text-destructive" },
  ];

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
          <Button size="sm" variant="secondary" onClick={() => bulk(true)}><Power className="w-4 h-4 me-1" /> تشغيل {selected.size ? `(${selected.size})` : "المعروض"}</Button>
          <Button size="sm" variant="destructive" onClick={() => bulk(false)}><PowerOff className="w-4 h-4 me-1" /> تعطيل {selected.size ? `(${selected.size})` : "المعروض"}</Button>
          <Button size="sm" variant="outline" onClick={testBatch} disabled={bulkTesting}>
            {bulkTesting ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Zap className="w-4 h-4 me-1" />} اختبار جماعي
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv}><Download className="w-4 h-4 me-1" /> تصدير CSV</Button>
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4 me-1" /> تحديث</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {statCards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card/50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{c.label}</span>
              <c.icon className={`w-4 h-4 ${c.tone}`} />
            </div>
            <div className="text-2xl font-bold mt-1">{c.value}</div>
          </div>
        ))}
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
        <Select value={draft.category ?? "llm"} onValueChange={(v) => setDraft((d) => ({ ...d, category: v }))}>
          <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="النوع" /></SelectTrigger>
          <SelectContent>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input className="h-9 w-[170px]" placeholder="Base URL (اختياري)" value={draft.base_url ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, base_url: e.target.value }))} />
        <Input className="h-9 w-[160px]" placeholder="اسم السر (اختياري)" value={draft.secret_name ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, secret_name: e.target.value }))} />
        <Button size="sm" onClick={addModel}><Plus className="w-4 h-4 me-1" /> إضافة</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Input className="h-9 w-[200px]" placeholder="بحث…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={fProvider} onValueChange={setFProvider}>
          <SelectTrigger className="h-9 w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">كل المزوّدين</SelectItem>
            {providersInUse.map((p) => <SelectItem key={p} value={p}>{providerInfo(p)?.label ?? p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fCategory} onValueChange={setFCategory}>
          <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأنواع</SelectItem>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="enabled">مُفعّل</SelectItem>
            <SelectItem value="disabled">معطّل</SelectItem>
            <SelectItem value="free">مجاني</SelectItem>
            <SelectItem value="needkey">بحاجة لمفتاح</SelectItem>
            <SelectItem value="ok">اختبار ناجح</SelectItem>
            <SelectItem value="failed">اختبار فاشل</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline">{filtered.length} نتيجة</Badge>
        {selected.size > 0 && (
          <>
            <Badge>{selected.size} محدّد</Badge>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>إلغاء التحديد</Button>
            <Button size="sm" variant="destructive" onClick={bulkDelete}><Trash2 className="w-4 h-4 me-1" /> حذف المحدّد</Button>
          </>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card/40 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground sticky top-0 z-10">
            <tr>
              <th className="p-2 w-8"><Checkbox checked={allVisibleSelected} onCheckedChange={toggleAll} /></th>
              <th className="p-2 text-start w-10">#</th>
              <th className="p-2 text-start cursor-pointer select-none" onClick={() => toggleSort("display_name")}>
                <span className="inline-flex items-center gap-1">النموذج <ArrowUpDown className="w-3 h-3" /></span>
              </th>
              <th className="p-2 text-start w-20 cursor-pointer select-none" onClick={() => toggleSort("category")}>
                <span className="inline-flex items-center gap-1">النوع <ArrowUpDown className="w-3 h-3" /></span>
              </th>
              <th className="p-2 text-start w-20">مجاني</th>
              <th className="p-2 text-start w-24">الحالة</th>
              <th className="p-2 text-start w-24">المفتاح</th>
              <th className="p-2 text-start w-20">RPM</th>
              <th className="p-2 text-start w-20">يومي</th>
              <th className="p-2 text-start w-20">شهري</th>
              <th className="p-2 text-start w-20 cursor-pointer select-none" onClick={() => toggleSort("priority")}>
                <span className="inline-flex items-center gap-1">الأولوية <ArrowUpDown className="w-3 h-3" /></span>
              </th>
              <th className="p-2 text-start w-20">تفعيل</th>
              <th className="p-2 text-start w-44">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={13} className="p-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={13} className="p-6 text-center text-muted-foreground">لا توجد نماذج مطابقة — عدّل الفلاتر أو أضف نموذجًا</td></tr>
            )}
            {!loading && filtered.map((r, i) => {
              const info = providerInfo(r.provider);
              const isSel = selected.has(r.id);
              return (
                <tr key={r.id} className={`border-t border-border/50 hover:bg-muted/20 ${isSel ? "bg-primary/5" : ""}`}>
                  <td className="p-2"><Checkbox checked={isSel} onCheckedChange={() => toggleOne(r.id)} /></td>
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
