import { useState, useEffect } from "react";
import { Shield, Lock, Fingerprint, Eye, Clock, Save, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function SecuritySettings() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    faceAuthEnabled: true,
    faceAuthAdmin: true,
    faceAuthCallCenter: true,
    twoFactorEnabled: false,
    sessionTimeout: "60",
    maxLoginAttempts: "5",
    lockoutDuration: "15",
    passwordMinLength: "8",
    passwordRequireSpecial: true,
    passwordRequireNumbers: true,
    ipWhitelistEnabled: false,
    ipWhitelist: "",
    autoLogoutInactive: true,
    inactivityTimeout: "30",
    encryptMessages: true,
    hideRealNames: true,
    referenceOnlyMode: true,
    auditLogEnabled: true,
    auditRetentionDays: "90",
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "security_settings").maybeSingle();
      if (data?.value) {
        const v = data.value as any;
        setSettings(prev => ({ ...prev, ...v }));
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: existing } = await supabase.from("app_settings").select("id").eq("key", "security_settings").maybeSingle();
      if (existing) {
        await supabase.from("app_settings").update({ value: settings as any, updated_at: new Date().toISOString(), updated_by: user?.id }).eq("key", "security_settings");
      } else {
        await supabase.from("app_settings").insert({ key: "security_settings", value: settings as any, updated_by: user?.id });
      }
      toast({ title: "✅ تم حفظ إعدادات الأمان" });
    } catch (e: any) {
      toast({ title: "❌ خطأ", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Face Auth */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <Button onClick={handleSave} disabled={saving} size="sm" className="gradient-primary text-primary-foreground gap-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ
          </Button>
          <div className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">التحقق بالوجه (Face ID)</h3>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Switch checked={settings.faceAuthEnabled} onCheckedChange={v => setSettings(s => ({ ...s, faceAuthEnabled: v }))} />
            <label className="text-sm text-foreground">تفعيل نظام التحقق بالوجه</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.faceAuthAdmin} onCheckedChange={v => setSettings(s => ({ ...s, faceAuthAdmin: v }))} />
            <label className="text-sm text-foreground">التحقق بالوجه للمدير</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.faceAuthCallCenter} onCheckedChange={v => setSettings(s => ({ ...s, faceAuthCallCenter: v }))} />
            <label className="text-sm text-foreground">التحقق بالوجه لمركز الاتصال</label>
          </div>
        </div>
      </div>

      {/* Authentication */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4 justify-end">
          <Lock className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">المصادقة وكلمات المرور</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Switch checked={settings.twoFactorEnabled} onCheckedChange={v => setSettings(s => ({ ...s, twoFactorEnabled: v }))} />
            <label className="text-sm text-foreground">المصادقة الثنائية (2FA)</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.maxLoginAttempts} onChange={e => setSettings(s => ({ ...s, maxLoginAttempts: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">أقصى محاولات تسجيل الدخول</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.lockoutDuration} onChange={e => setSettings(s => ({ ...s, lockoutDuration: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">مدة القفل (دقائق)</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.passwordMinLength} onChange={e => setSettings(s => ({ ...s, passwordMinLength: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">الحد الأدنى لطول كلمة المرور</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.passwordRequireSpecial} onCheckedChange={v => setSettings(s => ({ ...s, passwordRequireSpecial: v }))} />
            <label className="text-sm text-foreground">تتطلب رموز خاصة (!@#$)</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.passwordRequireNumbers} onCheckedChange={v => setSettings(s => ({ ...s, passwordRequireNumbers: v }))} />
            <label className="text-sm text-foreground">تتطلب أرقام</label>
          </div>
        </div>
      </div>

      {/* Session & Privacy */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4 justify-end">
          <Eye className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">الجلسات والخصوصية</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.sessionTimeout} onChange={e => setSettings(s => ({ ...s, sessionTimeout: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">مهلة الجلسة (دقائق)</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.autoLogoutInactive} onCheckedChange={v => setSettings(s => ({ ...s, autoLogoutInactive: v }))} />
            <label className="text-sm text-foreground">تسجيل خروج تلقائي عند عدم النشاط</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.inactivityTimeout} onChange={e => setSettings(s => ({ ...s, inactivityTimeout: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">مهلة عدم النشاط (دقائق)</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.hideRealNames} onCheckedChange={v => setSettings(s => ({ ...s, hideRealNames: v }))} />
            <label className="text-sm text-foreground">إخفاء الأسماء الحقيقية (عرض Reference فقط)</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.encryptMessages} onCheckedChange={v => setSettings(s => ({ ...s, encryptMessages: v }))} />
            <label className="text-sm text-foreground">تشفير الرسائل</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.auditLogEnabled} onCheckedChange={v => setSettings(s => ({ ...s, auditLogEnabled: v }))} />
            <label className="text-sm text-foreground">سجل التدقيق (Audit Log)</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.auditRetentionDays} onChange={e => setSettings(s => ({ ...s, auditRetentionDays: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">مدة الاحتفاظ بالسجل (أيام)</label>
          </div>
        </div>
      </div>
    </div>
  );
}
