import { useState, useEffect } from "react";
import { Settings, Save, DollarSign, MapPin, Bell, Shield, Loader2, Truck, Sun, Moon, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DELIVERY_PRICING_DEFAULTS } from "@/hooks/useDeliveryPricingSettings";

const AdminSettings = () => {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    baseFare: "5",
    perKmRate: "3",
    perMinRate: "0.5",
    minFare: "10",
    maxRadius: "50",
    autoAssign: true,
    emailNotifications: true,
    pushNotifications: true,
    maintenanceMode: false,
  });
  const [deliveryPricing, setDeliveryPricing] = useState({
    dayBaseFare: String(DELIVERY_PRICING_DEFAULTS.dayBaseFare),
    dayIncludedKm: String(DELIVERY_PRICING_DEFAULTS.dayIncludedKm),
    dayExtraKmRate: String(DELIVERY_PRICING_DEFAULTS.dayExtraKmRate),
    nightBaseFare: String(DELIVERY_PRICING_DEFAULTS.nightBaseFare),
    nightIncludedKm: String(DELIVERY_PRICING_DEFAULTS.nightIncludedKm),
    nightExtraKmRate: String(DELIVERY_PRICING_DEFAULTS.nightExtraKmRate),
    dayStartHour: String(DELIVERY_PRICING_DEFAULTS.dayStartHour),
    dayEndHour: String(DELIVERY_PRICING_DEFAULTS.dayEndHour),
    roundingMethod: DELIVERY_PRICING_DEFAULTS.roundingMethod,
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("app_settings").select("key, value");
      if (data) {
        const map = new Map(data.map(s => [s.key, s.value]));
        if (map.has("pricing")) {
          const p = map.get("pricing") as any;
          setSettings(s => ({ ...s, baseFare: p.baseFare || s.baseFare, perKmRate: p.perKmRate || s.perKmRate, perMinRate: p.perMinRate || s.perMinRate, minFare: p.minFare || s.minFare }));
        }
        if (map.has("general")) {
          const g = map.get("general") as any;
          setSettings(s => ({ ...s, maxRadius: g.maxRadius || s.maxRadius, autoAssign: g.autoAssign ?? s.autoAssign, maintenanceMode: g.maintenanceMode ?? s.maintenanceMode }));
        }
        if (map.has("notifications")) {
          const n = map.get("notifications") as any;
          setSettings(s => ({ ...s, emailNotifications: n.email ?? s.emailNotifications, pushNotifications: n.push ?? s.pushNotifications }));
        }
        if (map.has("delivery_pricing")) {
          const dp = map.get("delivery_pricing") as any;
          setDeliveryPricing(prev => ({
            dayBaseFare: String(dp.dayBaseFare ?? prev.dayBaseFare),
            dayIncludedKm: String(dp.dayIncludedKm ?? prev.dayIncludedKm),
            dayExtraKmRate: String(dp.dayExtraKmRate ?? prev.dayExtraKmRate),
            nightBaseFare: String(dp.nightBaseFare ?? prev.nightBaseFare),
            nightIncludedKm: String(dp.nightIncludedKm ?? prev.nightIncludedKm),
            nightExtraKmRate: String(dp.nightExtraKmRate ?? prev.nightExtraKmRate),
            dayStartHour: String(dp.dayStartHour ?? prev.dayStartHour),
            dayEndHour: String(dp.dayEndHour ?? prev.dayEndHour),
            roundingMethod: dp.roundingMethod ?? prev.roundingMethod,
          }));
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const uid = user?.id;

    const upsert = async (key: string, value: any) => {
      const { data: existing } = await supabase.from("app_settings").select("id").eq("key", key).maybeSingle();
      if (existing) {
        await supabase.from("app_settings").update({ value, updated_at: new Date().toISOString(), updated_by: uid }).eq("key", key);
      } else {
        await supabase.from("app_settings").insert({ key, value, updated_by: uid });
      }
    };

    await Promise.all([
      upsert("pricing", { baseFare: settings.baseFare, perKmRate: settings.perKmRate, perMinRate: settings.perMinRate, minFare: settings.minFare }),
      upsert("general", { maxRadius: settings.maxRadius, autoAssign: settings.autoAssign, maintenanceMode: settings.maintenanceMode }),
      upsert("notifications", { email: settings.emailNotifications, push: settings.pushNotifications }),
      upsert("delivery_pricing", {
        dayBaseFare: Number(deliveryPricing.dayBaseFare),
        dayIncludedKm: Number(deliveryPricing.dayIncludedKm),
        dayExtraKmRate: Number(deliveryPricing.dayExtraKmRate),
        nightBaseFare: Number(deliveryPricing.nightBaseFare),
        nightIncludedKm: Number(deliveryPricing.nightIncludedKm),
        nightExtraKmRate: Number(deliveryPricing.nightExtraKmRate),
        dayStartHour: Number(deliveryPricing.dayStartHour),
        dayEndHour: Number(deliveryPricing.dayEndHour),
        roundingMethod: deliveryPricing.roundingMethod,
      }),
    ]);

    toast({ title: "تم حفظ الإعدادات بنجاح" });
    setSaving(false);
  };

  const Section = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <div className="gradient-card rounded-xl border border-border p-6">
      <div className="flex items-center gap-2 mb-4 text-right">
        <Icon className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground">
          {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
          حفظ الإعدادات
        </Button>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">إعدادات المنصة</h1>
          <Settings className="w-6 h-6 text-primary" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="التسعيرة" icon={DollarSign}>
          <div className="space-y-4">
            {[
              { label: "التسعيرة الأساسية (DH)", key: "baseFare" },
              { label: "سعر الكيلومتر (DH)", key: "perKmRate" },
              { label: "سعر الدقيقة (DH)", key: "perMinRate" },
              { label: "الحد الأدنى للأجرة (DH)", key: "minFare" },
            ].map(field => (
              <div key={field.key} className="flex items-center justify-between gap-4">
                <Input value={settings[field.key as keyof typeof settings] as string}
                  onChange={e => setSettings(s => ({ ...s, [field.key]: e.target.value }))}
                  className="bg-secondary/60 border-border h-9 w-32 text-sm text-center" type="number" />
                <label className="text-sm text-foreground">{field.label}</label>
              </div>
            ))}
          </div>
        </Section>

        <Section title="المناطق" icon={MapPin}>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Input value={settings.maxRadius}
                onChange={e => setSettings(s => ({ ...s, maxRadius: e.target.value }))}
                className="bg-secondary/60 border-border h-9 w-32 text-sm text-center" type="number" />
              <label className="text-sm text-foreground">نطاق الخدمة (كم)</label>
            </div>
            <div className="flex items-center justify-between">
              <Switch checked={settings.autoAssign} onCheckedChange={v => setSettings(s => ({ ...s, autoAssign: v }))} />
              <label className="text-sm text-foreground">تعيين تلقائي للسائقين</label>
            </div>
          </div>
        </Section>

        <Section title="الإشعارات" icon={Bell}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Switch checked={settings.emailNotifications} onCheckedChange={v => setSettings(s => ({ ...s, emailNotifications: v }))} />
              <label className="text-sm text-foreground">إشعارات البريد الإلكتروني</label>
            </div>
            <div className="flex items-center justify-between">
              <Switch checked={settings.pushNotifications} onCheckedChange={v => setSettings(s => ({ ...s, pushNotifications: v }))} />
              <label className="text-sm text-foreground">إشعارات الدفع</label>
            </div>
          </div>
        </Section>

        <Section title="النظام" icon={Shield}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Switch checked={settings.maintenanceMode} onCheckedChange={v => setSettings(s => ({ ...s, maintenanceMode: v }))} />
              <label className="text-sm text-foreground">وضع الصيانة</label>
            </div>
            <p className="text-xs text-muted-foreground text-right">عند تفعيل وضع الصيانة، لن يتمكن المستخدمون من الوصول إلى المنصة</p>
          </div>
        </Section>
      </div>

      {/* Delivery Pricing Section - Full Width */}
      <Section title="إعدادات تسعير التوصيل" icon={Truck}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Day Pricing */}
          <div className="space-y-4 border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sun className="w-4 h-4 text-yellow-500" />
              <h4 className="font-semibold text-sm text-foreground">التسعيرة النهارية</h4>
            </div>
            {[
              { label: "السعر الأساسي (DH)", key: "dayBaseFare" },
              { label: "الكيلومترات المشمولة", key: "dayIncludedKm" },
              { label: "سعر كل كم إضافي (DH)", key: "dayExtraKmRate" },
            ].map(field => (
              <div key={field.key} className="flex items-center justify-between gap-4">
                <Input
                  value={deliveryPricing[field.key as keyof typeof deliveryPricing]}
                  onChange={e => setDeliveryPricing(s => ({ ...s, [field.key]: e.target.value }))}
                  className="bg-secondary/60 border-border h-9 w-32 text-sm text-center" type="number" />
                <label className="text-sm text-foreground">{field.label}</label>
              </div>
            ))}
          </div>

          {/* Night Pricing */}
          <div className="space-y-4 border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Moon className="w-4 h-4 text-blue-400" />
              <h4 className="font-semibold text-sm text-foreground">التسعيرة الليلية</h4>
            </div>
            {[
              { label: "السعر الأساسي (DH)", key: "nightBaseFare" },
              { label: "الكيلومترات المشمولة", key: "nightIncludedKm" },
              { label: "سعر كل كم إضافي (DH)", key: "nightExtraKmRate" },
            ].map(field => (
              <div key={field.key} className="flex items-center justify-between gap-4">
                <Input
                  value={deliveryPricing[field.key as keyof typeof deliveryPricing]}
                  onChange={e => setDeliveryPricing(s => ({ ...s, [field.key]: e.target.value }))}
                  className="bg-secondary/60 border-border h-9 w-32 text-sm text-center" type="number" />
                <label className="text-sm text-foreground">{field.label}</label>
              </div>
            ))}
          </div>
        </div>

        {/* Time & Rounding settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between gap-4">
            <Input
              value={deliveryPricing.dayStartHour}
              onChange={e => setDeliveryPricing(s => ({ ...s, dayStartHour: e.target.value }))}
              className="bg-secondary/60 border-border h-9 w-20 text-sm text-center" type="number" min="0" max="23" />
            <label className="text-sm text-foreground">بداية النهار (ساعة)</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input
              value={deliveryPricing.dayEndHour}
              onChange={e => setDeliveryPricing(s => ({ ...s, dayEndHour: e.target.value }))}
              className="bg-secondary/60 border-border h-9 w-20 text-sm text-center" type="number" min="0" max="23" />
            <label className="text-sm text-foreground">بداية الليل (ساعة)</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Select value={deliveryPricing.roundingMethod} onValueChange={v => setDeliveryPricing(s => ({ ...s, roundingMethod: v as any }))}>
              <SelectTrigger className="bg-secondary/60 border-border h-9 w-32 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="round">تقريب عادي</SelectItem>
                <SelectItem value="ceil">تقريب لأعلى</SelectItem>
                <SelectItem value="floor">تقريب لأسفل</SelectItem>
                <SelectItem value="none">بدون تقريب</SelectItem>
              </SelectContent>
            </Select>
            <label className="text-sm text-foreground">تقريب المسافة</label>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-right mt-3">
          النهار: {deliveryPricing.dayStartHour}:00 → {deliveryPricing.dayEndHour}:00 | الليل: {deliveryPricing.dayEndHour}:00 → {deliveryPricing.dayStartHour}:00
        </p>
      </Section>
    </div>
  );
};

export default AdminSettings;
