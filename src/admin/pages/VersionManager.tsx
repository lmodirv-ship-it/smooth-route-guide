import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  GitBranch, Plus, Rocket, FileEdit, Trash2, Clock, CheckCircle2,
  AlertTriangle, Package, ArrowUpCircle, Tag, Calendar, Layers
} from "lucide-react";

const MODULES = [
  { id: "admin", label: "Admin Panel" },
  { id: "client", label: "Client App" },
  { id: "driver-ride", label: "Driver Ride" },
  { id: "driver-delivery", label: "Driver Delivery" },
  { id: "supervisor", label: "Supervisor" },
  { id: "callcenter", label: "Call Center" },
];

const CHANGE_TYPES = [
  { value: "major", label: "Major", color: "text-destructive" },
  { value: "minor", label: "Minor", color: "text-warning" },
  { value: "patch", label: "Patch", color: "text-success" },
  { value: "hotfix", label: "Hotfix", color: "text-primary" },
];

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "مسودة", variant: "secondary" },
  testing: { label: "قيد الاختبار", variant: "outline" },
  published: { label: "منشور", variant: "default" },
  archived: { label: "مؤرشف", variant: "destructive" },
};

interface VersionForm {
  version_code: string;
  version_name: string;
  description: string;
  change_type: string;
  release_notes: string;
  modules_updated: string[];
  total_files_changed: number;
  build_size_kb: number;
}

const emptyForm: VersionForm = {
  version_code: "",
  version_name: "",
  description: "",
  change_type: "patch",
  release_notes: "",
  modules_updated: [],
  total_files_changed: 0,
  build_size_kb: 0,
};

