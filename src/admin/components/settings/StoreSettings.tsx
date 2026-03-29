import { useState, useEffect } from "react";
import { Store, Package, Clock, Image, Save, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function StoreSettings() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    storeApprovalRequired: true,
    autoActivateStore: false,
    maxImagesPerProduct: "5",
    maxProductsPerStore: "500",
    maxCategoriesPerStore: "20",
    showOutOfStock: true,
    allowStoreOwnerPricing: true,
    minOrderAmount: "0",
    preparationTimeDefault: "20",
    maxPreparationTime: "120",
    storeCommissionPercent: "10",
    deliveryCommissionPercent: "15",
    featuredStoreEnabled: true,
    featuredStoreFee: "100",
    ratingSystemEnabled: true,
    minRatingForFeature: "4.0",
    autoImportEnabled: true,
    googlePlacesImport: true,
    csvImportEnabled: true,
    storeChatEnabled: true,
    storeNotifications: true,
    showStoreAnalytics: true,
    allowMultipleStores: false,
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "store_settings").maybeSingle();
      if (data?.value) setSettings(prev => ({ ...prev, ...(data.value as any) }));
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: existing } = await supabase.from("app_settings").select("id").eq("key", "store_settings").maybeSingle();
      if (existing) {
        await supabase.from("app_settings").update({ value: settings as any, updated_at: new Date().toISOString(), updated_by: user?.id }).eq("key", "store_settings");
      } else {
        await supabase.from("app_settings").insert({ key: "store_settings", value: settings as any, updated_by: user?.id });
      }
      toast({ title: "✅ تم حفظ إعدادات المتاجر" });
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
            <Store className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">إعدادات المتاجر</h3>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Switch checked={settings.storeApprovalRequired} onCheckedChange={v => setSettings(s => ({ ...s, storeApprovalRequired: v }))} />
            <label className="text-sm text-foreground">موافقة مسبقة لتفعيل المتجر</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.autoActivateStore} onCheckedChange={v => setSettings(s => ({ ...s, autoActivateStore: v }))} />
            <label className="text-sm text-foreground">تفعيل تلقائي للمتاجر الجديدة</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.allowMultipleStores} onCheckedChange={v => setSettings(s => ({ ...s, allowMultipleStores: v }))} />
            <label className="text-sm text-foreground">السماح بعدة متاجر لنفس المالك</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.allowStoreOwnerPricing} onCheckedChange={v => setSettings(s => ({ ...s, allowStoreOwnerPricing: v }))} />
            <label className="text-sm text-foreground">السماح للمالك بتحديد الأسعار</label>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4 justify-end">
          <Package className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">المنتجات والمحتوى</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.maxProductsPerStore} onChange={e => setSettings(s => ({ ...s, maxProductsPerStore: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">أقصى عدد منتجات</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.maxCategoriesPerStore} onChange={e => setSettings(s => ({ ...s, maxCategoriesPerStore: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">أقصى عدد تصنيفات</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.maxImagesPerProduct} onChange={e => setSettings(s => ({ ...s, maxImagesPerProduct: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">أقصى صور لكل منتج</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.showOutOfStock} onCheckedChange={v => setSettings(s => ({ ...s, showOutOfStock: v }))} />
            <label className="text-sm text-foreground">عرض المنتجات غير المتوفرة</label>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4 justify-end">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">العمولات والطلبات</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.storeCommissionPercent} onChange={e => setSettings(s => ({ ...s, storeCommissionPercent: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">عمولة المتجر (%)</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.deliveryCommissionPercent} onChange={e => setSettings(s => ({ ...s, deliveryCommissionPercent: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">عمولة التوصيل (%)</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.minOrderAmount} onChange={e => setSettings(s => ({ ...s, minOrderAmount: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">الحد الأدنى للطلب (DH)</label>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Input value={settings.preparationTimeDefault} onChange={e => setSettings(s => ({ ...s, preparationTimeDefault: e.target.value }))} className="bg-secondary/60 border-border h-9 w-24 text-sm text-center" type="number" />
            <label className="text-sm text-foreground">وقت التحضير الافتراضي (دقيقة)</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.featuredStoreEnabled} onCheckedChange={v => setSettings(s => ({ ...s, featuredStoreEnabled: v }))} />
            <label className="text-sm text-foreground">متاجر مميزة</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.autoImportEnabled} onCheckedChange={v => setSettings(s => ({ ...s, autoImportEnabled: v }))} />
            <label className="text-sm text-foreground">الاستيراد التلقائي</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.googlePlacesImport} onCheckedChange={v => setSettings(s => ({ ...s, googlePlacesImport: v }))} />
            <label className="text-sm text-foreground">استيراد من Google Places</label>
          </div>
        </div>
      </div>
    </div>
  );
}
