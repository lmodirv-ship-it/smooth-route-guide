import { useState, useEffect } from "react";
import { Key, Eye, EyeOff, Save, Loader2, CheckCircle, Plus, Trash2, Edit2, X, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
  { key: "google_maps_api_key", label: "Google Maps API Key", description: "خرائط، مسافات، ملاحة", placeholder: "AIza...", group: "google" },
  { key: "google_places_api_key", label: "Google Places API Key", description: "بحث المطاعم والمتاجر", placeholder: "AIza...", group: "google" },
  { key: "google_geocoding_api_key", label: "Google Geocoding API Key", description: "تحويل العناوين لإحداثيات", placeholder: "AIza...", group: "google" },
  { key: "google_directions_api_key", label: "Google Directions API Key", description: "حساب المسارات", placeholder: "AIza...", group: "google" },
  { key: "google_translate_api_key", label: "Google Translation API Key", description: "الترجمة التلقائية", placeholder: "AIza...", group: "google" },
  { key: "paypal_client_id", label: "PayPal Client ID (Sandbox)", description: "مدفوعات الاختبار", placeholder: "AX...", group: "payment" },
  { key: "paypal_client_id_live", label: "PayPal Client ID (Live)", description: "مدفوعات حقيقية", placeholder: "AX...", group: "payment" },
  { key: "paypal_secret_key", label: "PayPal Secret Key", description: "المفتاح السري", placeholder: "EL...", group: "payment" },
  { key: "paypal_env", label: "PayPal Environment", description: "sandbox أو live", placeholder: "sandbox", group: "payment" },
  { key: "stripe_publishable_key", label: "Stripe Publishable Key", description: "مفتاح Stripe العام", placeholder: "pk_live_...", group: "payment" },
  { key: "stripe_secret_key", label: "Stripe Secret Key", description: "المفتاح السري", placeholder: "sk_live_...", group: "payment" },
  { key: "twilio_api_key", label: "Twilio API Key", description: "مكالمات ورسائل", placeholder: "SK...", group: "communication" },
  { key: "twilio_phone_number", label: "Twilio Phone Number", description: "رقم الهاتف", placeholder: "+1...", group: "communication" },
  { key: "mailbluster_api_key", label: "MailBluster API Key", description: "حملات البريد", placeholder: "...", group: "communication" },
  { key: "lovable_api_key", label: "Lovable API Key", description: "المساعد الذكي", placeholder: "...", group: "platform" },
];

const GROUP_LABELS: Record<string, string> = {
  google: "🗺️ خدمات Google",
  payment: "💳 خدمات الدفع",
  communication: "📞 التواصل والرسائل",
  platform: "🤖 المنصة والذكاء الاصطناعي",
};

