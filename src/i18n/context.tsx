import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import type { Locale, TranslationSet } from "./types";
import { RTL_LOCALES } from "./types";
import en from "./locales/en";
import ar from "./locales/ar";
import fr from "./locales/fr";
import es from "./locales/es";
import { supabase } from "@/integrations/supabase/client";

const builtInTranslations: Record<string, TranslationSet> = { en, ar, fr, es };

interface LangInfo {
  code: string;
  label: string;
  flag: string;
  is_rtl: boolean;
  is_active: boolean;
}

interface I18nContextValue {
  locale: Locale;
  t: TranslationSet;
  setLocale: (locale: Locale) => void;
  dir: "ltr" | "rtl";
  locales: { code: Locale; label: string; flag: string }[];
  reloadLanguages: () => Promise<void>;
}

const STORAGE_KEY = "hn_locale";

const defaultLocales: LangInfo[] = [
  { code: "ar", label: "العربية", flag: "🇲🇦", is_rtl: true, is_active: true },
  { code: "fr", label: "Français", flag: "🇫🇷", is_rtl: false, is_active: true },
  { code: "en", label: "English", flag: "🇬🇧", is_rtl: false, is_active: true },
  { code: "es", label: "Español", flag: "🇪🇸", is_rtl: false, is_active: true },
];

function detectLocale(available: string[]): Locale {
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored && available.includes(stored)) return stored;
  const browserLang = navigator.language.split("-")[0];
  if (available.includes(browserLang)) return browserLang as Locale;
  return (available[0] || "ar") as Locale;
}

/** Deep-merge DB overrides into a built-in translation set */
function applyOverrides(base: TranslationSet, overrides: Record<string, Record<string, string>>): TranslationSet {
  const result = JSON.parse(JSON.stringify(base)) as any;
  for (const [ns, entries] of Object.entries(overrides)) {
    if (!result[ns]) result[ns] = {};
    for (const [key, val] of Object.entries(entries)) {
      result[ns][key] = val;
    }
  }
  return result as TranslationSet;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [langs, setLangs] = useState<LangInfo[]>(defaultLocales);
  const [dbOverrides, setDbOverrides] = useState<Record<string, Record<string, Record<string, string>>>>({});
  const [locale, setLocaleState] = useState<Locale>(() =>
    detectLocale(defaultLocales.filter(l => l.is_active).map(l => l.code))
  );

  const loadFromDB = useCallback(async () => {
    try {
      const [{ data: langData }, { data: transData }] = await Promise.all([
        supabase.from("platform_languages").select("*").order("sort_order"),
        supabase.from("platform_translations").select("*"),
      ]);

      if (langData && langData.length > 0) {
        setLangs(langData as LangInfo[]);
      }

      if (transData && transData.length > 0) {
        const grouped: Record<string, Record<string, Record<string, string>>> = {};
        for (const row of transData) {
          if (!grouped[row.locale]) grouped[row.locale] = {};
          if (!grouped[row.locale][row.namespace]) grouped[row.locale][row.namespace] = {};
          grouped[row.locale][row.namespace][row.key] = row.value;
        }
        setDbOverrides(grouped);
      }
    } catch {
      // Fallback to built-in if DB unavailable
    }
  }, []);

  useEffect(() => {
    loadFromDB();
  }, [loadFromDB]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  useEffect(() => {
    const langInfo = langs.find(l => l.code === locale);
    const isRtl = langInfo ? langInfo.is_rtl : RTL_LOCALES.includes(locale as any);
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = locale;
  }, [locale, langs]);

  const activeLocales = langs
    .filter(l => l.is_active)
    .map(l => ({ code: l.code as Locale, label: l.label, flag: l.flag }));

  // Build translation: start from built-in, overlay DB overrides
  const baseTranslation = builtInTranslations[locale] || builtInTranslations.en || en;
  const overridesForLocale = dbOverrides[locale] || {};
  const mergedTranslation = Object.keys(overridesForLocale).length > 0
    ? applyOverrides(baseTranslation, overridesForLocale)
    : baseTranslation;

  const langInfo = langs.find(l => l.code === locale);
  const dir: "ltr" | "rtl" = langInfo ? (langInfo.is_rtl ? "rtl" : "ltr") : (RTL_LOCALES.includes(locale as any) ? "rtl" : "ltr");

  const value: I18nContextValue = {
    locale,
    t: mergedTranslation,
    setLocale,
    dir,
    locales: activeLocales,
    reloadLanguages: loadFromDB,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
