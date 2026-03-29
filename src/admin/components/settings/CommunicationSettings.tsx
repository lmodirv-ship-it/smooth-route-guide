import { useState, useEffect } from "react";
import { MessageSquare, Phone, Mail, Bell, Save, Loader2, Send } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function CommunicationSettings() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    communityChatEnabled: true,
    internalChatEnabled: true,
    inAppCallEnabled: true,
    voiceOrderEnabled: true,
    rideChatEnabled: true,
    maxMessageLength: "500",
    mediaUploadEnabled: true,
    maxMediaSizeMb: "10",
    profanityFilterEnabled: true,
    autoModEnabled: false,
    emailNotificationsEnabled: true,
    pushNotificationsEnabled: true,
    smsNotificationsEnabled: false,
    smsProvider: "twilio",
    smsApiKey: "",
    whatsappNotifications: false,
    whatsappNumber: "",
    notifyOnNewOrder: true,
    notifyOnOrderStatus: true,
    notifyOnNewDriver: true,
    notifyOnComplaint: true,
    notifyOnLowBalance: true,
    lowBalanceThreshold: "20",
    emailFromName: "HN Driver",
    emailReplyTo: "",
    welcomeEmailEnabled: true,
    orderConfirmationEmail: true,
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "communication_settings").maybeSingle();
      if (data?.value) setSettings(prev => ({ ...prev, ...(data.value as any) }));
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: existing } = await supabase.from("app_settings").select("id").eq("key", "communication_settings").maybeSingle();
      if (existing) {
        await supabase.from("app_settings").update({ value: settings as any, updated_at: new Date().toISOString(), updated_by: user?.id }).eq("key", "communication_settings");
      } else {
        await supabase.from("app_settings").insert({ key: "communication_settings", value: settings as any, updated_by: user?.id });
      }
      toast({ title: "✅ تم حفظ إعدادات التواصل" });
    } catch (e: any) {
      toast({ title: "❌ خطأ", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Chat Features */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <Button onClick={handleSave} disabled={saving} size="sm" className="gradient-primary text-primary-foreground gap-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ
          </Button>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">الدردشة والمحادثة</h3>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Switch checked={settings.communityChatEnabled} onCheckedChange={v => setSettings(s => ({ ...s, communityChatEnabled: v }))} />
            <label className="text-sm text-foreground">الدردشة المجتمعية</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.internalChatEnabled} onCheckedChange={v => setSettings(s => ({ ...s, internalChatEnabled: v }))} />
            <label className="text-sm text-foreground">المحادثات الداخلية</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.inAppCallEnabled} onCheckedChange={v => setSettings(s => ({ ...s, inAppCallEnabled: v }))} />
            <label className="text-sm text-foreground">المكالمات الداخلية (WebRTC)</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.voiceOrderEnabled} onCheckedChange={v => setSettings(s => ({ ...s, voiceOrderEnabled: v }))} />
            <label className="text-sm text-foreground">الطلب الصوتي</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.rideChatEnabled} onCheckedChange={v => setSettings(s => ({ ...s, rideChatEnabled: v }))} />
            <label className="text-sm text-foreground">دردشة الرحلة (سائق/عميل)</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.maxMessageLength} onChange={e => setSettings(s => ({ ...s, maxMessageLength: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">أقصى طول للرسالة</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.mediaUploadEnabled} onCheckedChange={v => setSettings(s => ({ ...s, mediaUploadEnabled: v }))} />
            <label className="text-sm text-foreground">إرسال وسائط (صور/ملفات)</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.profanityFilterEnabled} onCheckedChange={v => setSettings(s => ({ ...s, profanityFilterEnabled: v }))} />
            <label className="text-sm text-foreground">فلتر الألفاظ غير اللائقة</label>
          </div>
        </div>
      </div>

      {/* Notification Channels */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4 justify-end">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">قنوات الإشعارات</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Switch checked={settings.emailNotificationsEnabled} onCheckedChange={v => setSettings(s => ({ ...s, emailNotificationsEnabled: v }))} />
            <label className="text-sm text-foreground">📧 البريد الإلكتروني</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.pushNotificationsEnabled} onCheckedChange={v => setSettings(s => ({ ...s, pushNotificationsEnabled: v }))} />
            <label className="text-sm text-foreground">🔔 إشعارات الدفع (Push)</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.smsNotificationsEnabled} onCheckedChange={v => setSettings(s => ({ ...s, smsNotificationsEnabled: v }))} />
            <label className="text-sm text-foreground">📱 الرسائل القصيرة (SMS)</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.whatsappNotifications} onCheckedChange={v => setSettings(s => ({ ...s, whatsappNotifications: v }))} />
            <label className="text-sm text-foreground">💬 واتساب</label>
          </div>
        </div>
      </div>

      {/* Notification Triggers */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4 justify-end">
          <Send className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">أحداث الإشعارات</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Switch checked={settings.notifyOnNewOrder} onCheckedChange={v => setSettings(s => ({ ...s, notifyOnNewOrder: v }))} />
            <label className="text-sm text-foreground">طلب جديد</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.notifyOnOrderStatus} onCheckedChange={v => setSettings(s => ({ ...s, notifyOnOrderStatus: v }))} />
            <label className="text-sm text-foreground">تغيير حالة الطلب</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.notifyOnNewDriver} onCheckedChange={v => setSettings(s => ({ ...s, notifyOnNewDriver: v }))} />
            <label className="text-sm text-foreground">تسجيل سائق جديد</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.notifyOnComplaint} onCheckedChange={v => setSettings(s => ({ ...s, notifyOnComplaint: v }))} />
            <label className="text-sm text-foreground">شكوى جديدة</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.notifyOnLowBalance} onCheckedChange={v => setSettings(s => ({ ...s, notifyOnLowBalance: v }))} />
            <label className="text-sm text-foreground">رصيد منخفض</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.lowBalanceThreshold} onChange={e => setSettings(s => ({ ...s, lowBalanceThreshold: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">حد الرصيد المنخفض (DH)</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.welcomeEmailEnabled} onCheckedChange={v => setSettings(s => ({ ...s, welcomeEmailEnabled: v }))} />
            <label className="text-sm text-foreground">إرسال بريد ترحيبي</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.orderConfirmationEmail} onCheckedChange={v => setSettings(s => ({ ...s, orderConfirmationEmail: v }))} />
            <label className="text-sm text-foreground">بريد تأكيد الطلب</label>
          </div>
        </div>
      </div>
    </div>
  );
}
