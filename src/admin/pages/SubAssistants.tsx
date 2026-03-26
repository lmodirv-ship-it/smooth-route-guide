import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, Bot, Bell, UtensilsCrossed,
  BarChart3, MessageSquareWarning, Shield, Loader2, Power,
  BrainCircuit, Zap
} from "lucide-react";

const ICON_MAP: Record<string, any> = {
  bot: Bot, bell: Bell, utensils: UtensilsCrossed,
  "bar-chart-3": BarChart3, "message-square-warning": MessageSquareWarning,
  shield: Shield, brain: BrainCircuit, zap: Zap,
};

const ICON_OPTIONS = [
  { value: "bot", label: "🤖 روبوت" },
  { value: "bell", label: "🔔 إشعارات" },
  { value: "utensils", label: "🍽️ مطاعم" },
  { value: "bar-chart-3", label: "📊 تقارير" },
  { value: "message-square-warning", label: "⚠️ شكاوى" },
  { value: "shield", label: "🛡️ أمان" },
  { value: "brain", label: "🧠 ذكاء" },
  { value: "zap", label: "⚡ سريع" },
];

const COLOR_OPTIONS = [
  "#3b82f6", "#8b5cf6", "#f97316", "#10b981",
  "#ef4444", "#ec4899", "#14b8a6", "#f59e0b",
];

interface SubAssistant {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  assistant_type: string;
  system_prompt: string;
  allowed_tables: string[];
  allowed_tools: string[];
  is_active: boolean;
  icon: string;
  color: string;
  max_actions_per_minute: number;
  created_at: string;
}

const emptyForm = {
  name: "", name_ar: "", description: "", assistant_type: "general",
  system_prompt: "", allowed_tables: "", allowed_tools: "",
  icon: "bot", color: "#3b82f6", max_actions_per_minute: 10,
};

