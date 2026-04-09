import { useState, useEffect } from "react";
import { Palette, Type, Image, Globe, Save, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function BrandingSettings() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    platformName: "HN Driver",
    platformSlogan: "The most powerful ride & delivery platform",
    primaryColor: "#e8852a",
    accentColor: "#f0a855",
    logoUrl: "",
    faviconUrl: "",
    defaultLanguage: "ar",
    supportedLanguages: "ar,fr,en,es",
    rtlDefault: true,
    darkModeDefault: true,
    showPartnerLogos: true,
    footerEmail: "lmodirv@gmail.com",
    footerWhatsApp: "+212600000000",
    socialFacebook: "",
    socialInstagram: "",
    socialTwitter: "",
    socialLinkedIn: "",
    facebookPixelId: "",
    googleAdsId: "",
    googleAnalyticsId: "",
    googleAdsConversionLabel: "",
    metaTitle: "HN Driver — Smart Management",
    metaDescription: "The most powerful ride & delivery platform",
    customCss: "",
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "branding_settings").maybeSingle();
      if (data?.value) setSettings(prev => ({ ...prev, ...(data.value as any) }));
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: existing } = await supabase.from("app_settings").select("id").eq("key", "branding_settings").maybeSingle();
      if (existing) {
        await supabase.from("app_settings").update({ value: settings as any, updated_at: new Date().toISOString(), updated_by: user?.id }).eq("key", "branding_settings");
      } else {
        await supabase.from("app_settings").insert({ key: "branding_settings", value: settings as any, updated_by: user?.id });
      }
      toast({ title: "✅ تم حفظ إعدادات العلامة التجارية" });
    } catch (e: any) {
      toast({ title: "❌ خطأ", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const Field = ({ label, value, field, type = "text" }: { label: string; value: string; field: string; type?: string }) => (
    <div className="flex items-center justify-between gap-4">
      <Input value={value} onChange={e => setSettings(s => ({ ...s, [field]: e.target.value }))} className="bg-secondary/60 border-border h-9 flex-1 max-w-xs text-sm" type={type} />
      <label className="text-sm text-foreground whitespace-nowrap">{label}</label>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <Button onClick={handleSave} disabled={saving} size="sm" className="gradient-primary text-primary-foreground gap-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ
          </Button>
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">العلامة التجارية</h3>
          </div>
        </div>
        <div className="space-y-3">
          <Field label="اسم المنصة" value={settings.platformName} field="platformName" />
          <Field label="الشعار النصي" value={settings.platformSlogan} field="platformSlogan" />
          <Field label="اللون الرئيسي" value={settings.primaryColor} field="primaryColor" type="color" />
          <Field label="اللون الثانوي" value={settings.accentColor} field="accentColor" type="color" />
          <Field label="رابط الشعار" value={settings.logoUrl} field="logoUrl" />
          <Field label="رابط الأيقونة" value={settings.faviconUrl} field="faviconUrl" />
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4 justify-end">
          <Globe className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">اللغات والاتجاه</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <Select value={settings.defaultLanguage} onValueChange={v => setSettings(s => ({ ...s, defaultLanguage: v }))}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ar">العربية</SelectItem>
                <SelectItem value="fr">الفرنسية</SelectItem>
                <SelectItem value="en">الإنجليزية</SelectItem>
                <SelectItem value="es">الإسبانية</SelectItem>
              </SelectContent>
            </Select>
            <label className="text-sm text-foreground">اللغة الافتراضية</label>
          </div>
          <Field label="اللغات المدعومة (مفصولة بفاصلة)" value={settings.supportedLanguages} field="supportedLanguages" />
          <div className="flex items-center justify-between">
            <Switch checked={settings.rtlDefault} onCheckedChange={v => setSettings(s => ({ ...s, rtlDefault: v }))} />
            <label className="text-sm text-foreground">اتجاه RTL افتراضي</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.darkModeDefault} onCheckedChange={v => setSettings(s => ({ ...s, darkModeDefault: v }))} />
            <label className="text-sm text-foreground">الوضع الداكن افتراضي</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.showPartnerLogos} onCheckedChange={v => setSettings(s => ({ ...s, showPartnerLogos: v }))} />
            <label className="text-sm text-foreground">عرض شعارات الشركاء</label>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4 justify-end">
          <Type className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">معلومات التواصل والسيو</h3>
        </div>
        <div className="space-y-3">
          <Field label="البريد الإلكتروني" value={settings.footerEmail} field="footerEmail" />
          <Field label="واتساب" value={settings.footerWhatsApp} field="footerWhatsApp" />
          <Field label="فيسبوك" value={settings.socialFacebook} field="socialFacebook" />
          <Field label="إنستغرام" value={settings.socialInstagram} field="socialInstagram" />
          <Field label="تويتر / X" value={settings.socialTwitter} field="socialTwitter" />
          <Field label="لينكدإن" value={settings.socialLinkedIn} field="socialLinkedIn" />
          <Field label="عنوان SEO" value={settings.metaTitle} field="metaTitle" />
          <Field label="وصف SEO" value={settings.metaDescription} field="metaDescription" />
          <div className="border-t border-border pt-3 mt-2">
            <p className="text-xs font-bold text-foreground text-right mb-2">📊 أكواد التتبع والتسويق</p>
            <Field label="Facebook Pixel ID" value={settings.facebookPixelId} field="facebookPixelId" />
            <Field label="Google Ads ID (AW-...)" value={settings.googleAdsId} field="googleAdsId" />
            <Field label="Google Analytics ID (G-...)" value={settings.googleAnalyticsId} field="googleAnalyticsId" />
            <Field label="Google Ads Conversion Label" value={settings.googleAdsConversionLabel} field="googleAdsConversionLabel" />
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4 justify-end">
          <Image className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">CSS مخصص</h3>
        </div>
        <Textarea
          value={settings.customCss}
          onChange={e => setSettings(s => ({ ...s, customCss: e.target.value }))}
          placeholder="/* أضف CSS مخصص هنا */"
          className="bg-secondary/60 border-border text-sm font-mono min-h-[100px]"
        />
      </div>
    </div>
  );
}
