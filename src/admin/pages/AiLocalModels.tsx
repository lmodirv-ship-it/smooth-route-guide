/**
 * النماذج المحلية والإعدادات — مركز التشغيل المحلي (Offline / Desktop).
 * يشمل: نمط التشغيل، مسارات التخزين، حالة المزوّدات، كتالوج النماذج والأدوات المحلية،
 * عناوين الخدمات (ai_endpoints) مع الفحص التلقائي، وتصدير قاعدة البيانات محلياً.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Plus, RefreshCw, Trash2, Copy, ExternalLink, Play, Save, FolderPlus,
  Search, Download, Upload, Database, Wifi, WifiOff, Cloud, HardDrive, Zap,
} from "lucide-react";
import { LOCAL_ENGINES, providerLogo } from "@/admin/data/aiProviders";

const db = supabase as any;

const RUN_MODE_KEY = "hn_ai_run_mode";
const RUN_MODES = [
  { id: "local", label: "محلي", hint: "بدون إنترنت (افتراضي)", icon: HardDrive },
  { id: "auto", label: "تلقائي", hint: "حسب البيئة", icon: Zap },
  { id: "cloud", label: "سحابي", hint: "Lovable AI Gateway", icon: Cloud },
];

const CATEGORY_LABEL: Record<string, string> = {
  LLM: "نماذج نصية", Vision: "رؤية", Code: "برمجة", Embedding: "تضمين",
  Image: "توليد صور", TTS: "نص إلى صوت", STT: "تفريغ صوتي", Video: "فيديو",
};

const DEFAULT_PATHS: Record<string, string> = {
  "مجلد الحفظ الرئيسي": "E:\\Videos\\hn.video",
  "تصدير قواعد البيانات": "E:\\Videos\\hn.video\\db",
  FFmpeg: "C:\\ffmpeg\\bin",
  "الصور المُولّدة": "E:\\Videos\\hn.video\\images",
  "الصوت والتعليقات": "E:\\Videos\\hn.video\\audio",
  "الأفلام النهائية": "E:\\Videos\\hn.video\\final",
  "سجلات التشغيل": "E:\\Videos\\hn.video\\logs",
};

const electron = () => (typeof window !== "undefined" ? (window as any).electronAPI : undefined);

function copyText(text: string, label = "تم النسخ إلى الحافظة") {
  navigator.clipboard?.writeText(text);
  toast({ title: label });
}

async function pingEndpoint(url: string, path: string | null): Promise<{ ok: boolean; ms: number; error?: string }> {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    await fetch(`${url.replace(/\/$/, "")}${path || "/"}`, { mode: "no-cors", signal: controller.signal });
    return { ok: true, ms: Math.round(performance.now() - started) };
  } catch (e: any) {
    return { ok: false, ms: Math.round(performance.now() - started), error: e?.message || "Failed to fetch" };
  } finally {
    clearTimeout(timer);
  }
}

export default function AiLocalModels() {
  /* ---------------- state ---------------- */
  const [runMode, setRunMode] = useState<string>(() => localStorage.getItem(RUN_MODE_KEY) || "local");
  const [models, setModels] = useState<Record<string, any>[]>([]);
  const [paths, setPaths] = useState<Record<string, any>[]>([]);
  const [endpoints, setEndpoints] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, string>>({ engine: "ollama" });
  const [epDraft, setEpDraft] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const [eng, setEng] = useState("all");
  const [autoCheck, setAutoCheck] = useState(true);
  const [checking, setChecking] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ---------------- loaders ---------------- */
  const load = useCallback(async () => {
    setLoading(true);
    const [m, p, e] = await Promise.all([
      db.from("ai_local_models").select("*").order("category").order("priority").order("display_name").limit(500),
      db.from("ai_local_paths").select("*").order("sort_order").limit(200),
      db.from("ai_endpoints").select("*").order("sort_order").limit(200),
    ]);
    if (m.error) toast({ title: "خطأ في التحميل", description: m.error.message, variant: "destructive" });
    setModels(m.data ?? []);
    setPaths(p.data ?? []);
    setEndpoints(e.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ---------------- run mode ---------------- */
  const changeMode = async (mode: string) => {
    setRunMode(mode);
    localStorage.setItem(RUN_MODE_KEY, mode);
    const { error } = await db.from("app_settings")
      .upsert({ key: "ai_run_mode", value: { mode } }, { onConflict: "key" });
    toast({
      title: error ? "حُفظ محلياً فقط" : "تم حفظ نمط التشغيل",
      description: error ? error.message : RUN_MODES.find((r) => r.id === mode)?.label,
      variant: error ? "destructive" : undefined,
    });
  };

  /* ---------------- models ---------------- */
  const patchModel = async (id: string, values: Record<string, any>) => {
    setModels((p) => p.map((r) => (r.id === id ? { ...r, ...values } : r)));
    const { error } = await db.from("ai_local_models").update(values).eq("id", id);
    if (error) { toast({ title: "تعذّر الحفظ", description: error.message, variant: "destructive" }); load(); }
  };

  const removeModel = async (id: string) => {
    const { error } = await db.from("ai_local_models").delete().eq("id", id);
    if (error) return toast({ title: "تعذّر الحذف", description: error.message, variant: "destructive" });
    setModels((p) => p.filter((r) => r.id !== id));
  };

  const addModel = async () => {
    if (!draft.model_id || !draft.display_name) return toast({ title: "أدخل model_id والاسم", variant: "destructive" });
    const engine = LOCAL_ENGINES.find((e) => e.id === (draft.engine || "ollama"));
    const { error } = await db.from("ai_local_models").insert({
      engine: draft.engine || "ollama",
      model_id: draft.model_id,
      display_name: draft.display_name,
      description: draft.description || null,
      category: draft.category || "LLM",
      size_gb: draft.size_gb ? Number(draft.size_gb) : null,
      run_command: draft.run_command || `ollama serve && ollama run ${draft.model_id}`,
      install_url: engine?.install ?? null,
      endpoint_url: draft.endpoint_url || "http://localhost:11434",
      is_enabled: true,
    });
    if (error) return toast({ title: "تعذّرت الإضافة", description: error.message, variant: "destructive" });
    setDraft({ engine: draft.engine });
    load();
  };

  const runCommand = (cmd: string) => {
    if (!cmd) return;
    const api = electron();
    if (api?.runCommand) { api.runCommand(cmd); return toast({ title: "تم إرسال الأمر إلى PowerShell" }); }
    copyText(cmd, "نُسخ الأمر — ألصقه في PowerShell");
  };

  const filtered = useMemo(() => models.filter((m) => {
    if (cat !== "all" && m.category !== cat) return false;
    if (eng !== "all" && m.engine !== eng) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${m.display_name} ${m.model_id} ${m.description ?? ""} ${m.engine}`.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [models, cat, eng, search]);

  const stats = useMemo(() => ({
    total: models.length,
    enabled: models.filter((m) => m.is_enabled).length,
    connected: models.filter((m) => m.status === "connected").length,
    categories: Array.from(new Set(models.map((m) => m.category))).sort(),
    engines: Array.from(new Set(models.map((m) => m.engine))).sort(),
  }), [models]);

  const bulkEnable = async (value: boolean) => {
    const ids = filtered.map((m) => m.id);
    if (!ids.length) return;
    setModels((p) => p.map((r) => (ids.includes(r.id) ? { ...r, is_enabled: value } : r)));
    const { error } = await db.from("ai_local_models").update({ is_enabled: value }).in("id", ids);
    if (error) { toast({ title: "تعذّر التحديث", description: error.message, variant: "destructive" }); load(); }
    else toast({ title: value ? `تم تفعيل ${ids.length} عنصر` : `تم تعطيل ${ids.length} عنصر` });
  };

  /* ---------------- paths ---------------- */
  const setPathValue = (id: string, path: string) =>
    setPaths((p) => p.map((r) => (r.id === id ? { ...r, path } : r)));

  const savePath = async (row: Record<string, any>) => {
    const { error } = await db.from("ai_local_paths").update({ path: row.path, is_enabled: row.is_enabled }).eq("id", row.id);
    toast({
      title: error ? "تعذّر الحفظ" : "تم حفظ المسار",
      description: error?.message,
      variant: error ? "destructive" : undefined,
    });
  };

  const saveAllPaths = async () => {
    for (const row of paths) await db.from("ai_local_paths").update({ path: row.path, is_enabled: row.is_enabled }).eq("id", row.id);
    toast({ title: "تم حفظ جميع المسارات" });
  };

  const resetPaths = () => {
    setPaths((p) => p.map((r) => (DEFAULT_PATHS[r.label] ? { ...r, path: DEFAULT_PATHS[r.label] } : r)));
    toast({ title: "أُعيدت المسارات الافتراضية — اضغط «حفظ الكل»" });
  };

  const pathAction = (row: Record<string, any>, action: "check" | "open" | "create") => {
    const api = electron();
    const fn = api?.[action === "check" ? "checkPath" : action === "open" ? "openPath" : "createPath"];
    if (fn) { fn(row.path); return toast({ title: "تم إرسال الطلب لنسخة سطح المكتب" }); }
    copyText(row.path, "نُسخ المسار (متاح فعلياً في نسخة سطح المكتب)");
  };

  /* ---------------- endpoints ---------------- */
  const setEp = (id: string, values: Record<string, any>) =>
    setEndpoints((p) => p.map((r) => (r.id === id ? { ...r, ...values } : r)));

  const testEndpoint = useCallback(async (row: Record<string, any>, persist = true) => {
    const res = await pingEndpoint(row.url, row.health_path);
    const values = {
      status: res.ok ? "connected" : "failed",
      latency_ms: res.ok ? res.ms : null,
      notes: res.ok ? null : res.error ?? null,
      last_checked_at: new Date().toISOString(),
    };
    setEp(row.id, values);
    if (persist) await db.from("ai_endpoints").update(values).eq("id", row.id);
    return res.ok;
  }, []);

  const testAll = useCallback(async () => {
    setChecking(true);
    const rows = endpoints.filter((r) => r.is_enabled);
    const results = await Promise.all(rows.map((r) => testEndpoint(r)));
    setChecking(false);
    toast({ title: `اكتمل الفحص — ${results.filter(Boolean).length}/${rows.length} متصل` });
  }, [endpoints, testEndpoint]);

  useEffect(() => {
    if (!autoCheck || !endpoints.length) return;
    const t = setInterval(() => { endpoints.filter((r) => r.is_enabled).forEach((r) => testEndpoint(r)); }, 90000);
    return () => clearInterval(t);
  }, [autoCheck, endpoints, testEndpoint]);

  const saveEndpoint = async (row: Record<string, any>) => {
    const { error } = await db.from("ai_endpoints")
      .update({ url: row.url, health_path: row.health_path, is_enabled: row.is_enabled, label: row.label }).eq("id", row.id);
    toast({ title: error ? "تعذّر الحفظ" : "تم حفظ العنوان", description: error?.message, variant: error ? "destructive" : undefined });
  };

  const deleteEndpoint = async (row: Record<string, any>) => {
    const { error } = await db.from("ai_endpoints").delete().eq("id", row.id);
    if (error) return toast({ title: "تعذّر الحذف", description: error.message, variant: "destructive" });
    setEndpoints((p) => p.filter((r) => r.id !== row.id));
  };

  const addEndpoint = async () => {
    if (!epDraft.service || !epDraft.url) return toast({ title: "أدخل اسم الخدمة والعنوان", variant: "destructive" });
    const { error } = await db.from("ai_endpoints").insert({
      service: epDraft.service,
      label: epDraft.label || epDraft.service,
      url: epDraft.url,
      health_path: epDraft.health_path || "/",
      sort_order: endpoints.length + 1,
    });
    if (error) return toast({ title: "تعذّرت الإضافة", description: error.message, variant: "destructive" });
    setEpDraft({});
    load();
  };

  const exportEndpoints = () => {
    const blob = new Blob([JSON.stringify(endpoints, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ai-endpoints-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importEndpoints = async (file: File) => {
    try {
      const rows = JSON.parse(await file.text());
      if (!Array.isArray(rows)) throw new Error("صيغة غير صالحة");
      for (const r of rows) {
        await db.from("ai_endpoints").upsert(
          { service: r.service, label: r.label ?? r.service, url: r.url, health_path: r.health_path ?? "/", is_enabled: r.is_enabled ?? true },
          { onConflict: "service" },
        );
      }
      toast({ title: `تم استيراد ${rows.length} عنوان` });
      load();
    } catch (e: any) {
      toast({ title: "فشل الاستيراد", description: e.message, variant: "destructive" });
    }
  };

  /* ---------------- db export ---------------- */
  const exportDatabase = async () => {
    setExporting(true);
    const tables = ["ai_models", "ai_local_models", "ai_local_paths", "ai_endpoints", "ai_agents", "app_settings"];
    const dump: Record<string, any> = {};
    for (const t of tables) {
      const { data } = await db.from(t).select("*").limit(5000);
      dump[t] = data ?? [];
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hn-ai-db-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setExporting(false);
    toast({ title: `تم تصدير ${tables.length} جدول` });
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="space-y-8">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">النماذج المحلية والإعدادات</h1>
          <p className="text-xs text-muted-foreground mt-1">
            الوضع: <span className="text-primary">{RUN_MODES.find((r) => r.id === runMode)?.label}</span> · Desktop / Offline
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4 me-1" /> إعادة الفحص</Button>
          <Button size="sm" variant="outline" onClick={testAll} disabled={checking}>
            {checking ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Wifi className="w-4 h-4 me-1" />} فحص الحاسوب
          </Button>
          <Button size="sm" onClick={exportDatabase} disabled={exporting}>
            {exporting ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Database className="w-4 h-4 me-1" />} تصدير قاعدة البيانات
          </Button>
        </div>
      </div>

      {/* تنبيه CORS للاتصال المباشر من الدردشة */}
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-xs leading-6">
        <p className="font-semibold text-amber-600 dark:text-amber-400 mb-1">تشغيل النماذج المحلية داخل صفحة الدردشة</p>
        <p>
          أي نموذج محلي <span className="text-primary">مُفعّل</span> هنا يظهر تلقائياً في قائمة «النموذج» بصفحة الدردشة ضمن مجموعة
          «نماذج محلية (بدون إنترنت)»، ويعمل باتصال مباشر من جهازك — بدون أي وسيط ولا مفتاح API.
        </p>
        <p className="mt-1">
          للسماح بالاتصال من المتصفح اضبط: <code className="px-1 rounded bg-muted">OLLAMA_ORIGINS=*</code> (أو فعّل CORS في LM Studio).
          في نسخة الحاسوب (Desktop) يعمل الاتصال مباشرة دون هذا الإعداد.
        </p>
      </div>



      {/* run mode */}
      <section className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
        <h2 className="text-sm font-semibold">نمط التشغيل — المحلي افتراضي</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {RUN_MODES.map((m) => {
            const Icon = m.icon;
            const active = runMode === m.id;
            return (
              <button key={m.id} onClick={() => changeMode(m.id)}
                className={`rounded-lg border p-3 text-start transition ${active ? "border-primary bg-primary/10" : "border-border hover:bg-muted/30"}`}>
                <div className="flex items-center gap-2 font-medium"><Icon className="w-4 h-4" /> {m.label}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{m.hint}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* storage paths */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">مسارات التخزين المحلية (Windows) — متصلة بقاعدة البيانات</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={resetPaths}>افتراضي</Button>
            <Button size="sm" onClick={saveAllPaths}><Save className="w-4 h-4 me-1" /> حفظ الكل</Button>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card/40 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="p-2 text-start w-10">#</th>
                <th className="p-2 text-start">التسمية</th>
                <th className="p-2 text-start">المسار</th>
                <th className="p-2 text-start w-20">التفعيل</th>
                <th className="p-2 text-start w-56">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {paths.map((r, i) => (
                <tr key={r.id} className="border-t border-border/50">
                  <td className="p-2 text-muted-foreground">{i + 1}</td>
                  <td className="p-2">
                    <div className="font-medium">{r.label}</div>
                    <div className="text-[11px] text-muted-foreground">{r.description}</div>
                  </td>
                  <td className="p-2">
                    <Input className="h-8 font-mono text-[11px]" value={r.path ?? ""} onChange={(e) => setPathValue(r.id, e.target.value)} />
                  </td>
                  <td className="p-2">
                    <Switch checked={!!r.is_enabled} onCheckedChange={(v) => setPaths((p) => p.map((x) => (x.id === r.id ? { ...x, is_enabled: v } : x)))} />
                  </td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="ghost" onClick={() => pathAction(r, "check")}>فحص</Button>
                      <Button size="sm" variant="ghost" onClick={() => pathAction(r, "open")}>فتح</Button>
                      <Button size="sm" variant="ghost" onClick={() => pathAction(r, "create")}><FolderPlus className="w-4 h-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => savePath(r)}>حفظ</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!paths.length && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">لا توجد مسارات</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground">
          الفحص/الإنشاء/الفتح يتطلب نسخة سطح المكتب (Electron) عبر <code>window.electronAPI</code>؛ في الويب يُنسخ المسار إلى الحافظة.
        </p>
      </section>

      {/* endpoints */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">عناوين المزوّدات — تُحفظ في قاعدة البيانات</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={testAll} disabled={checking}>اختبار الكل</Button>
            <div className="flex items-center gap-1 text-[11px]">
              <Switch checked={autoCheck} onCheckedChange={setAutoCheck} /> تلقائي 90ث
            </div>
            <Button size="sm" variant="outline" onClick={exportEndpoints}><Download className="w-4 h-4 me-1" /> تصدير JSON</Button>
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4 me-1" /> استيراد JSON</Button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden"
              onChange={(e) => e.target.files?.[0] && importEndpoints(e.target.files[0])} />
          </div>
        </div>

        <div className="rounded-xl border border-primary/30 bg-card/60 p-3 flex flex-wrap items-center gap-2">
          <Input className="h-9 w-[150px]" placeholder="المعرّف (ollama)" value={epDraft.service ?? ""}
            onChange={(e) => setEpDraft((d) => ({ ...d, service: e.target.value }))} />
          <Input className="h-9 w-[170px]" placeholder="الاسم المعروض" value={epDraft.label ?? ""}
            onChange={(e) => setEpDraft((d) => ({ ...d, label: e.target.value }))} />
          <Input className="h-9 w-[220px]" placeholder="http://127.0.0.1:11434" value={epDraft.url ?? ""}
            onChange={(e) => setEpDraft((d) => ({ ...d, url: e.target.value }))} />
          <Input className="h-9 w-[150px]" placeholder="/api/tags" value={epDraft.health_path ?? ""}
            onChange={(e) => setEpDraft((d) => ({ ...d, health_path: e.target.value }))} />
          <Button size="sm" onClick={addEndpoint}><Plus className="w-4 h-4 me-1" /> إضافة وحفظ</Button>
        </div>

        <div className="rounded-xl border border-border bg-card/40 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="p-2 text-start w-10">#</th>
                <th className="p-2 text-start">الخدمة</th>
                <th className="p-2 text-start">عنوان URL</th>
                <th className="p-2 text-start w-32">مسار الفحص</th>
                <th className="p-2 text-start w-36">الحالة</th>
                <th className="p-2 text-start w-48">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((r, i) => (
                <tr key={r.id} className="border-t border-border/50">
                  <td className="p-2 text-muted-foreground">{i + 1}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <img src={providerLogo(r.service, "github.com")} alt="" width={16} height={16} loading="lazy" className="rounded" />
                      <span className="font-medium">{r.label}</span>
                      {r.is_primary && <Badge variant="outline" className="text-[10px]">أساسية</Badge>}
                    </div>
                  </td>
                  <td className="p-2">
                    <Input className="h-8 font-mono text-[11px]" value={r.url ?? ""} onChange={(e) => setEp(r.id, { url: e.target.value })} />
                  </td>
                  <td className="p-2">
                    <Input className="h-8 font-mono text-[11px]" value={r.health_path ?? ""} onChange={(e) => setEp(r.id, { health_path: e.target.value })} />
                  </td>
                  <td className="p-2">
                    {r.status === "connected"
                      ? <Badge className="gap-1"><Wifi className="w-3 h-3" /> متصل {r.latency_ms ? `· ${r.latency_ms}ms` : ""}</Badge>
                      : <Badge variant="secondary" className="gap-1"><WifiOff className="w-3 h-3" /> {r.status === "failed" ? (r.notes || "غير متصل") : "غير مفحوص"}</Badge>}
                  </td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="ghost" onClick={() => testEndpoint(r)}>اختبار</Button>
                      <Button size="sm" variant="outline" onClick={() => saveEndpoint(r)}>حفظ</Button>
                      {!r.is_primary && (
                        <Button size="icon" variant="ghost" onClick={() => deleteEndpoint(r)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!endpoints.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">لا توجد عناوين</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* models + tools */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">النماذج والأدوات المحلية — تعمل بدون إنترنت</h2>
            <p className="text-[11px] text-muted-foreground mt-1">
              {stats.total} عنصر · {stats.enabled} مُفعّل · {stats.connected} متصل — كل زر تشغيل ينفّذ الأمر في PowerShell (سطح المكتب) أو ينسخه في الويب.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => bulkEnable(true)}>تفعيل المعروض</Button>
            <Button size="sm" variant="outline" onClick={() => bulkEnable(false)}>تعطيل المعروض</Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute top-2.5 start-2 text-muted-foreground" />
            <Input className="h-9 w-[220px] ps-8" placeholder="بحث…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="الفئة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفئات</SelectItem>
              {stats.categories.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABEL[c] ?? c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={eng} onValueChange={setEng}>
            <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="المحرّك" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المحرّكات</SelectItem>
              {stats.engines.map((c) => <SelectItem key={c} value={c}>{LOCAL_ENGINES.find((l) => l.id === c)?.label ?? c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Badge variant="outline">{filtered.length} معروض</Badge>
        </div>

        {/* add model */}
        <div className="rounded-xl border border-primary/30 bg-card/60 p-3 flex flex-wrap items-center gap-2">
          <Select value={draft.engine} onValueChange={(v) => setDraft((d) => ({ ...d, engine: v }))}>
            <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="المحرّك" /></SelectTrigger>
            <SelectContent>{LOCAL_ENGINES.map((e) => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={draft.category ?? "LLM"} onValueChange={(v) => setDraft((d) => ({ ...d, category: v }))}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="الفئة" /></SelectTrigger>
            <SelectContent>{Object.keys(CATEGORY_LABEL).map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>)}</SelectContent>
          </Select>
          <Input className="h-9 w-[170px]" placeholder="model_id (llama3.1:8b)" value={draft.model_id ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, model_id: e.target.value }))} />
          <Input className="h-9 w-[170px]" placeholder="الاسم المعروض" value={draft.display_name ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, display_name: e.target.value }))} />
          <Input className="h-9 w-[100px]" placeholder="الحجم GB" type="number" value={draft.size_gb ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, size_gb: e.target.value }))} />
          <Input className="h-9 w-[220px]" placeholder="أمر التشغيل (اختياري)" value={draft.run_command ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, run_command: e.target.value }))} />
          <Button size="sm" onClick={addModel}><Plus className="w-4 h-4 me-1" /> إضافة</Button>
        </div>

        <div className="rounded-xl border border-border bg-card/40 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="p-2 text-start w-10">#</th>
                <th className="p-2 text-start">النموذج / الأداة</th>
                <th className="p-2 text-start w-28">الفئة</th>
                <th className="p-2 text-start w-24">الحجم</th>
                <th className="p-2 text-start">أمر التشغيل</th>
                <th className="p-2 text-start w-40">المنفذ</th>
                <th className="p-2 text-start w-20">تفعيل</th>
                <th className="p-2 text-start w-40">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="p-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>}
              {!loading && !filtered.length && (
                <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">لا توجد نتائج</td></tr>
              )}
              {!loading && filtered.map((r, i) => (
                <tr key={r.id} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="p-2 text-muted-foreground">{i + 1}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <img src={providerLogo(r.engine, "github.com")} alt="" width={16} height={16} loading="lazy" className="rounded" />
                      <div>
                        <div className="font-medium">{r.display_name}</div>
                        <div className="text-[11px] text-muted-foreground">{r.description}</div>
                        <div className="text-[11px] font-mono text-primary">{r.engine} · {r.model_id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-2"><Badge variant="outline">{CATEGORY_LABEL[r.category] ?? r.category}</Badge></td>
                  <td className="p-2 text-muted-foreground">{r.size_gb ? `~${r.size_gb} GB` : "—"}</td>
                  <td className="p-2">
                    <code className="text-[11px] bg-muted/50 rounded px-2 py-1 block truncate max-w-[320px]">{r.run_command || "—"}</code>
                  </td>
                  <td className="p-2 text-[11px] font-mono text-muted-foreground">{r.endpoint_url || "CLI"}</td>
                  <td className="p-2"><Switch checked={!!r.is_enabled} onCheckedChange={(v) => patchModel(r.id, { is_enabled: v })} /></td>
                  <td className="p-2">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" onClick={() => runCommand(r.run_command)}><Play className="w-3.5 h-3.5 me-1" /> تشغيل</Button>
                      <Button size="icon" variant="ghost" title="نسخ الأمر" onClick={() => copyText(r.run_command || "")}><Copy className="w-4 h-4" /></Button>
                      <a href={r.install_url || "#"} target="_blank" rel="noopener noreferrer">
                        <Button size="icon" variant="ghost" title="دليل التثبيت"><ExternalLink className="w-4 h-4" /></Button>
                      </a>
                      <Button size="icon" variant="ghost" onClick={() => removeModel(r.id)} title="حذف"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
