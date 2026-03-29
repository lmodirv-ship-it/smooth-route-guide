import { useState, useEffect } from "react";
import { Eye, EyeOff, Save, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SECTIONS = [
  { key: "hero", label: "قسم الترحيب (Hero)" },
  { key: "services", label: "قائمة الخدمات" },
  { key: "store_button", label: "زر المتجر" },
  { key: "download_apps", label: "تحميل التطبيقات" },
  { key: "community_chat", label: "الدردشة المجتمعية" },
  { key: "ai_assistant", label: "المساعد الذكي" },
  { key: "contact_footer", label: "تذييل التواصل" },
  { key: "driver_section", label: "قسم السائقين" },
  { key: "delivery_section", label: "قسم التوصيل" },
  { key: "promotions", label: "العروض والترويج" },
  { key: "subscription_plans", label: "خطط الاشتراك" },
  { key: "city_activation", label: "تنشيط المدن" },
  { key: "earnings_page", label: "صفحة الأرباح" },
  { key: "live_map", label: "الخريطة الحية" },
  { key: "documents_page", label: "صفحة الوثائق" },
  { key: "alerts_page", label: "صفحة التنبيهات" },
];

export default function VisibilitySettings() {
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("app_settings").select("key, value").eq("key", "ui_visibility").maybeSingle();
      if (data?.value) {
        setVisibility(data.value as Record<string, boolean>);
      } else {
        const defaults: Record<string, boolean> = {};
        SECTIONS.forEach(s => { defaults[s.key] = true; });
        setVisibility(defaults);
      }
      setLoaded(true);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: existing } = await supabase.from("app_settings").select("id").eq("key", "ui_visibility").maybeSingle();
      if (existing) {
        await supabase.from("app_settings").update({ value: visibility as any, updated_at: new Date().toISOString(), updated_by: user?.id }).eq("key", "ui_visibility");
      } else {
        await supabase.from("app_settings").insert({ key: "ui_visibility", value: visibility as any, updated_by: user?.id });
      }
      toast({ title: "✅ تم حفظ إعدادات الإظهار/الإخفاء" });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (!loaded) return null;

  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ
        </Button>
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" /> التحكم في الإظهار والإخفاء
        </h3>
      </div>
      <p className="text-sm text-muted-foreground text-right">تحكم في ما يظهر وما يختفي في الصفحات الرئيسية</p>

      {/* Master toggle buttons */}
      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={() => {
            const all: Record<string, boolean> = {};
            SECTIONS.forEach(s => { all[s.key] = false; });
            setVisibility(all);
          }}
        >
          <EyeOff className="w-4 h-4" /> إخفاء الكل
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          onClick={() => {
            const all: Record<string, boolean> = {};
            SECTIONS.forEach(s => { all[s.key] = true; });
            setVisibility(all);
          }}
        >
          <Eye className="w-4 h-4" /> إظهار الكل
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SECTIONS.map(s => (
          <div key={s.key} className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/30">
            <Switch
              checked={visibility[s.key] !== false}
              onCheckedChange={v => setVisibility(prev => ({ ...prev, [s.key]: v }))}
            />
            <div className="flex items-center gap-2 text-sm text-foreground">
              {visibility[s.key] !== false ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
