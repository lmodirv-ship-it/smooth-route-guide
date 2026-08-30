import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  MANARA_DEFAULTS,
  MANARA_SETTINGS_KEY,
  mergeManara,
  type ManaraContent,
} from "@/hooks/useManaraContent";

const ManaraSettings = () => {
  const [content, setContent] = useState<ManaraContent>(MANARA_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", MANARA_SETTINGS_KEY)
        .maybeSingle();
      setContent(mergeManara(data?.value));
      setLoading(false);
    })();
  }, []);

  const set = <K extends keyof ManaraContent>(key: K, value: ManaraContent[K]) =>
    setContent((c) => ({ ...c, [key]: value }));

  const setPillar = (index: number, field: "icon" | "title" | "description", value: string) =>
    setContent((c) => ({
      ...c,
      pillars: c.pillars.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    }));

  const save = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("key", MANARA_SETTINGS_KEY)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("app_settings")
          .update({ value: content as any, updated_at: new Date().toISOString(), updated_by: user?.id })
          .eq("key", MANARA_SETTINGS_KEY);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("app_settings")
          .insert({ key: MANARA_SETTINGS_KEY, value: content as any, updated_by: user?.id });
        if (error) throw error;
      }
      toast({ title: "✅ تم حفظ محتوى صفحة منارة" });
    } catch (err: any) {
      toast({ title: "❌ فشل الحفظ", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">🌐 صفحة منارة — المحتوى والكرة ثلاثية الأبعاد</CardTitle>
          <Button onClick={save} disabled={saving} size="sm">
            {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
            حفظ
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>اسم العلامة (الهيدر)</Label>
              <Input value={content.brand} onChange={(e) => set("brand", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>العنوان الرئيسي</Label>
              <Input value={content.heroTitle} onChange={(e) => set("heroTitle", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>العنوان الفرعي المُبرز</Label>
              <Input value={content.heroHighlight} onChange={(e) => set("heroHighlight", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>عنوان قسم الأعمدة</Label>
              <Input value={content.pillarsTitle} onChange={(e) => set("pillarsTitle", e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>وصف الهيرو</Label>
            <Textarea rows={3} value={content.heroDescription} onChange={(e) => set("heroDescription", e.target.value)} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>زر أساسي — النص</Label>
              <Input value={content.primaryCtaLabel} onChange={(e) => set("primaryCtaLabel", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>زر أساسي — الرابط</Label>
              <Input value={content.primaryCtaLink} onChange={(e) => set("primaryCtaLink", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>زر ثانوي — النص</Label>
              <Input value={content.secondaryCtaLabel} onChange={(e) => set("secondaryCtaLabel", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>زر ثانوي — الرابط</Label>
              <Input value={content.secondaryCtaLink} onChange={(e) => set("secondaryCtaLink", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">🪐 الكرة ثلاثية الأبعاد</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <Label>إظهار الكرة</Label>
            <Switch checked={content.showSphere} onCheckedChange={(v) => set("showSphere", v)} />
          </div>
          <div className="space-y-2">
            <Label>ارتفاع الكرة من الصفحة: {content.sphereHeightPercent}%</Label>
            <Slider
              min={30}
              max={100}
              step={5}
              value={[content.sphereHeightPercent]}
              onValueChange={([v]) => set("sphereHeightPercent", v)}
            />
          </div>
          <div className="space-y-2">
            <Label>مدة الدوران الكاملة: {content.sphereSpeed} ثانية</Label>
            <Slider
              min={6}
              max={60}
              step={2}
              value={[content.sphereSpeed]}
              onValueChange={([v]) => set("sphereSpeed", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">🏛️ أعمدة المنارة</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => set("pillars", [...content.pillars, { icon: "Sparkles", title: "عنوان جديد", description: "" }])}
          >
            <Plus className="ml-2 h-4 w-4" />
            إضافة عمود
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {content.pillars.map((pillar, index) => (
            <div key={index} className="space-y-3 rounded-lg border border-border/60 p-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>الأيقونة (Lucide)</Label>
                  <Input value={pillar.icon} onChange={(e) => setPillar(index, "icon", e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>العنوان</Label>
                  <Input value={pillar.title} onChange={(e) => setPillar(index, "title", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>الوصف</Label>
                <Textarea rows={2} value={pillar.description} onChange={(e) => setPillar(index, "description", e.target.value)} />
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => set("pillars", content.pillars.filter((_, i) => i !== index))}
              >
                <Trash2 className="ml-2 h-4 w-4" />
                حذف
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">📣 قسم الدعوة والتذييل</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>العنوان</Label>
              <Input value={content.ctaTitle} onChange={(e) => set("ctaTitle", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>نص الزر</Label>
              <Input value={content.ctaButtonLabel} onChange={(e) => set("ctaButtonLabel", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>رابط الزر</Label>
              <Input value={content.ctaButtonLink} onChange={(e) => set("ctaButtonLink", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>نص التذييل</Label>
              <Input value={content.footerText} onChange={(e) => set("footerText", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>الوصف</Label>
            <Textarea rows={2} value={content.ctaDescription} onChange={(e) => set("ctaDescription", e.target.value)} />
          </div>
          <Button onClick={save} disabled={saving} className="gradient-primary text-primary-foreground">
            {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
            حفظ محتوى منارة
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManaraSettings;
