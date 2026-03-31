import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Eye, EyeOff, Save, ArrowRight, ArrowLeft, GripVertical, Loader2, Palette, Type, Image, Link, ToggleLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SectionConfig {
  id: string;
  label: string;
  editableProps: string[];
}

interface PageConfig {
  slug: string;
  label: string;
  path: string;
  sections: SectionConfig[];
}

const PAGES: PageConfig[] = [
  {
    slug: "landing",
    label: "الصفحة الرئيسية",
    path: "/",
    sections: [
      { id: "hero", label: "البانر الرئيسي", editableProps: ["title", "description", "buttonText", "buttonLink", "backgroundImage", "backgroundColor"] },
      { id: "features", label: "المميزات", editableProps: ["title", "description", "items"] },
      { id: "download", label: "قسم التحميل", editableProps: ["title", "description", "buttonText", "buttonLink", "backgroundImage"] },
      { id: "ads", label: "الإعلانات", editableProps: ["title"] },
      { id: "footer", label: "التذييل", editableProps: ["title", "description", "links"] },
    ],
  },
  {
    slug: "welcome",
    label: "صفحة الترحيب",
    path: "/welcome",
    sections: [
      { id: "welcome-hero", label: "ترحيب", editableProps: ["title", "description", "backgroundImage", "backgroundColor"] },
      { id: "welcome-cards", label: "البطاقات", editableProps: ["title", "items"] },
    ],
  },
  {
    slug: "auth",
    label: "صفحة تسجيل الدخول",
    path: "/login",
    sections: [
      { id: "auth-header", label: "الرأس", editableProps: ["title", "description", "logoImage"] },
      { id: "auth-form", label: "النموذج", editableProps: ["buttonText", "backgroundColor"] },
    ],
  },
  {
    slug: "customer",
    label: "صفحة العملاء",
    path: "/customer",
    sections: [
      { id: "customer-header", label: "الرأس", editableProps: ["title", "description"] },
      { id: "customer-booking", label: "الحجز", editableProps: ["title", "buttonText"] },
      { id: "customer-map", label: "الخريطة", editableProps: ["title"] },
    ],
  },
  {
    slug: "driver",
    label: "صفحة السائقين",
    path: "/driver",
    sections: [
      { id: "driver-header", label: "الرأس", editableProps: ["title", "description"] },
      { id: "driver-status", label: "حالة السائق", editableProps: ["title"] },
      { id: "driver-earnings", label: "الأرباح", editableProps: ["title"] },
    ],
  },
  {
    slug: "delivery-home",
    label: "صفحة التوصيل",
    path: "/delivery",
    sections: [
      { id: "delivery-hero", label: "البانر", editableProps: ["title", "description", "backgroundImage"] },
      { id: "delivery-categories", label: "الأقسام", editableProps: ["title"] },
      { id: "delivery-restaurants", label: "المطاعم", editableProps: ["title"] },
    ],
  },
  {
    slug: "community",
    label: "الدردشة المجتمعية",
    path: "/community",
    sections: [
      { id: "community-header", label: "الرأس", editableProps: ["title", "description"] },
    ],
  },
];

const PROP_LABELS: Record<string, { label: string; type: "text" | "textarea" | "color" | "image" | "link" | "items" }> = {
  title: { label: "العنوان", type: "text" },
  description: { label: "الوصف", type: "textarea" },
  buttonText: { label: "نص الزر", type: "text" },
  buttonLink: { label: "رابط الزر", type: "link" },
  backgroundImage: { label: "صورة الخلفية", type: "image" },
  backgroundColor: { label: "لون الخلفية", type: "color" },
  logoImage: { label: "الشعار", type: "image" },
  links: { label: "الروابط", type: "textarea" },
  items: { label: "العناصر (JSON)", type: "textarea" },
};

interface SavedCustomization {
  id: string;
  page_slug: string;
  section_id: string;
  properties: Record<string, any>;
  sort_order: number;
  is_visible: boolean;
}

