/**
 * AdminCrudTable — generic dense admin table used by the AI / billing / ops pages.
 * Dark table, inline toggle switches, quick-add row, edit dialog and delete.
 * Purely presentational + generic Supabase CRUD; no business logic.
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
import { Loader2, Plus, RefreshCw, Trash2, Pencil, Power, PowerOff } from "lucide-react";

export type CrudField = {
  key: string;
  label: string;
  type?: "text" | "number" | "boolean";
  placeholder?: string;
  defaultValue?: unknown;
  /** hidden from the quick-add row but editable in the dialog */
  editOnly?: boolean;
};

export type CrudColumn = {
  key: string;
  label: string;
  className?: string;
  render?: (row: Record<string, any>, refresh: () => void) => React.ReactNode;
};

type Props = {
  table: string;
  title: string;
  subtitle?: string;
  columns: CrudColumn[];
  fields: CrudField[];
  orderBy?: { column: string; ascending?: boolean };
  /** column name of the boolean activation switch, if any */
  toggleKey?: string;
  extraActions?: (row: Record<string, any>, refresh: () => void) => React.ReactNode;
  headerActions?: React.ReactNode;
};

export default function AdminCrudTable({
  table, title, subtitle, columns, fields, orderBy, toggleKey, extraActions, headerActions,
}: Props) {
  const db = supabase as any;
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const q = db.from(table).select("*");
    const ordered = orderBy
      ? q.order(orderBy.column, { ascending: orderBy.ascending ?? true })
      : q.order("created_at", { ascending: false });
    const { data, error } = await ordered.limit(500);
    if (error) toast({ title: "خطأ في التحميل", description: error.message, variant: "destructive" });
    setRows(data ?? []);
    setLoading(false);
  }, [table, orderBy?.column, orderBy?.ascending]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    setSaving(true);
    const payload: Record<string, any> = {};
    fields.filter((f) => !f.editOnly).forEach((f) => {
      const v = draft[f.key] ?? f.defaultValue;
      if (v !== undefined && v !== "") payload[f.key] = f.type === "number" ? Number(v) : v;
    });
    const { error } = await db.from(table).insert(payload);
    setSaving(false);
    if (error) return toast({ title: "تعذّرت الإضافة", description: error.message, variant: "destructive" });
    setDraft({});
    toast({ title: "تمت الإضافة" });
    load();
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const patch: Record<string, any> = {};
    fields.forEach((f) => {
      const v = editing[f.key];
      patch[f.key] = f.type === "number" ? (v === "" || v === null ? null : Number(v)) : v;
    });
    const { error } = await db.from(table).update(patch).eq("id", editing.id);
    setSaving(false);
    if (error) return toast({ title: "تعذّر الحفظ", description: error.message, variant: "destructive" });
    setEditing(null);
    toast({ title: "تم الحفظ" });
    load();
  };

  const remove = async (id: string) => {
    const { error } = await db.from(table).delete().eq("id", id);
    if (error) return toast({ title: "تعذّر الحذف", description: error.message, variant: "destructive" });
    toast({ title: "تم الحذف" });
    load();
  };

  const toggle = async (row: Record<string, any>, value: boolean) => {
    if (!toggleKey) return;
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, [toggleKey]: value } : r)));
    const { error } = await db.from(table).update({ [toggleKey]: value }).eq("id", row.id);
    if (error) {
      toast({ title: "تعذّر التحديث", description: error.message, variant: "destructive" });
      load();
    }
  };

  const bulkToggle = async (value: boolean) => {
    if (!toggleKey) return;
    const { error } = await db.from(table).update({ [toggleKey]: value }).not("id", "is", null);
    if (error) return toast({ title: "تعذّر التحديث", description: error.message, variant: "destructive" });
    toast({ title: value ? "تم تشغيل الكل" : "تم تعطيل الكل" });
    load();
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(s));
  }, [rows, search]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerActions}
          {toggleKey && (
            <>
              <Button size="sm" variant="secondary" onClick={() => bulkToggle(true)}>
                <Power className="w-4 h-4 me-1" /> تشغيل الكل
              </Button>
              <Button size="sm" variant="destructive" onClick={() => bulkToggle(false)}>
                <PowerOff className="w-4 h-4 me-1" /> تعطيل الكل
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="w-4 h-4 me-1" /> تحديث
          </Button>
        </div>
      </div>

      {/* Quick add row */}
      <div className="rounded-xl border border-primary/40 bg-card/60 p-3">
        <div className="flex flex-wrap items-center gap-2">
          {fields.filter((f) => !f.editOnly).map((f) => (
            <Input
              key={f.key}
              className="h-9 w-[170px] bg-background/60"
              placeholder={f.placeholder || f.label}
              type={f.type === "number" ? "number" : "text"}
              value={(draft[f.key] as string) ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
            />
          ))}
          <Button size="sm" onClick={add} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 me-1" />} إضافة
          </Button>
          <Input
            className="h-9 w-[200px] ms-auto bg-background/60"
            placeholder="بحث…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card/40 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="p-2 text-start w-10">#</th>
              {columns.map((c) => (
                <th key={c.key} className={`p-2 text-start ${c.className || ""}`}>{c.label}</th>
              ))}
              {toggleKey && <th className="p-2 text-start w-20">التفعيل</th>}
              <th className="p-2 text-start w-40">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={columns.length + 3} className="p-6 text-center">
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              </td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={columns.length + 3} className="p-6 text-center text-muted-foreground">
                لا توجد بيانات بعد
              </td></tr>
            )}
            {!loading && filtered.map((row, i) => (
              <tr key={row.id} className="border-t border-border/50 hover:bg-muted/20">
                <td className="p-2 text-muted-foreground">{i + 1}</td>
                {columns.map((c) => (
                  <td key={c.key} className={`p-2 ${c.className || ""}`}>
                    {c.render ? c.render(row, load) : (
                      typeof row[c.key] === "boolean"
                        ? <Badge variant={row[c.key] ? "default" : "secondary"}>{row[c.key] ? "نعم" : "لا"}</Badge>
                        : (row[c.key] ?? "—")
                    )}
                  </td>
                ))}
                {toggleKey && (
                  <td className="p-2">
                    <Switch checked={!!row[toggleKey]} onCheckedChange={(v) => toggle(row, v)} />
                  </td>
                )}
                <td className="p-2">
                  <div className="flex items-center gap-1">
                    {extraActions?.(row, load)}
                    <Button size="icon" variant="ghost" onClick={() => setEditing({ ...row })} aria-label="تعديل">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(row.id)} aria-label="حذف">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تعديل السجل</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {editing && fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <label className="text-xs text-muted-foreground">{f.label}</label>
                {f.type === "boolean" ? (
                  <div><Switch
                    checked={!!editing[f.key]}
                    onCheckedChange={(v) => setEditing((e) => ({ ...(e || {}), [f.key]: v }))}
                  /></div>
                ) : (
                  <Input
                    type={f.type === "number" ? "number" : "text"}
                    value={editing[f.key] ?? ""}
                    onChange={(e) => setEditing((s) => ({ ...(s || {}), [f.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>إلغاء</Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 me-1 animate-spin" />} حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
