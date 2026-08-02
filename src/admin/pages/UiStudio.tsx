import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Layout, Save, RotateCcw, Loader2, Smartphone, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_UI_OPTIONS, type UiScope, type UiStudioOptions } from "@/hooks/useUiStudio";

const SCOPES: { key: UiScope; label: string }[] = [
  { key: "customer", label: "الزبون" },
  { key: "driver", label: "سائق ركاب" },
  { key: "delivery", label: "سائق توصيل" },
  { key: "store", label: "المتجر" },
  { key: "callcenter", label: "مركز الاتصال" },
];

const LAYOUTS: { id: string; label: string; desc: string }[] = [
  { id: "classic", label: "الكلاسيكي", desc: "التصميم الحالي المعتمد" },
  { id: "studio", label: "ستوديو (خريطة كبيرة)", desc: "بطاقات مصغّرة أعلى، خريطة كبيرة، خيارات أسفل" },
];

const TOGGLES: { key: keyof UiStudioOptions; label: string }[] = [
  { key: "showTopBar", label: "الشريط العلوي (إحصائيات)" },
  { key: "showQuickCards", label: "البطاقات المصغّرة" },
  { key: "showOptionsBar", label: "الخيارات الإضافية" },
  { key: "showFareCard", label: "بطاقة التكلفة" },
  { key: "showSafetyStrip", label: "شريط الأمان" },
  { key: "showBottomNav", label: "الشريط السفلي" },
];

const UiStudio = () => {
  const [scope, setScope] = useState<UiScope>("customer");
  const [layout, setLayout] = useState("classic");
  const [options, setOptions] = useState<UiStudioOptions>(DEFAULT_UI_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("ui_studio_settings")
        .select("layout, options")
        .eq("scope", scope)
        .maybeSingle();
      if (!alive) return;
      setLayout((data as any)?.layout || "classic");
      setOptions({ ...DEFAULT_UI_OPTIONS, ...(((data as any)?.options as Partial<UiStudioOptions>) || {}) });
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [scope]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("ui_studio_settings")
      .upsert({ scope, layout, options: options as any, is_active: true }, { onConflict: "scope" });
    setSaving(false);
    if (error) toast({ title: "تعذّر الحفظ", description: error.message, variant: "destructive" });
    else toast({ title: "تم تطبيق الشكل على كل الواجهات فوراً" });
  };

  const reset = () => { setOptions(DEFAULT_UI_OPTIONS); setLayout("classic"); };
  const set = <K extends keyof UiStudioOptions>(k: K, v: UiStudioOptions[K]) => setOptions(o => ({ ...o, [k]: v }));

  return (
    <div className="p-4 md:p-6 space-y-5" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl gradient-primary flex items-center justify-center">
            <Layout className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">ستوديو الواجهات</h1>
            <p className="text-xs text-muted-foreground">تحكّم في شكل كل واجهات المنصة وطبّقه فوراً</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset} className="gap-2"><RotateCcw className="w-4 h-4" />الافتراضي</Button>
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}تطبيق
          </Button>
        </div>
      </div>

      <Tabs value={scope} onValueChange={v => setScope(v as UiScope)}>
        <TabsList className="flex-wrap h-auto">
          {SCOPES.map(sc => <TabsTrigger key={sc.key} value={sc.key}>{sc.label}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="h-40 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {/* Layout choice */}
            <section className="glass-card rounded-2xl p-4 border border-border space-y-3">
              <h2 className="font-semibold text-foreground text-sm">التخطيط</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {LAYOUTS.map(l => (
                  <motion.button
                    key={l.id}
                    whileHover={{ y: -2 }}
                    onClick={() => setLayout(l.id)}
                    className={`text-right p-4 rounded-xl border-2 transition-all ${
                      layout === l.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-foreground">{l.label}</span>
                      {layout === l.id && <Badge className="gap-1 bg-primary/20 text-primary border-primary/30"><Check className="w-3 h-3" />مفعّل</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{l.desc}</p>
                  </motion.button>
                ))}
              </div>
            </section>

            {/* Element toggles */}
            <section className="glass-card rounded-2xl p-4 border border-border space-y-3">
              <h2 className="font-semibold text-foreground text-sm">العناصر الظاهرة</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {TOGGLES.map(tg => (
                  <div key={tg.key} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border">
                    <span className="text-sm text-foreground">{tg.label}</span>
                    <Switch
                      checked={Boolean(options[tg.key])}
                      onCheckedChange={v => set(tg.key, v as never)}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Shape controls */}
            <section className="glass-card rounded-2xl p-4 border border-border space-y-5">
              <h2 className="font-semibold text-foreground text-sm">الشكل والمقاسات</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground"><span>ارتفاع الخريطة</span><span>{options.mapHeight}px</span></div>
                <Slider value={[options.mapHeight]} min={200} max={560} step={10} onValueChange={([v]) => set("mapHeight", v)} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground"><span>نصف قطر الحواف</span><span>{options.radius}px</span></div>
                <Slider value={[options.radius]} min={0} max={32} step={1} onValueChange={([v]) => set("radius", v)} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground"><span>شدّة التوهج</span><span>{options.glow}</span></div>
                <Slider value={[options.glow]} min={0} max={80} step={5} onValueChange={([v]) => set("glow", v)} />
              </div>
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">كثافة المسافات</span>
                <div className="flex gap-2">
                  {(["compact", "comfortable", "spacious"] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => set("density", d)}
                      className={`px-4 py-2 rounded-xl text-xs border ${options.density === d ? "gradient-primary text-primary-foreground border-transparent" : "border-border text-muted-foreground"}`}
                    >
                      {d === "compact" ? "مضغوط" : d === "comfortable" ? "مريح" : "واسع"}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Live preview */}
          <section className="glass-card rounded-2xl p-4 border border-border h-fit lg:sticky lg:top-4">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-foreground text-sm">معاينة</h2>
            </div>
            <div
              className="mx-auto w-[240px] bg-background border border-border p-2 space-y-2 overflow-hidden"
              style={{ borderRadius: 24, aspectRatio: "9/17" }}
            >
              {options.showTopBar && <div className="h-5 rounded-lg bg-secondary/60" />}
              {options.showQuickCards && (
                <div className="grid grid-cols-2 gap-1.5">
                  {[0, 1, 2, 3].map(i => <div key={i} className="h-7 bg-secondary/50" style={{ borderRadius: options.radius / 2 }} />)}
                </div>
              )}
              <div
                className="bg-primary/20 border border-primary/30"
                style={{ height: Math.round(options.mapHeight / 3.2), borderRadius: options.radius / 1.5 }}
              />
              {options.showOptionsBar && <div className="h-12 bg-secondary/50" style={{ borderRadius: options.radius / 2 }} />}
              {options.showFareCard && <div className="h-7 bg-secondary/50" style={{ borderRadius: options.radius / 2 }} />}
              {options.showSafetyStrip && (
                <div className="grid grid-cols-4 gap-1">
                  {[0, 1, 2, 3].map(i => <div key={i} className="h-6 bg-secondary/40" style={{ borderRadius: options.radius / 3 }} />)}
                </div>
              )}
              <div className="h-8 rounded-xl gradient-primary" />
              {options.showBottomNav && <div className="h-6 rounded-lg bg-secondary/60" />}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 text-center">
              التغييرات تُطبَّق مباشرة على كل الأجهزة بعد الضغط على «تطبيق».
            </p>
          </section>
        </div>
      )}
    </div>
  );
};

export default UiStudio;
