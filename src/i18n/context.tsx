import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { Locale, TranslationSet } from "./types";
import { RTL_LOCALES } from "./types";
import en from "./locales/en";
import ar from "./locales/ar";
import fr from "./locales/fr";
import es from "./locales/es";

const translations: Record<Locale, TranslationSet> = { en, ar, fr, es };

interface I18nContextValue {
  locale: Locale;
  t: TranslationSet;
  setLocale: (locale: Locale) => void;
  dir: "ltr" | "rtl";
  locales: { code: Locale; label: string; flag: string }[];
}

const STORAGE_KEY = "hn_locale";

const availableLocales: I18nContextValue["locales"] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ar", label: "العربية", flag: "🇲🇦" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];

function detectLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored && translations[stored]) return stored;

  const browserLang = navigator.language.split("-")[0];
  if (browserLang === "ar") return "ar";
  if (browserLang === "fr") return "fr";
  if (browserLang === "es") return "es";
  return "en";
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  useEffect(() => {
    const dir = RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [locale]);

  const value: I18nContextValue = {
    locale,
    t: translations[locale],
    setLocale,
    dir: RTL_LOCALES.includes(locale) ? "rtl" : "ltr",
    locales: availableLocales,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
