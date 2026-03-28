import { useState, useEffect } from "react";
import { CreditCard, Loader2, Save, Gift, Star } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const PaymentSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    cashEnabled: true,
    walletEnabled: true,
    cardEnabled: false,
    stripeEnabled: false,
    minWalletTopup: "10",
    maxWalletBalance: "5000",
    pointsPerHighRating: "5",
    pointsPerLowRating: "-2",
    ratingThresholdHigh: "4",
    ratingThresholdLow: "2",
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "payment_settings")
        .maybeSingle();
      if (data?.value) {
        const v = data.value as Record<string, unknown>;
        setSettings({
          cashEnabled: v.cashEnabled !== false,
          walletEnabled: v.walletEnabled !== false,
          cardEnabled: v.cardEnabled === true,
          stripeEnabled: v.stripeEnabled === true,
          minWalletTopup: String(v.minWalletTopup ?? "10"),
          maxWalletBalance: String(v.maxWalletBalance ?? "5000"),
          pointsPerHighRating: String(v.pointsPerHighRating ?? "5"),
          pointsPerLowRating: String(v.pointsPerLowRating ?? "-2"),
          ratingThresholdHigh: String(v.ratingThresholdHigh ?? "4"),
          ratingThresholdLow: String(v.ratingThresholdLow ?? "2"),
        });
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        cashEnabled: settings.cashEnabled,
        walletEnabled: settings.walletEnabled,
        cardEnabled: settings.cardEnabled,
        stripeEnabled: settings.stripeEnabled,
        minWalletTopup: Number(settings.minWalletTopup),
        maxWalletBalance: Number(settings.maxWalletBalance),
        pointsPerHighRating: Number(settings.pointsPerHighRating),
        pointsPerLowRating: Number(settings.pointsPerLowRating),
        ratingThresholdHigh: Number(settings.ratingThresholdHigh),
        ratingThresholdLow: Number(settings.ratingThresholdLow),
      };

      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("key", "payment_settings")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("app_settings")
          .update({ value: payload, updated_at: new Date().toISOString(), updated_by: user?.id })
          .eq("key", "payment_settings");
      } else {
        await supabase
          .from("app_settings")
          .insert({ key: "payment_settings", value: payload, updated_by: user?.id });
      }
      toast({ title: "✅ تم حفظ إعدادات الدفع" });
    } catch (err: any) {
      toast({ title: "❌ فشل الحفظ", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Payment Methods */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <Button onClick={handleSave} disabled={saving} size="sm" className="gradient-primary text-primary-foreground gap-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ
          </Button>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">طرق الدفع</h3>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Switch checked={settings.cashEnabled} onCheckedChange={v => setSettings(s => ({ ...s, cashEnabled: v }))} />
            <label className="text-sm text-foreground">💵 الدفع نقداً</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.walletEnabled} onCheckedChange={v => setSettings(s => ({ ...s, walletEnabled: v }))} />
            <label className="text-sm text-foreground">👛 الدفع من المحفظة</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.cardEnabled} onCheckedChange={v => setSettings(s => ({ ...s, cardEnabled: v }))} />
            <label className="text-sm text-foreground">💳 الدفع بالبطاقة</label>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <Switch checked={settings.stripeEnabled} onCheckedChange={v => setSettings(s => ({ ...s, stripeEnabled: v }))} />
            <label className="text-sm text-foreground font-medium">
              💎 الدفع الإلكتروني (Stripe)
              <span className="block text-xs text-muted-foreground">تفعيل/إيقاف بوابة الدفع الإلكتروني</span>
            </label>
          </div>
        </div>
      </div>

      {/* Wallet Settings */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-bold text-foreground text-right mb-4">إعدادات المحفظة</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Input
              value={settings.minWalletTopup}
              onChange={e => setSettings(s => ({ ...s, minWalletTopup: e.target.value }))}
              className="bg-secondary/60 border-border h-9 w-32 text-sm text-center"
              type="number"
            />
            <label className="text-sm text-foreground">الحد الأدنى للشحن (DH)</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input
              value={settings.maxWalletBalance}
              onChange={e => setSettings(s => ({ ...s, maxWalletBalance: e.target.value }))}
              className="bg-secondary/60 border-border h-9 w-32 text-sm text-center"
              type="number"
            />
            <label className="text-sm text-foreground">الحد الأقصى للرصيد (DH)</label>
          </div>
        </div>
      </div>

      {/* Rating Rewards System */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4 justify-end">
          <Star className="w-5 h-5 text-yellow-500" />
          <h3 className="font-bold text-foreground">نظام مكافآت التقييم</h3>
        </div>
        <p className="text-xs text-muted-foreground text-right mb-4">
          عندما يحصل السائق على تقييم مرتفع يكسب نقاط إضافية، والعكس عند التقييم المنخفض
        </p>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Input
              value={settings.pointsPerHighRating}
              onChange={e => setSettings(s => ({ ...s, pointsPerHighRating: e.target.value }))}
              className="bg-secondary/60 border-border h-9 w-32 text-sm text-center"
              type="number"
            />
            <label className="text-sm text-foreground">نقاط المكافأة (تقييم مرتفع)</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input
              value={settings.ratingThresholdHigh}
              onChange={e => setSettings(s => ({ ...s, ratingThresholdHigh: e.target.value }))}
              className="bg-secondary/60 border-border h-9 w-32 text-sm text-center"
              type="number"
              min="1"
              max="5"
            />
            <label className="text-sm text-foreground">حد التقييم المرتفع (من 5)</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input
              value={settings.pointsPerLowRating}
              onChange={e => setSettings(s => ({ ...s, pointsPerLowRating: e.target.value }))}
              className="bg-secondary/60 border-border h-9 w-32 text-sm text-center"
              type="number"
            />
            <label className="text-sm text-foreground">خصم النقاط (تقييم منخفض)</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input
              value={settings.ratingThresholdLow}
              onChange={e => setSettings(s => ({ ...s, ratingThresholdLow: e.target.value }))}
              className="bg-secondary/60 border-border h-9 w-32 text-sm text-center"
              type="number"
              min="1"
              max="5"
            />
            <label className="text-sm text-foreground">حد التقييم المنخفض (من 5)</label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSettings;
