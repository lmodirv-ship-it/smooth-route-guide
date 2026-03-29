import { useState, useEffect } from "react";
import { Car, Clock, MapPin, FileCheck, Save, Loader2, Gauge } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function DriverSettings() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    autoAcceptEnabled: false,
    autoAcceptTimeout: "30",
    maxConcurrentTrips: "1",
    driverApprovalRequired: true,
    documentsRequired: true,
    requiredDocuments: "license,id_card,insurance,vehicle_registration",
    locationUpdateInterval: "10",
    maxOfflineMinutes: "30",
    minRating: "3.0",
    deactivateOnLowRating: false,
    showEarningsToDriver: true,
    allowDriverCancel: true,
    cancelPenaltyEnabled: false,
    cancelPenaltyAmount: "5",
    maxCancelPerDay: "3",
    rideDriverEnabled: true,
    deliveryDriverEnabled: true,
    driverChatEnabled: true,
    driverCallEnabled: true,
    speedLimitWarning: false,
    speedLimitKmh: "120",
    breakReminderEnabled: false,
    breakReminderHours: "4",
    nightModeEnabled: true,
    nightStartHour: "22",
    nightEndHour: "6",
    nightBonusPercent: "20",
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "driver_settings").maybeSingle();
      if (data?.value) setSettings(prev => ({ ...prev, ...(data.value as any) }));
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: existing } = await supabase.from("app_settings").select("id").eq("key", "driver_settings").maybeSingle();
      if (existing) {
        await supabase.from("app_settings").update({ value: settings as any, updated_at: new Date().toISOString(), updated_by: user?.id }).eq("key", "driver_settings");
      } else {
        await supabase.from("app_settings").insert({ key: "driver_settings", value: settings as any, updated_by: user?.id });
      }
      toast({ title: "✅ تم حفظ إعدادات السائقين" });
    } catch (e: any) {
      toast({ title: "❌ خطأ", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* General Driver */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <Button onClick={handleSave} disabled={saving} size="sm" className="gradient-primary text-primary-foreground gap-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ
          </Button>
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">إعدادات السائقين</h3>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Switch checked={settings.rideDriverEnabled} onCheckedChange={v => setSettings(s => ({ ...s, rideDriverEnabled: v }))} />
            <label className="text-sm text-foreground">🚗 تفعيل سائق الركاب</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.deliveryDriverEnabled} onCheckedChange={v => setSettings(s => ({ ...s, deliveryDriverEnabled: v }))} />
            <label className="text-sm text-foreground">🛵 تفعيل سائق التوصيل</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.driverApprovalRequired} onCheckedChange={v => setSettings(s => ({ ...s, driverApprovalRequired: v }))} />
            <label className="text-sm text-foreground">موافقة مسبقة قبل التنشيط</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.documentsRequired} onCheckedChange={v => setSettings(s => ({ ...s, documentsRequired: v }))} />
            <label className="text-sm text-foreground">الوثائق مطلوبة</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.maxConcurrentTrips} onChange={e => setSettings(s => ({ ...s, maxConcurrentTrips: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">أقصى رحلات متزامنة</label>
          </div>
        </div>
      </div>

      {/* Auto Accept */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4 justify-end">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">القبول التلقائي والإلغاء</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Switch checked={settings.autoAcceptEnabled} onCheckedChange={v => setSettings(s => ({ ...s, autoAcceptEnabled: v }))} />
            <label className="text-sm text-foreground">القبول التلقائي للطلبات</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.autoAcceptTimeout} onChange={e => setSettings(s => ({ ...s, autoAcceptTimeout: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">مهلة القبول (ثانية)</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.allowDriverCancel} onCheckedChange={v => setSettings(s => ({ ...s, allowDriverCancel: v }))} />
            <label className="text-sm text-foreground">السماح بالإلغاء من السائق</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.cancelPenaltyEnabled} onCheckedChange={v => setSettings(s => ({ ...s, cancelPenaltyEnabled: v }))} />
            <label className="text-sm text-foreground">غرامة الإلغاء</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.cancelPenaltyAmount} onChange={e => setSettings(s => ({ ...s, cancelPenaltyAmount: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">مبلغ غرامة الإلغاء (DH)</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.maxCancelPerDay} onChange={e => setSettings(s => ({ ...s, maxCancelPerDay: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">أقصى إلغاءات يومية</label>
          </div>
        </div>
      </div>

      {/* Location & Safety */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4 justify-end">
          <Gauge className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">الموقع والسلامة</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.locationUpdateInterval} onChange={e => setSettings(s => ({ ...s, locationUpdateInterval: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">فاصل تحديث الموقع (ثانية)</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.maxOfflineMinutes} onChange={e => setSettings(s => ({ ...s, maxOfflineMinutes: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">أقصى وقت offline (دقائق)</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.speedLimitWarning} onCheckedChange={v => setSettings(s => ({ ...s, speedLimitWarning: v }))} />
            <label className="text-sm text-foreground">تنبيه تجاوز السرعة</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.speedLimitKmh} onChange={e => setSettings(s => ({ ...s, speedLimitKmh: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">حد السرعة (كم/س)</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.breakReminderEnabled} onCheckedChange={v => setSettings(s => ({ ...s, breakReminderEnabled: v }))} />
            <label className="text-sm text-foreground">تذكير بأخذ استراحة</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.breakReminderHours} onChange={e => setSettings(s => ({ ...s, breakReminderHours: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">تذكير كل (ساعات)</label>
          </div>
        </div>
      </div>

      {/* Night Mode */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4 justify-end">
          <MapPin className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">الوضع الليلي والمكافآت</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Switch checked={settings.nightModeEnabled} onCheckedChange={v => setSettings(s => ({ ...s, nightModeEnabled: v }))} />
            <label className="text-sm text-foreground">تفعيل مكافأة الوضع الليلي</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.nightStartHour} onChange={e => setSettings(s => ({ ...s, nightStartHour: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">بداية الليل (ساعة)</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.nightEndHour} onChange={e => setSettings(s => ({ ...s, nightEndHour: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">نهاية الليل (ساعة)</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.nightBonusPercent} onChange={e => setSettings(s => ({ ...s, nightBonusPercent: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">نسبة المكافأة الليلية (%)</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.minRating} onChange={e => setSettings(s => ({ ...s, minRating: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" step="0.1" />
            <label className="text-sm text-foreground">الحد الأدنى للتقييم</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.deactivateOnLowRating} onCheckedChange={v => setSettings(s => ({ ...s, deactivateOnLowRating: v }))} />
            <label className="text-sm text-foreground">إيقاف عند التقييم المنخفض</label>
          </div>
        </div>
      </div>
    </div>
  );
}
