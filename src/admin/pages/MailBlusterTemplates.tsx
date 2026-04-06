import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Mail, Plus, Eye, Send, Loader2, RefreshCw, Pencil, Trash2 } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  user: "👤 عميل",
  driver: "🚗 سائق ركاب",
  delivery: "📦 سائق توصيل",
  store_owner: "🏪 صاحب محل",
  admin: "🔑 مسؤول",
  agent: "📞 مركز اتصال",
};

interface Template {
  id: string;
  role: string;
  template_name: string;
  subject: string;
  body_html: string;
  is_active: boolean;
  send_delay_hours: number;
  sort_order: number;
}

const MailBlusterTemplates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<string>("all");
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  const [form, setForm] = useState({
    role: "user",
    template_name: "",
    subject: "",
    body_html: "",
    send_delay_hours: 0,
    sort_order: 0,
    is_active: true,
  });

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("mailbluster_templates")
      .select("*")
      .order("role")
      .order("sort_order");
    setTemplates((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleSave = async () => {
    if (!form.template_name || !form.subject) {
      toast({ title: "خطأ", description: "اسم النموذج والموضوع مطلوبان", variant: "destructive" });
      return;
    }

    if (editTemplate) {
      const { error } = await supabase
        .from("mailbluster_templates")
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq("id", editTemplate.id);
      if (error) {
        toast({ title: "خطأ", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "تم التحديث ✅" });
      }
    } else {
      const { error } = await supabase
        .from("mailbluster_templates")
        .insert(form as any);
      if (error) {
        toast({ title: "خطأ", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "تم الإنشاء ✅" });
      }
    }

    setShowEditor(false);
    setEditTemplate(null);
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("mailbluster_templates").delete().eq("id", id);
    if (!error) {
      toast({ title: "تم الحذف" });
      fetchTemplates();
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from("mailbluster_templates").update({ is_active: active } as any).eq("id", id);
    fetchTemplates();
  };

  const handleBulkSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("mailbluster-sync", {
        body: { action: "bulk_sync_users" },
      });
      if (error) throw error;
      toast({ title: `تم المزامنة ✅`, description: `${data.synced}/${data.total} مستخدم` });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
    setSyncing(false);
  };

  const openEdit = (tpl: Template) => {
    setEditTemplate(tpl);
    setForm({
      role: tpl.role,
      template_name: tpl.template_name,
      subject: tpl.subject,
      body_html: tpl.body_html,
      send_delay_hours: tpl.send_delay_hours,
      sort_order: tpl.sort_order,
      is_active: tpl.is_active,
    });
    setShowEditor(true);
  };

  const openNew = () => {
    setEditTemplate(null);
    setForm({ role: "user", template_name: "", subject: "", body_html: "", send_delay_hours: 0, sort_order: 0, is_active: true });
    setShowEditor(true);
  };

  const filtered = filterRole === "all" ? templates : templates.filter(t => t.role === filterRole);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Mail className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">نماذج المراسلات — MailBluster</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBulkSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <RefreshCw className="h-4 w-4 ml-2" />}
            مزامنة جميع المستخدمين
          </Button>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 ml-2" /> نموذج جديد
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant={filterRole === "all" ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilterRole("all")}>الكل</Badge>
        {Object.entries(ROLE_LABELS).map(([key, label]) => (
          <Badge key={key} variant={filterRole === key ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilterRole(key)}>
            {label}
          </Badge>
        ))}
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(tpl => (
            <Card key={tpl.id} className={`${!tpl.is_active ? "opacity-50" : ""}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{ROLE_LABELS[tpl.role] || tpl.role}</Badge>
                  <Switch checked={tpl.is_active} onCheckedChange={(v) => handleToggle(tpl.id, v)} />
                </div>
                <CardTitle className="text-sm mt-2">{tpl.subject}</CardTitle>
                <p className="text-xs text-muted-foreground">{tpl.template_name}</p>
              </CardHeader>
              <CardContent>
                {tpl.send_delay_hours > 0 && (
                  <p className="text-xs text-muted-foreground mb-2">⏱ يُرسل بعد {tpl.send_delay_hours} ساعة</p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setPreviewHtml(tpl.body_html); setShowPreview(true); }}>
                    <Eye className="h-3 w-3 ml-1" /> معاينة
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(tpl)}>
                    <Pencil className="h-3 w-3 ml-1" /> تعديل
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(tpl.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>معاينة النموذج</DialogTitle>
          </DialogHeader>
          <div
            className="border rounded-lg p-4 bg-white"
            dangerouslySetInnerHTML={{ __html: previewHtml.replace(/\{\{firstName\}\}/g, "أحمد").replace(/\{\{lastName\}\}/g, "").replace(/\{\{email\}\}/g, "ahmed@example.com") }}
          />
        </DialogContent>
      </Dialog>

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editTemplate ? "تعديل النموذج" : "نموذج جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">الدور</label>
                <Select value={form.role} onValueChange={(v) => setForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">اسم النموذج</label>
                <Input value={form.template_name} onChange={e => setForm(f => ({ ...f, template_name: e.target.value }))} placeholder="welcome_client" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">موضوع الرسالة</label>
              <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="مرحباً بك في HN Driver!" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">التأخير (ساعات)</label>
                <Input type="number" value={form.send_delay_hours} onChange={e => setForm(f => ({ ...f, send_delay_hours: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="text-sm font-medium">ترتيب العرض</label>
                <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">محتوى HTML</label>
              <p className="text-xs text-muted-foreground mb-1">متغيرات: {"{{firstName}}"} {"{{lastName}}"} {"{{email}}"} {"{{role}}"}</p>
              <Textarea value={form.body_html} onChange={e => setForm(f => ({ ...f, body_html: e.target.value }))} rows={12} className="font-mono text-xs" dir="ltr" />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setShowEditor(false)}>إلغاء</Button>
              <Button onClick={handleSave}>
                {editTemplate ? "حفظ التعديلات" : "إنشاء النموذج"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MailBlusterTemplates;
