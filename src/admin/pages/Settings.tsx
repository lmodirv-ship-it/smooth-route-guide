import { useState, useEffect } from "react";
import { Settings, Save, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/context";
import { DELIVERY_PRICING_DEFAULTS } from "@/hooks/useDeliveryPricingSettings";
import PricingSettings from "@/admin/components/settings/PricingSettings";
import GeneralSettings from "@/admin/components/settings/GeneralSettings";
import DeliveryPricingSettings from "@/admin/components/settings/DeliveryPricingSettings";
import PaymentSettings from "@/admin/components/settings/PaymentSettings";
import LanguageManagement from "@/admin/components/LanguageManagement";
import GeoSettings from "@/admin/components/settings/GeoSettings";
import VisibilitySettings from "@/admin/components/settings/VisibilitySettings";

const AdminSettings = () => {
  const { t } = useI18n();
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id;

      const upsert = async (key: string, value: any) => {
        const { data: existing } = await supabase.from("app_settings").select("id").eq("key", key).maybeSingle();
        if (existing) {
          const { error } = await supabase.from("app_settings").update({ value, updated_at: new Date().toISOString(), updated_by: uid }).eq("key", key);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("app_settings").insert({ key, value, updated_by: uid });
          if (error) throw error;
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

      toast({ title: "✅ تم حفظ الإعدادات بنجاح" });
    } catch (err: any) {
      toast({ title: "❌ فشل حفظ الإعدادات", description: err?.message || "حدث خطأ غير متوقع", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDeliveryPricing = () => {
    setDeliveryPricing({
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
    toast({ title: "تم إعادة تعيين قيم تسعير التوصيل إلى الافتراضية (لم تُحفظ بعد)" });
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground">
          {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
          {t.admin.saveBtn}
        </Button>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">{t.admin.platformSettings}</h1>
          <Settings className="w-6 h-6 text-primary" />
        </div>
      </div>

      <PricingSettings
        settings={settings}
        onChange={(key, value) => setSettings(s => ({ ...s, [key]: value }))}
      />

      <GeneralSettings
        settings={settings}
        onChange={(key, value) => setSettings(s => ({ ...s, [key]: value }))}
      />

      <DeliveryPricingSettings
        pricing={deliveryPricing}
        onChange={(key, value) => setDeliveryPricing(s => ({ ...s, [key]: value }))}
        onReset={handleResetDeliveryPricing}
      />

      <PaymentSettings />

      <GeoSettings />

      <LanguageManagement />
    </div>
  );
};

export default AdminSettings;