const SubAssistants = () => {
  const [assistants, setAssistants] = useState<SubAssistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<SubAssistant | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchAssistants = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sub_assistants")
      .select("*")
      .order("created_at") as any;
    setAssistants(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAssistants(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (a: SubAssistant) => {
    setEditing(a);
    setForm({
      name: a.name,
      name_ar: a.name_ar,
      description: a.description,
      assistant_type: a.assistant_type,
      system_prompt: a.system_prompt,
      allowed_tables: a.allowed_tables.join(", "),
      allowed_tools: a.allowed_tools.join(", "),
      icon: a.icon,
      color: a.color,
      max_actions_per_minute: a.max_actions_per_minute,
    });
    setShowDialog(true);
  };

  const save = async () => {
    setSaving(true);
    const payload = {
      name: form.name,
      name_ar: form.name_ar,
      description: form.description,
      assistant_type: form.assistant_type,
      system_prompt: form.system_prompt,
      allowed_tables: form.allowed_tables.split(",").map(s => s.trim()).filter(Boolean),
      allowed_tools: form.allowed_tools.split(",").map(s => s.trim()).filter(Boolean),
      icon: form.icon,
      color: form.color,
      max_actions_per_minute: form.max_actions_per_minute,
      updated_at: new Date().toISOString(),
    };

    if (editing) {
      const { error } = await supabase.from("sub_assistants").update(payload).eq("id", editing.id) as any;
      if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); }
      else { toast({ title: "تم تحديث المساعد ✅" }); }
    } else {
      const { error } = await supabase.from("sub_assistants").insert(payload) as any;
      if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); }
      else { toast({ title: "تم إنشاء المساعد ✅" }); }
    }

    setSaving(false);
    setShowDialog(false);
    fetchAssistants();
  };

  const toggleActive = async (a: SubAssistant) => {
    await supabase.from("sub_assistants").update({ is_active: !a.is_active, updated_at: new Date().toISOString() }).eq("id", a.id) as any;
    fetchAssistants();
    toast({ title: a.is_active ? "تم تعطيل المساعد" : "تم تفعيل المساعد ✅" });
  };

  const deleteAssistant = async (a: SubAssistant) => {
    if (!confirm(`حذف "${a.name_ar}"؟ هذا الإجراء لا يمكن التراجع عنه.`)) return;
    await supabase.from("sub_assistants").delete().eq("id", a.id) as any;
    fetchAssistants();
    toast({ title: "تم حذف المساعد 🗑️" });
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <BrainCircuit className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">المساعدون الفرعيون</h1>
            <p className="text-sm text-muted-foreground">إدارة وكلاء الذكاء الاصطناعي المتخصصين</p>
          </div>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-4 h-4" /> إنشاء مساعد جديد
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-muted/30">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-foreground">{assistants.length}</div>
            <div className="text-sm text-muted-foreground">إجمالي المساعدين</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-500">{assistants.filter(a => a.is_active).length}</div>
            <div className="text-sm text-muted-foreground">نشط</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-red-500">{assistants.filter(a => !a.is_active).length}</div>
            <div className="text-sm text-muted-foreground">معطّل</div>
          </CardContent>
        </Card>
      </div>

      {/* Assistants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assistants.map((a) => {
          const IconComp = ICON_MAP[a.icon] || Bot;
          return (
            <Card key={a.id} className={`relative overflow-hidden transition-all ${!a.is_active ? "opacity-60" : "hover:shadow-lg"}`}>
              {/* Color accent */}
              <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: a.color }} />
              
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${a.color}20` }}>
                      <IconComp className="w-5 h-5" style={{ color: a.color }} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{a.name_ar}</CardTitle>
                      <p className="text-xs text-muted-foreground">{a.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={a.is_active ? "default" : "secondary"} className="text-xs">
                      {a.is_active ? "نشط" : "معطّل"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{a.description}</p>
                
                <div className="flex flex-wrap gap-1">
                  {a.allowed_tools.slice(0, 4).map(t => (
                    <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                  ))}
                  {a.allowed_tools.length > 4 && (
                    <Badge variant="outline" className="text-xs">+{a.allowed_tools.length - 4}</Badge>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  📊 الجداول: {a.allowed_tables.length} | ⚡ الحد: {a.max_actions_per_minute}/دقيقة
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Button size="sm" variant="outline" onClick={() => openEdit(a)} className="gap-1">
                    <Pencil className="w-3 h-3" /> تعديل
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleActive(a)} className="gap-1">
                    <Power className="w-3 h-3" /> {a.is_active ? "تعطيل" : "تفعيل"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteAssistant(a)} className="gap-1 mr-auto">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {assistants.length === 0 && (
        <Card className="p-12 text-center">
          <Bot className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">لا يوجد مساعدون فرعيون</h3>
          <p className="text-muted-foreground mb-4">أنشئ مساعداً فرعياً لتفويض المهام تلقائياً</p>
          <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" /> إنشاء أول مساعد</Button>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-primary" />
              {editing ? "تعديل المساعد" : "إنشاء مساعد فرعي جديد"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الاسم (إنجليزي)</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Communications Assistant" />
              </div>
              <div>
                <Label>الاسم (عربي)</Label>
                <Input value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} placeholder="مساعد التواصل" />
              </div>
            </div>

            <div>
              <Label>الوصف</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="وصف مختصر لمهام هذا المساعد" />
            </div>

            <div>
              <Label>النوع</Label>
              <Input value={form.assistant_type} onChange={e => setForm({ ...form, assistant_type: e.target.value })} placeholder="communications, reports, complaints..." />
            </div>

            {/* System Prompt */}
            <div>
              <Label>التعليمات (System Prompt)</Label>
              <Textarea
                value={form.system_prompt}
                onChange={e => setForm({ ...form, system_prompt: e.target.value })}
                placeholder="أنت مساعد متخصص في..."
                rows={4}
              />
            </div>

            {/* Permissions */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الجداول المسموحة (مفصولة بفاصلة)</Label>
                <Textarea
                  value={form.allowed_tables}
                  onChange={e => setForm({ ...form, allowed_tables: e.target.value })}
                  placeholder="notifications, profiles, ..."
                  rows={2}
                />
              </div>
              <div>
                <Label>الأدوات المسموحة (مفصولة بفاصلة)</Label>
                <Textarea
                  value={form.allowed_tools}
                  onChange={e => setForm({ ...form, allowed_tools: e.target.value })}
                  placeholder="db_select, bulk_notify, ..."
                  rows={2}
                />
              </div>
            </div>

            {/* Appearance */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الأيقونة</Label>
                <select
                  value={form.icon}
                  onChange={e => setForm({ ...form, icon: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {ICON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <Label>الحد الأقصى (عملية/دقيقة)</Label>
                <Input
                  type="number"
                  value={form.max_actions_per_minute}
                  onChange={e => setForm({ ...form, max_actions_per_minute: +e.target.value })}
                />
              </div>
            </div>

            {/* Color */}
            <div>
              <Label>اللون</Label>
              <div className="flex gap-2 mt-1">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${form.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <Button onClick={save} className="w-full" disabled={saving || !form.name_ar}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editing ? "تحديث المساعد" : "إنشاء المساعد"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubAssistants;
