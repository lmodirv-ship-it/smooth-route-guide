import { useState, useEffect } from "react";
import { Key, Eye, EyeOff, Save, Loader2, CheckCircle, AlertCircle, Plus, Trash2, Edit2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ApiKeyField {
  key: string;
  label: string;
  description: string;
  placeholder: string;
  group: string;
}

interface CustomApiKey {
  id: string;
  name: string;
  role: string;
  value: string;
}

const API_KEY_FIELDS: ApiKeyField[] = [
  // Google Services
  { key: "google_maps_api_key", label: "Google Maps API Key", description: "مفتاح Google Maps للخرائط، تقدير المسافات، والملاحة الحية", placeholder: "AIza...", group: "google" },
  { key: "google_places_api_key", label: "Google Places API Key", description: "مفتاح Google Places للبحث عن المطاعم والمتاجر والشركاء", placeholder: "AIza...", group: "google" },
  { key: "google_geocoding_api_key", label: "Google Geocoding API Key", description: "مفتاح تحويل العناوين إلى إحداثيات والعكس", placeholder: "AIza...", group: "google" },
  { key: "google_directions_api_key", label: "Google Directions API Key", description: "مفتاح حساب المسارات والاتجاهات بين النقاط", placeholder: "AIza...", group: "google" },
  { key: "google_translate_api_key", label: "Google Cloud Translation API Key", description: "مفتاح الترجمة التلقائية للمحتوى والواجهات", placeholder: "AIza...", group: "google" },
  // Payment Services
  { key: "paypal_client_id", label: "PayPal Client ID (Sandbox)", description: "معرف تطبيق PayPal للمدفوعات (وضع الاختبار)", placeholder: "AX...", group: "payment" },
  { key: "paypal_client_id_live", label: "PayPal Client ID (Live)", description: "معرف تطبيق PayPal للمدفوعات الحقيقية", placeholder: "AX...", group: "payment" },
  { key: "paypal_secret_key", label: "PayPal Secret Key", description: "المفتاح السري لتطبيق PayPal", placeholder: "EL...", group: "payment" },
  { key: "paypal_env", label: "PayPal Environment", description: "بيئة PayPal: sandbox أو live", placeholder: "sandbox", group: "payment" },
  { key: "stripe_publishable_key", label: "Stripe Publishable Key", description: "مفتاح Stripe العام للمدفوعات", placeholder: "pk_live_...", group: "payment" },
  { key: "stripe_secret_key", label: "Stripe Secret Key", description: "المفتاح السري لـ Stripe (يستخدم في الخادم فقط)", placeholder: "sk_live_...", group: "payment" },
  // Communication - Twilio
  { key: "twilio_api_key", label: "Twilio API Key", description: "مفتاح Twilio للمكالمات الهاتفية والرسائل النصية و TURN servers", placeholder: "SK...", group: "communication" },
  { key: "twilio_phone_number", label: "Twilio Phone Number", description: "رقم هاتف Twilio المستخدم لإرسال المكالمات والرسائل", placeholder: "+1...", group: "communication" },
  // Communication - Email
  { key: "mailbluster_api_key", label: "MailBluster API Key", description: "مفتاح MailBluster لإدارة حملات البريد الإلكتروني", placeholder: "...", group: "communication" },
  // Platform
  { key: "lovable_api_key", label: "Lovable API Key", description: "مفتاح Lovable AI للمساعد الذكي، الشات بوت، وتوليد المحتوى", placeholder: "...", group: "platform" },
];

const GROUP_LABELS: Record<string, { label: string }> = {
  google: { label: "🗺️ خدمات Google" },
  payment: { label: "💳 خدمات الدفع" },
  communication: { label: "📞 التواصل والرسائل" },
  platform: { label: "🤖 المنصة والذكاء الاصطناعي" },
};

const ApiKeysSettings = () => {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, "saved" | "error" | null>>({});

  // Custom keys state
  const [customKeys, setCustomKeys] = useState<CustomApiKey[]>([]);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newValue, setNewValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["api_keys", "custom_api_keys"]);

      if (data) {
        const apiKeysRow = data.find(d => d.key === "api_keys");
        if (apiKeysRow?.value) setKeys(apiKeysRow.value as Record<string, string>);

        const customRow = data.find(d => d.key === "custom_api_keys");
        if (customRow?.value) setCustomKeys(customRow.value as unknown as CustomApiKey[]);
      }
    };
    load();
  }, []);

  const maskKey = (key: string) => {
    if (!key || key.length < 8) return "••••••••";
    return key.slice(0, 6) + "••••••••" + key.slice(-4);
  };

  const saveToDb = async (keyName: string, value: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: existing } = await supabase.from("app_settings").select("id").eq("key", keyName).maybeSingle();
    if (existing) {
      await supabase.from("app_settings").update({ value: value as any, updated_at: new Date().toISOString(), updated_by: user?.id }).eq("key", keyName);
    } else {
      await supabase.from("app_settings").insert({ key: keyName, value: value as any, updated_by: user?.id });
    }
  };

  const handleSaveKey = async (field: ApiKeyField) => {
    const value = keys[field.key];
    if (!value?.trim()) {
      toast({ title: "❌ أدخل المفتاح أولاً", variant: "destructive" });
      return;
    }
    setSaving(field.key);
    try {
      const updatedKeys = { ...keys, [field.key]: value.trim() };
      await saveToDb("api_keys", updatedKeys);
      setStatuses(s => ({ ...s, [field.key]: "saved" }));
      toast({ title: `✅ تم حفظ ${field.label}` });
      setTimeout(() => setStatuses(s => ({ ...s, [field.key]: null })), 3000);
    } catch (err: any) {
      setStatuses(s => ({ ...s, [field.key]: "error" }));
      toast({ title: "❌ فشل الحفظ", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  // Custom keys handlers
  const handleAddCustomKey = async () => {
    if (!newName.trim() || !newValue.trim()) {
      toast({ title: "❌ أدخل الاسم والقيمة", variant: "destructive" });
      return;
    }
    setSaving("custom_new");
    try {
      const newEntry: CustomApiKey = {
        id: crypto.randomUUID(),
        name: newName.trim(),
        role: newRole.trim() || "عام",
        value: newValue.trim(),
      };
      const updated = [...customKeys, newEntry];
      await saveToDb("custom_api_keys", updated);
      setCustomKeys(updated);
      setNewName(""); setNewRole(""); setNewValue("");
      toast({ title: `✅ تم إضافة "${newEntry.name}"` });
    } catch (err: any) {
      toast({ title: "❌ فشل الإضافة", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteCustomKey = async (id: string) => {
    setSaving(id);
    try {
      const updated = customKeys.filter(k => k.id !== id);
      await saveToDb("custom_api_keys", updated);
      setCustomKeys(updated);
      toast({ title: "🗑️ تم الحذف" });
    } catch (err: any) {
      toast({ title: "❌ فشل الحذف", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const handleUpdateCustomKey = async (id: string) => {
    setSaving(id);
    try {
      const updated = customKeys.map(k =>
        k.id === id ? { ...k, name: editName.trim() || k.name, role: editRole.trim() || k.role } : k
      );
      await saveToDb("custom_api_keys", updated);
      setCustomKeys(updated);
      setEditingId(null);
      toast({ title: "✅ تم التحديث" });
    } catch (err: any) {
      toast({ title: "❌ فشل التحديث", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const handleSaveCustomValue = async (id: string, val: string) => {
    setSaving(id);
    try {
      const updated = customKeys.map(k => k.id === id ? { ...k, value: val.trim() } : k);
      await saveToDb("custom_api_keys", updated);
      setCustomKeys(updated);
      setStatuses(s => ({ ...s, [id]: "saved" }));
      toast({ title: "✅ تم حفظ المفتاح" });
      setTimeout(() => setStatuses(s => ({ ...s, [id]: null })), 3000);
    } catch (err: any) {
      toast({ title: "❌ فشل الحفظ", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const groups = [...new Set(API_KEY_FIELDS.map(f => f.group))];

  return (
    <div className="space-y-6">
      {/* Built-in API Keys */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-right">
            <span>🔑 مفاتيح API</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground text-right">
            إدارة مفاتيح الخدمات الخارجية المستخدمة في المنصة
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          {groups.map((group) => (
            <div key={group} className="space-y-4">
              <h3 className="text-lg font-bold text-right border-b pb-2">
                {GROUP_LABELS[group]?.label || group}
              </h3>
              {group === "google" && (
                <p className="text-xs text-muted-foreground text-right bg-secondary/20 p-3 rounded-lg">
                  💡 إذا كنت تستخدم مفتاح Google واحد لكل الخدمات، أدخله في الحقل الأول فقط.
                </p>
              )}
              {API_KEY_FIELDS.filter(f => f.group === group).map((field) => (
                <div key={field.key} className="space-y-2 p-4 rounded-lg border border-border/50 bg-secondary/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {statuses[field.key] === "saved" && <CheckCircle className="w-4 h-4 text-green-500" />}
                      {statuses[field.key] === "error" && <AlertCircle className="w-4 h-4 text-destructive" />}
                      <Button size="sm" onClick={() => handleSaveKey(field)} disabled={saving === field.key} className="gap-1">
                        {saving === field.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        حفظ
                      </Button>
                    </div>
                    <div className="text-right">
                      <Label className="font-semibold flex items-center gap-2 justify-end">
                        <span>{field.label}</span>
                        <Key className="w-4 h-4 text-primary" />
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Button size="icon" variant="ghost" className="shrink-0" onClick={() => setVisibility(v => ({ ...v, [field.key]: !v[field.key] }))}>
                      {visibility[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Input dir="ltr" type={visibility[field.key] ? "text" : "password"} placeholder={field.placeholder} value={keys[field.key] || ""} onChange={(e) => setKeys(k => ({ ...k, [field.key]: e.target.value }))} className="font-mono text-sm" />
                  </div>
                  {keys[field.key] && !visibility[field.key] && (
                    <p className="text-xs text-muted-foreground text-left font-mono">{maskKey(keys[field.key])}</p>
                  )}
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Custom API Keys */}
      <Card className="border-accent/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-right">
            <span>➕ معرّفات مخصصة</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground text-right">
            أضف أي معرّف أو مفتاح API مخصص مع تحديد اسمه ودوره في المنصة
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add new custom key form */}
          <div className="p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 space-y-3">
            <h4 className="text-sm font-semibold text-right">إضافة معرّف جديد</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-right block">الاسم *</Label>
                <Input dir="rtl" placeholder="مثال: Twilio SID" value={newName} onChange={e => setNewName(e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-right block">الدور / الوظيفة</Label>
                <Input dir="rtl" placeholder="مثال: إرسال الرسائل النصية" value={newRole} onChange={e => setNewRole(e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-right block">القيمة / المفتاح *</Label>
                <Input dir="ltr" type="password" placeholder="أدخل القيمة..." value={newValue} onChange={e => setNewValue(e.target.value)} className="font-mono text-sm" />
              </div>
            </div>
            <div className="flex justify-start">
              <Button onClick={handleAddCustomKey} disabled={saving === "custom_new"} className="gap-2">
                {saving === "custom_new" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                إضافة
              </Button>
            </div>
          </div>

          {/* List of custom keys */}
          {customKeys.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">لا توجد معرّفات مخصصة بعد</p>
          )}
          {customKeys.map((ck) => (
            <div key={ck.id} className="space-y-2 p-4 rounded-lg border border-border/50 bg-secondary/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {statuses[ck.id] === "saved" && <CheckCircle className="w-4 h-4 text-green-500" />}
                  <Button size="sm" onClick={() => handleSaveCustomValue(ck.id, ck.value)} disabled={saving === ck.id} className="gap-1">
                    {saving === ck.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    حفظ
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeleteCustomKey(ck.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { setEditingId(ck.id); setEditName(ck.name); setEditRole(ck.role); }}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-right">
                  {editingId === ck.id ? (
                    <div className="flex items-center gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>إلغاء</Button>
                      <Button size="sm" onClick={() => handleUpdateCustomKey(ck.id)}>تأكيد</Button>
                      <Input dir="rtl" className="w-32 text-sm" value={editRole} onChange={e => setEditRole(e.target.value)} placeholder="الدور" />
                      <Input dir="rtl" className="w-40 text-sm" value={editName} onChange={e => setEditName(e.target.value)} placeholder="الاسم" />
                    </div>
                  ) : (
                    <>
                      <Label className="font-semibold flex items-center gap-2 justify-end">
                        <span>{ck.name}</span>
                        <Key className="w-4 h-4 text-primary" />
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">الدور: {ck.role}</p>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <Button size="icon" variant="ghost" className="shrink-0" onClick={() => setVisibility(v => ({ ...v, [ck.id]: !v[ck.id] }))}>
                  {visibility[ck.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Input
                  dir="ltr"
                  type={visibility[ck.id] ? "text" : "password"}
                  value={ck.value}
                  onChange={(e) => setCustomKeys(prev => prev.map(k => k.id === ck.id ? { ...k, value: e.target.value } : k))}
                  className="font-mono text-sm"
                />
              </div>
              {ck.value && !visibility[ck.id] && (
                <p className="text-xs text-muted-foreground text-left font-mono">{maskKey(ck.value)}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiKeysSettings;