const ApiKeysSettings = () => {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, "saved" | null>>({});
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
    return key.slice(0, 4) + "••••" + key.slice(-4);
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

  const handleSaveKey = async (fieldKey: string) => {
    const value = keys[fieldKey];
    if (!value?.trim()) {
      toast({ title: "❌ أدخل المفتاح أولاً", variant: "destructive" });
      return;
    }
    setSaving(fieldKey);
    try {
      const updatedKeys = { ...keys, [fieldKey]: value.trim() };
      await saveToDb("api_keys", updatedKeys);
      setStatuses(s => ({ ...s, [fieldKey]: "saved" }));
      toast({ title: "✅ تم الحفظ" });
      setTimeout(() => setStatuses(s => ({ ...s, [fieldKey]: null })), 3000);
    } catch (err: any) {
      toast({ title: "❌ فشل الحفظ", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const handleAddCustomKey = async () => {
    if (!newName.trim() || !newValue.trim()) {
      toast({ title: "❌ أدخل الاسم والقيمة", variant: "destructive" });
      return;
    }
    setSaving("custom_new");
    try {
      const newEntry: CustomApiKey = { id: crypto.randomUUID(), name: newName.trim(), role: newRole.trim() || "عام", value: newValue.trim() };
      const updated = [...customKeys, newEntry];
      await saveToDb("custom_api_keys", updated);
      setCustomKeys(updated);
      setNewName(""); setNewRole(""); setNewValue("");
      toast({ title: `✅ تم إضافة "${newEntry.name}"` });
    } catch (err: any) {
      toast({ title: "❌ فشل الإضافة", variant: "destructive" });
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
    } catch { toast({ title: "❌ فشل الحذف", variant: "destructive" }); }
    finally { setSaving(null); }
  };

  const handleUpdateCustomKey = async (id: string) => {
    setSaving(id);
    try {
      const updated = customKeys.map(k => k.id === id ? { ...k, name: editName.trim() || k.name, role: editRole.trim() || k.role } : k);
      await saveToDb("custom_api_keys", updated);
      setCustomKeys(updated);
      setEditingId(null);
      toast({ title: "✅ تم التحديث" });
    } catch { toast({ title: "❌ فشل التحديث", variant: "destructive" }); }
    finally { setSaving(null); }
  };

  const handleSaveCustomValue = async (id: string, val: string) => {
    setSaving(id);
    try {
      const updated = customKeys.map(k => k.id === id ? { ...k, value: val.trim() } : k);
      await saveToDb("custom_api_keys", updated);
      setCustomKeys(updated);
      setStatuses(s => ({ ...s, [id]: "saved" }));
      toast({ title: "✅ تم الحفظ" });
      setTimeout(() => setStatuses(s => ({ ...s, [id]: null })), 3000);
    } catch { toast({ title: "❌ فشل الحفظ", variant: "destructive" }); }
    finally { setSaving(null); }
  };

  const groups = [...new Set(API_KEY_FIELDS.map(f => f.group))];

  return (
    <div className="space-y-6">
      {/* Built-in API Keys by group */}
      {groups.map((group) => (
        <Card key={group} className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-right text-base">{GROUP_LABELS[group] || group}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-10">إجراء</TableHead>
                    <TableHead className="text-center w-20">التفعيل</TableHead>
                    <TableHead className="text-right min-w-[200px]">المفتاح</TableHead>
                    <TableHead className="text-right min-w-[120px]">الوظيفة</TableHead>
                    <TableHead className="text-right min-w-[160px]">الاسم</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {API_KEY_FIELDS.filter(f => f.group === group).map((field) => {
                    const hasValue = !!keys[field.key]?.trim();
                    return (
                      <TableRow key={field.key}>
                        <TableCell className="text-center">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSaveKey(field.key)} disabled={saving === field.key}>
                            {saving === field.key ? <Loader2 className="w-4 h-4 animate-spin" /> : statuses[field.key] === "saved" ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Save className="w-4 h-4" />}
                          </Button>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={hasValue ? "default" : "secondary"} className={hasValue ? "bg-green-600 hover:bg-green-700 text-white" : ""}>
                            {hasValue ? "مفعّل" : "غير مفعّل"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setVisibility(v => ({ ...v, [field.key]: !v[field.key] }))}>
                              {visibility[field.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </Button>
                            <Input
                              dir="ltr"
                              type={visibility[field.key] ? "text" : "password"}
                              placeholder={field.placeholder}
                              value={keys[field.key] || ""}
                              onChange={(e) => setKeys(k => ({ ...k, [field.key]: e.target.value }))}
                              className="font-mono text-xs h-8"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{field.description}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className="font-medium text-sm">{field.label}</span>
                            <Key className="w-3.5 h-3.5 text-primary shrink-0" />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Custom API Keys */}
      <Card className="border-accent/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-right text-base">➕ معرّفات مخصصة</CardTitle>
          <p className="text-xs text-muted-foreground text-right">أضف أي معرّف أو مفتاح API مخصص</p>
        </CardHeader>
        <CardContent className="space-y-4 p-0">
          {/* Add new row */}
          <div className="px-4 pb-2">
            <div className="flex items-end gap-2 flex-wrap">
              <div className="flex-1 min-w-[120px]">
                <label className="text-xs text-muted-foreground block text-right mb-1">الاسم *</label>
                <Input dir="rtl" placeholder="مثال: Twilio SID" value={newName} onChange={e => setNewName(e.target.value)} className="text-sm h-8" />
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="text-xs text-muted-foreground block text-right mb-1">الوظيفة</label>
                <Input dir="rtl" placeholder="مثال: إرسال الرسائل" value={newRole} onChange={e => setNewRole(e.target.value)} className="text-sm h-8" />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs text-muted-foreground block text-right mb-1">المفتاح *</label>
                <Input dir="ltr" type="password" placeholder="أدخل القيمة..." value={newValue} onChange={e => setNewValue(e.target.value)} className="font-mono text-sm h-8" />
              </div>
              <Button size="sm" onClick={handleAddCustomKey} disabled={saving === "custom_new"} className="h-8 gap-1">
                {saving === "custom_new" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                إضافة
              </Button>
            </div>
          </div>

          {/* Custom keys table */}
          {customKeys.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-20">إجراءات</TableHead>
                    <TableHead className="text-center w-20">التفعيل</TableHead>
                    <TableHead className="text-right min-w-[200px]">المفتاح</TableHead>
                    <TableHead className="text-right min-w-[120px]">الوظيفة</TableHead>
                    <TableHead className="text-right min-w-[140px]">الاسم</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customKeys.map((ck) => {
                    const isEditing = editingId === ck.id;
                    return (
                      <TableRow key={ck.id}>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSaveCustomValue(ck.id, ck.value)} disabled={saving === ck.id}>
                              {saving === ck.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : statuses[ck.id] === "saved" ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Save className="w-3.5 h-3.5" />}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteCustomKey(ck.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                            {isEditing ? (
                              <>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleUpdateCustomKey(ck.id)}><Check className="w-3.5 h-3.5 text-green-500" /></Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="w-3.5 h-3.5" /></Button>
                              </>
                            ) : (
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(ck.id); setEditName(ck.name); setEditRole(ck.role); }}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={ck.value?.trim() ? "default" : "secondary"} className={ck.value?.trim() ? "bg-green-600 hover:bg-green-700 text-white" : ""}>
                            {ck.value?.trim() ? "مفعّل" : "غير مفعّل"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setVisibility(v => ({ ...v, [ck.id]: !v[ck.id] }))}>
                              {visibility[ck.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </Button>
                            <Input
                              dir="ltr"
                              type={visibility[ck.id] ? "text" : "password"}
                              value={ck.value}
                              onChange={(e) => setCustomKeys(prev => prev.map(k => k.id === ck.id ? { ...k, value: e.target.value } : k))}
                              className="font-mono text-xs h-8"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <Input dir="rtl" className="text-xs h-8" value={editRole} onChange={e => setEditRole(e.target.value)} />
                          ) : (
                            <span className="text-xs text-muted-foreground">{ck.role}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <Input dir="rtl" className="text-sm h-8" value={editName} onChange={e => setEditName(e.target.value)} />
                          ) : (
                            <div className="flex items-center gap-1.5 justify-end">
                              <span className="font-medium text-sm">{ck.name}</span>
                              <Key className="w-3.5 h-3.5 text-primary shrink-0" />
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {customKeys.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">لا توجد معرّفات مخصصة بعد</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiKeysSettings;
