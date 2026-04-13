import { useState, useEffect } from "react";
import { Globe, Plus, Trash2, Save, Loader2, ToggleLeft, ToggleRight, Edit2, X, Check, Languages } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/context";
import { useGoogleTranslate } from "@/hooks/useGoogleTranslate";

interface PlatformLanguage {
  id: string;
  code: string;
  label: string;
  flag: string;
  is_rtl: boolean;
  is_active: boolean;
  sort_order: number;
}

interface TranslationEntry {
  id?: string;
  locale: string;
  namespace: string;
  key: string;
  value: string;
}

const NAMESPACES = ["common", "auth", "welcome", "customer", "driver", "delivery", "admin", "callCenter", "roles", "landing"];

const LanguageManagement = () => {
  const { t } = useI18n();
  const { translate, loading: translating } = useGoogleTranslate();
  const [languages, setLanguages] = useState<PlatformLanguage[]>([]);
  const [translations, setTranslations] = useState<TranslationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState<string | null>(null);
  const [selectedNs, setSelectedNs] = useState("common");
  const [showAddLang, setShowAddLang] = useState(false);
  const [newLang, setNewLang] = useState({ code: "", label: "", flag: "", is_rtl: false });
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [newTransKey, setNewTransKey] = useState("");
  const [newTransValue, setNewTransValue] = useState("");

  useEffect(() => {
    loadLanguages();
  }, []);

  useEffect(() => {
    if (selectedLocale) loadTranslations(selectedLocale);
  }, [selectedLocale]);

  const loadLanguages = async () => {
    const { data } = await supabase.from("platform_languages").select("*").order("sort_order");
    if (data) {
      setLanguages(data);
      if (!selectedLocale && data.length > 0) setSelectedLocale(data[0].code);
    }
    setLoading(false);
  };

  const loadTranslations = async (locale: string) => {
    const { data } = await supabase.from("platform_translations").select("*").eq("locale", locale);
    setTranslations(data || []);
  };

  const toggleLanguage = async (lang: PlatformLanguage) => {
    const { error } = await supabase.from("platform_languages").update({ is_active: !lang.is_active }).eq("id", lang.id);
    if (error) {
      toast({ title: "❌ خطأ", description: error.message, variant: "destructive" });
    } else {
      setLanguages(prev => prev.map(l => l.id === lang.id ? { ...l, is_active: !l.is_active } : l));
      toast({ title: `✅ ${lang.is_active ? "تم تعطيل" : "تم تفعيل"} ${lang.label}` });
    }
  };

  const addLanguage = async () => {
    if (!newLang.code || !newLang.label) {
      toast({ title: "❌ أدخل رمز اللغة والاسم", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("platform_languages").insert({
      code: newLang.code.toLowerCase(),
      label: newLang.label,
      flag: newLang.flag || "🌐",
      is_rtl: newLang.is_rtl,
      sort_order: languages.length + 1,
    });
    if (error) {
      toast({ title: "❌ خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `✅ تمت إضافة اللغة ${newLang.label}` });
      setNewLang({ code: "", label: "", flag: "", is_rtl: false });
      setShowAddLang(false);
      await loadLanguages();
    }
    setSaving(false);
  };

  const deleteLanguage = async (lang: PlatformLanguage) => {
    if (["ar", "fr", "en", "es"].includes(lang.code)) {
      toast({ title: "❌ لا يمكن حذف اللغات الأساسية", variant: "destructive" });
      return;
    }
    const { error: tErr } = await supabase.from("platform_translations").delete().eq("locale", lang.code);
    const { error } = await supabase.from("platform_languages").delete().eq("id", lang.id);
    if (error) {
      toast({ title: "❌ خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `✅ تم حذف اللغة ${lang.label}` });
      if (selectedLocale === lang.code) setSelectedLocale(languages[0]?.code || null);
      await loadLanguages();
    }
  };

  const saveTranslation = async (entry: TranslationEntry) => {
    setSaving(true);
    if (entry.id) {
      const { error } = await supabase.from("platform_translations").update({ value: entry.value, updated_at: new Date().toISOString() }).eq("id", entry.id);
      if (error) toast({ title: "❌ خطأ", description: error.message, variant: "destructive" });
      else toast({ title: "✅ تم حفظ الترجمة" });
    } else {
      const { error } = await supabase.from("platform_translations").insert({
        locale: entry.locale,
        namespace: entry.namespace,
        key: entry.key,
        value: entry.value,
      });
      if (error) toast({ title: "❌ خطأ", description: error.message, variant: "destructive" });
      else {
        toast({ title: "✅ تمت إضافة الترجمة" });
        if (selectedLocale) await loadTranslations(selectedLocale);
      }
    }
    setEditingKey(null);
    setSaving(false);
  };

  const addNewTranslation = async () => {
    if (!newTransKey || !selectedLocale) return;
    await saveTranslation({
      locale: selectedLocale,
      namespace: selectedNs,
      key: newTransKey,
      value: newTransValue,
    });
    setNewTransKey("");
    setNewTransValue("");
  };

  const deleteTranslation = async (id: string) => {
    const { error } = await supabase.from("platform_translations").delete().eq("id", id);
    if (error) toast({ title: "❌ خطأ", description: error.message, variant: "destructive" });
    else {
      toast({ title: "✅ تم حذف الترجمة" });
      setTranslations(prev => prev.filter(t => t.id !== id));
    }
  };

  const filteredTranslations = translations.filter(t => t.namespace === selectedNs);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="glass-card rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button size="sm" onClick={() => setShowAddLang(true)} className="gradient-primary text-primary-foreground gap-1">
          <Plus className="w-4 h-4" /> إضافة لغة
        </Button>
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground text-lg">إدارة اللغات</h3>
        </div>
      </div>

      {/* Add language form */}
      {showAddLang && (
        <div className="border border-primary/30 rounded-lg p-4 space-y-3 bg-primary/5">
          <div className="flex items-center justify-between">
            <Button size="sm" variant="ghost" onClick={() => setShowAddLang(false)}><X className="w-4 h-4" /></Button>
            <h4 className="font-semibold text-foreground text-sm">إضافة لغة جديدة</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block text-right">رمز اللغة</label>
              <Input value={newLang.code} onChange={e => setNewLang(p => ({ ...p, code: e.target.value }))}
                placeholder="tr" className="text-sm h-9 bg-secondary/60 text-center" maxLength={5} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block text-right">الاسم</label>
              <Input value={newLang.label} onChange={e => setNewLang(p => ({ ...p, label: e.target.value }))}
                placeholder="Türkçe" className="text-sm h-9 bg-secondary/60" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block text-right">العلم</label>
              <Input value={newLang.flag} onChange={e => setNewLang(p => ({ ...p, flag: e.target.value }))}
                placeholder="🇹🇷" className="text-sm h-9 bg-secondary/60 text-center" maxLength={4} />
            </div>
            <div className="flex flex-col items-end gap-1">
              <label className="text-xs text-muted-foreground">RTL</label>
              <Switch checked={newLang.is_rtl} onCheckedChange={v => setNewLang(p => ({ ...p, is_rtl: v }))} />
            </div>
          </div>
          <Button onClick={addLanguage} disabled={saving} size="sm" className="gradient-primary text-primary-foreground gap-1 w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} تأكيد الإضافة
          </Button>
        </div>
      )}

      {/* Languages list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {languages.map(lang => (
          <div key={lang.id}
            className={`rounded-xl border p-3 flex items-center justify-between cursor-pointer transition-all ${
              selectedLocale === lang.code ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"
            }`}
            onClick={() => setSelectedLocale(lang.code)}
          >
            <div className="flex items-center gap-2">
              <Switch checked={lang.is_active} onCheckedChange={() => toggleLanguage(lang)}
                onClick={e => e.stopPropagation()} />
              {!["ar", "fr", "en", "es"].includes(lang.code) && (
                <button onClick={e => { e.stopPropagation(); deleteLanguage(lang); }}
                  className="p-1 hover:bg-destructive/20 rounded text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">{lang.label}</p>
                <p className="text-xs text-muted-foreground">{lang.code} {lang.is_rtl ? "• RTL" : ""}</p>
              </div>
              <span className="text-2xl">{lang.flag}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Translations editor */}
      {selectedLocale && (
        <div className="border-t border-border pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{filteredTranslations.length} ترجمة</p>
            <h4 className="font-semibold text-foreground">
              ترجمات: {languages.find(l => l.code === selectedLocale)?.label} ({selectedLocale})
            </h4>
          </div>

          <Tabs value={selectedNs} onValueChange={setSelectedNs}>
            <TabsList className="flex-wrap h-auto gap-1 bg-secondary/60">
              {NAMESPACES.map(ns => (
                <TabsTrigger key={ns} value={ns} className="text-xs px-3 py-1.5">{ns}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Add new translation */}
          <div className="flex gap-2 items-end">
            <Button size="sm" onClick={addNewTranslation} disabled={!newTransKey || saving}
              className="gradient-primary text-primary-foreground shrink-0">
              <Plus className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground block text-right mb-1">القيمة</label>
              <Input value={newTransValue} onChange={e => setNewTransValue(e.target.value)}
                placeholder="الترجمة..." className="text-sm h-9 bg-secondary/60" />
            </div>
            <div className="w-40">
              <label className="text-xs text-muted-foreground block text-right mb-1">المفتاح</label>
              <Input value={newTransKey} onChange={e => setNewTransKey(e.target.value)}
                placeholder="myKey" className="text-sm h-9 bg-secondary/60" dir="ltr" />
            </div>
          </div>

          {/* Translations list */}
          <div className="space-y-1 max-h-96 overflow-auto">
            {filteredTranslations.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-6">لا توجد ترجمات مخصصة لهذا القسم</p>
            )}
            {filteredTranslations.map(entry => (
              <div key={entry.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/40 group">
                <button onClick={() => deleteTranslation(entry.id!)}
                  className="p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 rounded text-destructive transition-opacity">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                {editingKey === entry.id ? (
                  <div className="flex-1 flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => saveTranslation(entry)}>
                      <Check className="w-4 h-4 text-success" />
                    </Button>
                    <Input value={entry.value}
                      onChange={e => setTranslations(prev => prev.map(t => t.id === entry.id ? { ...t, value: e.target.value } : t))}
                      className="text-sm h-8 bg-secondary/60 flex-1" autoFocus />
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-between cursor-pointer"
                    onClick={() => setEditingKey(entry.id!)}>
                    <span className="text-sm text-foreground">{entry.value}</span>
                    <span className="text-xs text-muted-foreground font-mono" dir="ltr">{entry.key}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageManagement;
