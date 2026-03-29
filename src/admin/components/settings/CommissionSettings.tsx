import { useState, useEffect } from "react";
import { Percent, TrendingUp, Save, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function CommissionSettings() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    rideCommission: "15",
    deliveryCommission: "10",
    storeCommission: "10",
    courierCommission: "12",
    surgeMultiplierEnabled: true,
    surgeMultiplierMax: "2.0",
    surgeThresholdDrivers: "3",
    peakHoursEnabled: true,
    peakHoursStart: "7",
    peakHoursEnd: "9",
    peakHoursMultiplier: "1.5",
    eveningPeakStart: "17",
    eveningPeakEnd: "20",
    eveningPeakMultiplier: "1.3",
    promotionalDiscountEnabled: true,
    maxDiscountPercent: "50",
    referralBonusEnabled: true,
    referralBonusAmount: "10",
    referredBonusAmount: "5",
    loyaltyPointsEnabled: true,
    pointsPerDirham: "1",
    dirhamsPerPoint: "0.1",
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "commission_settings").maybeSingle();
      if (data?.value) setSettings(prev => ({ ...prev, ...(data.value as any) }));
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: existing } = await supabase.from("app_settings").select("id").eq("key", "commission_settings").maybeSingle();
      if (existing) {
        await supabase.from("app_settings").update({ value: settings as any, updated_at: new Date().toISOString(), updated_by: user?.id }).eq("key", "commission_settings");
      } else {
        await supabase.from("app_settings").insert({ key: "commission_settings", value: settings as any, updated_by: user?.id });
      }
      toast({ title: "✅ تم حفظ إعدادات العمولات" });
    } catch (e: any) {
      toast({ title: "❌ خطأ", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <Button onClick={handleSave} disabled={saving} size="sm" className="gradient-primary text-primary-foreground gap-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ
          </Button>
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">نسب العمولات</h3>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { label: "عمولة رحلات الركاب (%)", field: "rideCommission" },
            { label: "عمولة التوصيل (%)", field: "deliveryCommission" },
            { label: "عمولة المتاجر (%)", field: "storeCommission" },
            { label: "عمولة الكوريي (%)", field: "courierCommission" },
          ].map(f => (
            <div key={f.field} className="flex items-center justify-between gap-4">
              <Input value={(settings as any)[f.field]} onChange={e => setSettings(s => ({ ...s, [f.field]: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
              <label className="text-sm text-foreground">{f.label}</label>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4 justify-end">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">التسعير الديناميكي (Surge)</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Switch checked={settings.surgeMultiplierEnabled} onCheckedChange={v => setSettings(s => ({ ...s, surgeMultiplierEnabled: v }))} />
            <label className="text-sm text-foreground">تفعيل التسعير الديناميكي</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.surgeMultiplierMax} onChange={e => setSettings(s => ({ ...s, surgeMultiplierMax: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" step="0.1" />
            <label className="text-sm text-foreground">أقصى مضاعف سعر</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.peakHoursEnabled} onCheckedChange={v => setSettings(s => ({ ...s, peakHoursEnabled: v }))} />
            <label className="text-sm text-foreground">تفعيل ساعات الذروة الصباحية</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2 items-center">
              <Input value={settings.peakHoursStart} onChange={e => setSettings(s => ({ ...s, peakHoursStart: e.target.value }))} className="bg-secondary/60 border-border h-9 w-16 text-sm text-center" type="number" />
              <span className="text-xs text-muted-foreground">→</span>
              <Input value={settings.peakHoursEnd} onChange={e => setSettings(s => ({ ...s, peakHoursEnd: e.target.value }))} className="bg-secondary/60 border-border h-9 w-16 text-sm text-center" type="number" />
            </div>
            <label className="text-sm text-foreground">ذروة صباحية (ساعة)</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.peakHoursMultiplier} onChange={e => setSettings(s => ({ ...s, peakHoursMultiplier: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" step="0.1" />
            <label className="text-sm text-foreground">مضاعف الذروة الصباحية</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2 items-center">
              <Input value={settings.eveningPeakStart} onChange={e => setSettings(s => ({ ...s, eveningPeakStart: e.target.value }))} className="bg-secondary/60 border-border h-9 w-16 text-sm text-center" type="number" />
              <span className="text-xs text-muted-foreground">→</span>
              <Input value={settings.eveningPeakEnd} onChange={e => setSettings(s => ({ ...s, eveningPeakEnd: e.target.value }))} className="bg-secondary/60 border-border h-9 w-16 text-sm text-center" type="number" />
            </div>
            <label className="text-sm text-foreground">ذروة مسائية (ساعة)</label>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <h3 className="font-bold text-foreground text-right mb-4">🎁 الإحالة والولاء</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Switch checked={settings.referralBonusEnabled} onCheckedChange={v => setSettings(s => ({ ...s, referralBonusEnabled: v }))} />
            <label className="text-sm text-foreground">نظام الإحالة</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.referralBonusAmount} onChange={e => setSettings(s => ({ ...s, referralBonusAmount: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">مكافأة المُحيل (DH)</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.referredBonusAmount} onChange={e => setSettings(s => ({ ...s, referredBonusAmount: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">مكافأة المُحال إليه (DH)</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.loyaltyPointsEnabled} onCheckedChange={v => setSettings(s => ({ ...s, loyaltyPointsEnabled: v }))} />
            <label className="text-sm text-foreground">نظام نقاط الولاء</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.pointsPerDirham} onChange={e => setSettings(s => ({ ...s, pointsPerDirham: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">نقاط لكل درهم</label>
          </div>
        </div>
      </div>
    </div>
  );
}