const VersionManager = () => {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<VersionForm>({ ...emptyForm });
  const [editId, setEditId] = useState<string | null>(null);

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["platform-versions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_versions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: VersionForm & { id?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (payload.id) {
        const { error } = await supabase
          .from("platform_versions")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("platform_versions")
          .insert({ ...payload, created_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-versions"] });
      setDialogOpen(false);
      setForm({ ...emptyForm });
      setEditId(null);
      toast.success(editId ? "تم تحديث الإصدار" : "تم إنشاء إصدار جديد");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (status === "published") updates.published_at = new Date().toISOString();
      const { error } = await supabase.from("platform_versions").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-versions"] });
      toast.success("تم تحديث الحالة");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("platform_versions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-versions"] });
      toast.success("تم حذف الإصدار");
    },
  });

  const openEdit = (v: any) => {
    setEditId(v.id);
    setForm({
      version_code: v.version_code,
      version_name: v.version_name || "",
      description: v.description || "",
      change_type: v.change_type || "patch",
      release_notes: v.release_notes || "",
      modules_updated: v.modules_updated || [],
      total_files_changed: v.total_files_changed || 0,
      build_size_kb: v.build_size_kb || 0,
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const toggleModule = (mod: string) => {
    setForm(f => ({
      ...f,
      modules_updated: f.modules_updated.includes(mod)
        ? f.modules_updated.filter(m => m !== mod)
        : [...f.modules_updated, mod],
    }));
  };

  const publishedCount = versions.filter((v: any) => v.status === "published").length;
  const draftCount = versions.filter((v: any) => v.status === "draft").length;
  const latestVersion = versions[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
            <GitBranch className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">إدارة الإصدارات</h1>
            <p className="text-sm text-muted-foreground">تتبع وإدارة جميع تحديثات المنصة</p>
          </div>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" /> إصدار جديد
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{versions.length}</p>
              <p className="text-xs text-muted-foreground">إجمالي الإصدارات</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{publishedCount}</p>
              <p className="text-xs text-muted-foreground">منشورة</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{draftCount}</p>
              <p className="text-xs text-muted-foreground">مسودات</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
              <Tag className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground font-mono">{latestVersion?.version_code || "—"}</p>
              <p className="text-xs text-muted-foreground">آخر إصدار</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Versions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" /> سجل الإصدارات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
          ) : versions.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <GitBranch className="w-12 h-12 mx-auto text-muted-foreground/30" />
              <p className="text-muted-foreground">لا توجد إصدارات بعد</p>
              <Button size="sm" onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> أنشئ أول إصدار</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((v: any) => {
                const st = STATUS_MAP[v.status] || STATUS_MAP.draft;
                const ct = CHANGE_TYPES.find(c => c.value === v.change_type);
                return (
                  <div key={v.id} className="glass-card p-4 flex flex-col md:flex-row md:items-center gap-3 group hover:border-primary/30 transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-foreground text-lg">{v.version_code}</span>
                        <Badge variant={st.variant}>{st.label}</Badge>
                        {ct && <span className={`text-xs font-semibold ${ct.color}`}>{ct.label}</span>}
                      </div>
                      {v.version_name && <p className="text-sm font-semibold text-foreground mt-1">{v.version_name}</p>}
                      {v.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{v.description}</p>}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {v.modules_updated?.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {v.modules_updated.map((m: string) => (
                              <Badge key={m} variant="outline" className="text-[10px] px-1.5 py-0">{m}</Badge>
                            ))}
                          </div>
                        )}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(v.created_at).toLocaleDateString("ar-MA")}
                        </span>
                        {v.total_files_changed > 0 && (
                          <span className="text-[10px] text-muted-foreground">{v.total_files_changed} ملف</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {v.status === "draft" && (
                        <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={() => statusMutation.mutate({ id: v.id, status: "testing" })}>
                          <AlertTriangle className="w-3 h-3" /> اختبار
                        </Button>
                      )}
                      {(v.status === "draft" || v.status === "testing") && (
                        <Button size="sm" className="gap-1 h-8 text-xs" onClick={() => statusMutation.mutate({ id: v.id, status: "published" })}>
                          <Rocket className="w-3 h-3" /> نشر
                        </Button>
                      )}
                      {v.status === "published" && (
                        <Button size="sm" variant="secondary" className="gap-1 h-8 text-xs" onClick={() => statusMutation.mutate({ id: v.id, status: "archived" })}>
                          أرشفة
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(v)}>
                        <FileEdit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => {
                        if (confirm("حذف هذا الإصدار؟")) deleteMutation.mutate(v.id);
                      }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-primary" />
              {editId ? "تعديل الإصدار" : "إصدار جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">رقم الإصدار *</label>
                <Input
                  placeholder="30.03.2026-v2"
                  value={form.version_code}
                  onChange={e => setForm(f => ({ ...f, version_code: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">نوع التحديث</label>
                <Select value={form.change_type} onValueChange={v => setForm(f => ({ ...f, change_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHANGE_TYPES.map(ct => (
                      <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">اسم الإصدار</label>
              <Input
                placeholder="تحسينات الأداء"
                value={form.version_name}
                onChange={e => setForm(f => ({ ...f, version_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">الوصف</label>
              <Textarea
                placeholder="وصف مختصر للتحديث..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">ملاحظات الإصدار</label>
              <Textarea
                placeholder="- إصلاح خطأ في...&#10;- تحسين أداء...&#10;- إضافة ميزة..."
                value={form.release_notes}
                onChange={e => setForm(f => ({ ...f, release_notes: e.target.value }))}
                rows={4}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">الموديولات المحدّثة</label>
              <div className="grid grid-cols-2 gap-2">
                {MODULES.map(mod => (
                  <label key={mod.id} className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-secondary/50 cursor-pointer transition-colors">
                    <Checkbox
                      checked={form.modules_updated.includes(mod.id)}
                      onCheckedChange={() => toggleModule(mod.id)}
                    />
                    <span className="text-sm">{mod.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">عدد الملفات المتغيرة</label>
                <Input
                  type="number"
                  value={form.total_files_changed}
                  onChange={e => setForm(f => ({ ...f, total_files_changed: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">حجم البناء (KB)</label>
                <Input
                  type="number"
                  value={form.build_size_kb}
                  onChange={e => setForm(f => ({ ...f, build_size_kb: Number(e.target.value) }))}
                />
              </div>
            </div>
            <Button
              className="w-full gap-2"
              disabled={!form.version_code || saveMutation.isPending}
              onClick={() => saveMutation.mutate({ ...form, ...(editId ? { id: editId } : {}) })}
            >
              {saveMutation.isPending ? "جاري الحفظ..." : editId ? "تحديث" : "إنشاء إصدار"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VersionManager;
