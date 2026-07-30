/**
 * النماذج المحلية — كتالوج المحرّكات المحلية (Ollama, LM Studio…)
 * مع أمر التشغيل القابل للنسخ، الحجم، الحالة، ومسارات التخزين المحلية.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, RefreshCw, Trash2, Copy, ExternalLink } from "lucide-react";
import { LOCAL_ENGINES } from "@/admin/data/aiProviders";
import AdminCrudTable from "@/admin/components/AdminCrudTable";

export default function AiLocalModels() {
  const db = supabase as any;
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, string>>({ engine: "ollama" });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.from("ai_local_models").select("*")
      .order("priority", { ascending: true }).order("display_name", { ascending: true }).limit(500);
    if (error) toast({ title: "خطأ في التحميل", description: error.message, variant: "destructive" });
    setRows(data ?? []);
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const patch = async (id: string, values: Record<string, any>) => {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...values } : r)));
    const { error } = await db.from("ai_local_models").update(values).eq("id", id);
    if (error) { toast({ title: "تعذّر الحفظ", description: error.message, variant: "destructive" }); load(); }
  };

  const remove = async (id: string) => {
    const { error } = await db.from("ai_local_models").delete().eq("id", id);
    if (error) return toast({ title: "تعذّر الحذف", description: error.message, variant: "destructive" });
    load();
  };

  const add = async () => {
    if (!draft.model_id || !draft.display_name) {
      return toast({ title: "أدخل model_id والاسم", variant: "destructive" });
    }
    const engine = LOCAL_ENGINES.find((e) => e.id === (draft.engine || "ollama"));
    const { error } = await db.from("ai_local_models").insert({
      engine: draft.engine || "ollama",
      model_id: draft.model_id,
      display_name: draft.display_name,
      description: draft.description || null,
      size_gb: draft.size_gb ? Number(draft.size_gb) : null,
      run_command: draft.run_command || (draft.engine === "ollama" || !draft.engine
        ? `ollama serve && ollama run ${draft.model_id}` : null),
      install_url: engine?.install ?? null,
      endpoint_url: draft.endpoint_url || "http://localhost:11434",
    });
    if (error) return toast({ title: "تعذّرت الإضافة", description: error.message, variant: "destructive" });
    setDraft({ engine: draft.engine });
    load();
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ إلى الحافظة" });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">النماذج المحلية</h1>
            <p className="text-xs text-muted-foreground mt-1">
              نماذج تعمل على جهازك بعد التحميل (بدون إنترنت). انسخ أمر التشغيل ونفّذه في PowerShell أو Terminal.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4 me-1" /> تحديث</Button>
        </div>

        <div className="rounded-xl border border-primary/40 bg-card/60 p-3 flex flex-wrap items-center gap-2">
          <Select value={draft.engine} onValueChange={(v) => setDraft((d) => ({ ...d, engine: v }))}>
            <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="المحرّك" /></SelectTrigger>
            <SelectContent>
              {LOCAL_ENGINES.map((e) => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input className="h-9 w-[180px]" placeholder="model_id (llama3.1:8b)" value={draft.model_id ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, model_id: e.target.value }))} />
          <Input className="h-9 w-[180px]" placeholder="الاسم المعروض" value={draft.display_name ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, display_name: e.target.value }))} />
          <Input className="h-9 w-[110px]" placeholder="الحجم GB" type="number" value={draft.size_gb ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, size_gb: e.target.value }))} />
          <Input className="h-9 w-[200px]" placeholder="نقطة النهاية" value={draft.endpoint_url ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, endpoint_url: e.target.value }))} />
          <Button size="sm" onClick={add}><Plus className="w-4 h-4 me-1" /> إضافة</Button>
        </div>

        <div className="rounded-xl border border-border bg-card/40 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="p-2 text-start w-10">#</th>
                <th className="p-2 text-start">النموذج</th>
                <th className="p-2 text-start w-24">الفئة</th>
                <th className="p-2 text-start w-24">الحجم</th>
                <th className="p-2 text-start">أمر التشغيل</th>
                <th className="p-2 text-start w-24">الحالة</th>
                <th className="p-2 text-start w-20">تفعيل</th>
                <th className="p-2 text-start w-32">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="p-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">لا توجد نماذج محلية بعد</td></tr>
              )}
              {!loading && rows.map((r, i) => (
                <tr key={r.id} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="p-2 text-muted-foreground">{i + 1}</td>
                  <td className="p-2">
                    <div className="font-medium">{r.display_name}</div>
                    <div className="text-[11px] font-mono text-primary">{r.engine} · {r.model_id}</div>
                  </td>
                  <td className="p-2"><Badge variant="outline">{r.category}</Badge></td>
                  <td className="p-2 text-muted-foreground">{r.size_gb ? `~${r.size_gb} GB` : "—"}</td>
                  <td className="p-2">
                    <code className="text-[11px] bg-muted/50 rounded px-2 py-1 block truncate max-w-[320px]">
                      {r.run_command || "—"}
                    </code>
                  </td>
                  <td className="p-2">
                    <Badge variant={r.status === "connected" ? "default" : "secondary"}>
                      {r.status === "connected" ? "متصل" : "غير متصل"}
                    </Badge>
                  </td>
                  <td className="p-2">
                    <Switch checked={!!r.is_enabled} onCheckedChange={(v) => patch(r.id, { is_enabled: v })} />
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" title="نسخ الأمر" onClick={() => copy(r.run_command || "")}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <a href={r.install_url || "#"} target="_blank" rel="noopener noreferrer">
                        <Button size="icon" variant="ghost" title="دليل التثبيت"><ExternalLink className="w-4 h-4" /></Button>
                      </a>
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
      </div>

      {/* مسارات التخزين المحلية */}
      <AdminCrudTable
        table="ai_local_paths"
        title="مسارات التخزين المحلية (Windows)"
        subtitle="تُحفظ المسارات في قاعدة البيانات وتُستعمل من نسخة سطح المكتب."
        orderBy={{ column: "sort_order", ascending: true }}
        toggleKey="is_enabled"
        columns={[
          { key: "label", label: "التسمية" },
          { key: "description", label: "الوصف" },
          { key: "path", label: "المسار", className: "font-mono text-[11px]" },
          { key: "kind", label: "النوع" },
        ]}
        fields={[
          { key: "label", label: "التسمية", placeholder: "مجلد الحفظ الرئيسي" },
          { key: "description", label: "الوصف", placeholder: "الوصف" },
          { key: "path", label: "المسار", placeholder: "E:\\Videos\\hn.video" },
          { key: "kind", label: "النوع", placeholder: "folder" },
          { key: "sort_order", label: "الترتيب", type: "number", editOnly: true },
          { key: "is_enabled", label: "مُفعّل", type: "boolean", editOnly: true },
        ]}
      />
    </div>
  );
}