const PageManagement = () => {
  const [selectedPage, setSelectedPage] = useState<PageConfig | null>(null);
  const [selectedSection, setSelectedSection] = useState<SectionConfig | null>(null);
  const [savedData, setSavedData] = useState<SavedCustomization[]>([]);
  const [editingProps, setEditingProps] = useState<Record<string, any>>({});
  const [sectionVisibility, setSectionVisibility] = useState<Record<string, boolean>>({});
  const [sectionOrder, setSectionOrder] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load saved data for selected page
  useEffect(() => {
    if (!selectedPage) return;
    setLoading(true);
    supabase
      .from("page_customizations")
      .select("*")
      .eq("page_slug", selectedPage.slug)
      .then(({ data }) => {
        const items = (data as SavedCustomization[]) || [];
        setSavedData(items);
        const vis: Record<string, boolean> = {};
        const ord: Record<string, number> = {};
        items.forEach(item => {
          vis[item.section_id] = item.is_visible;
          ord[item.section_id] = item.sort_order;
        });
        selectedPage.sections.forEach((s, i) => {
          if (vis[s.id] === undefined) vis[s.id] = true;
          if (ord[s.id] === undefined) ord[s.id] = i;
        });
        setSectionVisibility(vis);
        setSectionOrder(ord);
        setLoading(false);
      });
  }, [selectedPage]);

  // Load section props when selected
  useEffect(() => {
    if (!selectedSection) return;
    const existing = savedData.find(d => d.section_id === selectedSection.id);
    setEditingProps(existing?.properties || {});
  }, [selectedSection, savedData]);

  const handleSaveSection = async () => {
    if (!selectedPage || !selectedSection) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      page_slug: selectedPage.slug,
      section_id: selectedSection.id,
      properties: editingProps,
      sort_order: sectionOrder[selectedSection.id] ?? 0,
      is_visible: sectionVisibility[selectedSection.id] ?? true,
      updated_by: user?.id || null,
      updated_at: new Date().toISOString(),
    };

    const existing = savedData.find(d => d.section_id === selectedSection.id);
    let error;

    if (existing) {
      ({ error } = await supabase.from("page_customizations").update(payload).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("page_customizations").insert(payload));
    }

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم الحفظ", description: `تم حفظ إعدادات "${selectedSection.label}" بنجاح` });
      // Refresh
      const { data } = await supabase.from("page_customizations").select("*").eq("page_slug", selectedPage.slug);
      setSavedData((data as SavedCustomization[]) || []);
    }
    setSaving(false);
  };

  const handleSaveAllVisibility = async () => {
    if (!selectedPage) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();

    for (const section of selectedPage.sections) {
      const existing = savedData.find(d => d.section_id === section.id);
      const payload = {
        page_slug: selectedPage.slug,
        section_id: section.id,
        properties: existing?.properties || {},
        sort_order: sectionOrder[section.id] ?? 0,
        is_visible: sectionVisibility[section.id] ?? true,
        updated_by: user?.id || null,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        await supabase.from("page_customizations").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("page_customizations").insert(payload);
      }
    }

    toast({ title: "تم الحفظ", description: "تم حفظ جميع إعدادات الإظهار والترتيب" });
    const { data } = await supabase.from("page_customizations").select("*").eq("page_slug", selectedPage.slug);
    setSavedData((data as SavedCustomization[]) || []);
    setSaving(false);
  };

  const renderPropEditor = (propKey: string) => {
    const meta = PROP_LABELS[propKey] || { label: propKey, type: "text" };
    const value = editingProps[propKey] || "";

    return (
      <div key={propKey} className="space-y-1.5">
        <Label className="text-sm flex items-center gap-1.5">
          {meta.type === "color" && <Palette className="w-3.5 h-3.5" />}
          {meta.type === "text" && <Type className="w-3.5 h-3.5" />}
          {meta.type === "image" && <Image className="w-3.5 h-3.5" />}
          {meta.type === "link" && <Link className="w-3.5 h-3.5" />}
          {meta.label}
        </Label>
        {meta.type === "textarea" || meta.type === "items" ? (
          <Textarea
            value={typeof value === "string" ? value : JSON.stringify(value, null, 2)}
            onChange={e => setEditingProps(p => ({ ...p, [propKey]: e.target.value }))}
            className="text-sm min-h-[80px]"
            dir="auto"
          />
        ) : meta.type === "color" ? (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={value || "#000000"}
              onChange={e => setEditingProps(p => ({ ...p, [propKey]: e.target.value }))}
              className="w-10 h-10 rounded border border-border cursor-pointer"
            />
            <Input
              value={value}
              onChange={e => setEditingProps(p => ({ ...p, [propKey]: e.target.value }))}
              placeholder="#000000"
              className="text-sm flex-1"
              dir="ltr"
            />
          </div>
        ) : (
          <Input
            value={value}
            onChange={e => setEditingProps(p => ({ ...p, [propKey]: e.target.value }))}
            className="text-sm"
            dir="auto"
          />
        )}
      </div>
    );
  };

  // Page list view
  if (!selectedPage) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6" dir="rtl">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">إدارة الصفحات</h1>
          <Badge variant="secondary">{PAGES.length} صفحة</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PAGES.map(page => {
            const customized = savedData.filter(d => d.page_slug === page.slug).length > 0;
            return (
              <button
                key={page.slug}
                onClick={() => { setSelectedPage(page); setSelectedSection(null); }}
                className="rounded-xl border border-border p-5 glass-strong text-right hover:border-primary/50 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-foreground">{page.label}</h3>
                <p className="text-xs text-muted-foreground mt-1">{page.sections.length} قسم</p>
                <p className="text-xs text-muted-foreground font-mono mt-1" dir="ltr">{page.path}</p>
              </button>
            );
          })}
        </div>
      </motion.div>
    );
  }

  // Sections list + editor
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => { setSelectedPage(null); setSelectedSection(null); setSavedData([]); }}>
          <ArrowRight className="w-4 h-4 ml-1" />
          رجوع
        </Button>
        <FileText className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold text-foreground">{selectedPage.label}</h1>
        <Badge variant="secondary">{selectedPage.sections.length} قسم</Badge>
        <Button size="sm" variant="outline" onClick={handleSaveAllVisibility} disabled={saving} className="mr-auto">
          {saving ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Save className="w-4 h-4 ml-1" />}
          حفظ الترتيب والإظهار
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sections List */}
          <div className="lg:col-span-1 space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">أقسام الصفحة</h2>
            {selectedPage.sections.map((section, idx) => (
              <button
                key={section.id}
                onClick={() => setSelectedSection(section)}
                className={`w-full rounded-lg border p-3 text-right transition-all flex items-center gap-3 ${
                  selectedSection?.id === section.id
                    ? "border-primary bg-primary/5"
                    : "border-border glass-strong hover:border-primary/30"
                }`}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{section.label}</p>
                  <p className="text-xs text-muted-foreground">{section.editableProps.length} خاصية</p>
                </div>
                <div className="flex items-center gap-2">
                  {savedData.find(d => d.section_id === section.id) && (
                    <Badge variant="outline" className="text-[10px] text-success border-success/30">محفوظ</Badge>
                  )}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setSectionVisibility(v => ({ ...v, [section.id]: !v[section.id] }));
                    }}
                    className="p-1 hover:bg-secondary rounded"
                  >
                    {sectionVisibility[section.id] !== false ? (
                      <Eye className="w-4 h-4 text-success" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-destructive" />
                    )}
                  </button>
                </div>
              </button>
            ))}
          </div>

          {/* Property Editor */}
          <div className="lg:col-span-2">
            {selectedSection ? (
              <div className="rounded-xl border border-border glass-strong p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ToggleLeft className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-foreground">{selectedSection.label}</h2>
                  </div>
                  <Button onClick={handleSaveSection} disabled={saving} size="sm">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Save className="w-4 h-4 ml-1" />}
                    حفظ
                  </Button>
                </div>

                {/* Visibility & Order */}
                <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 border border-border">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">إظهار القسم</Label>
                    <Switch
                      checked={sectionVisibility[selectedSection.id] !== false}
                      onCheckedChange={v => setSectionVisibility(prev => ({ ...prev, [selectedSection.id]: v }))}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">الترتيب</Label>
                    <Input
                      type="number"
                      value={sectionOrder[selectedSection.id] ?? 0}
                      onChange={e => setSectionOrder(prev => ({ ...prev, [selectedSection.id]: parseInt(e.target.value) || 0 }))}
                      className="w-20 h-8 text-sm"
                    />
                  </div>
                </div>

                {/* Editable Properties */}
                <div className="space-y-4">
                  {selectedSection.editableProps.map(prop => renderPropEditor(prop))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border glass-strong p-10 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">اختر قسمًا لتعديل خصائصه</p>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default PageManagement;
