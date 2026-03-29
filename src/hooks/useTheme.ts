import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ThemeId = "edge" | "black" | "white" | "normal" | "royal" | "sunset";

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  label: string;
  description: string;
  official?: boolean;
  colors: Record<string, string>;
}

export const THEMES: ThemeDefinition[] = [
  {
    id: "edge",
    name: "EDGE",
    label: "Official Theme",
    description: "الهوية البصرية الأساسية — أسود كوني مع توهج ذهبي",
    official: true,
    colors: {
      "--background": "0 0% 0%",
      "--foreground": "40 20% 95%",
      "--card": "220 18% 11%",
      "--card-foreground": "40 20% 95%",
      "--popover": "220 18% 11%",
      "--popover-foreground": "40 20% 95%",
      "--primary": "32 95% 55%",
      "--primary-foreground": "220 20% 7%",
      "--secondary": "220 15% 16%",
      "--secondary-foreground": "40 20% 90%",
      "--muted": "220 15% 14%",
      "--muted-foreground": "220 10% 55%",
      "--accent": "32 90% 50%",
      "--accent-foreground": "220 20% 7%",
      "--destructive": "0 72% 51%",
      "--destructive-foreground": "0 0% 100%",
      "--border": "220 15% 18%",
      "--input": "220 15% 18%",
      "--ring": "32 95% 55%",
      "--sidebar-background": "220 18% 9%",
      "--sidebar-foreground": "40 20% 90%",
      "--sidebar-primary": "32 95% 55%",
      "--sidebar-primary-foreground": "220 20% 7%",
      "--sidebar-accent": "220 15% 14%",
      "--sidebar-accent-foreground": "40 20% 90%",
      "--sidebar-border": "220 15% 18%",
      "--sidebar-ring": "32 95% 55%",
      "--success": "145 63% 42%",
      "--warning": "45 93% 47%",
      "--info": "205 78% 56%",
      "--glow-orange": "32 95% 55%",
      "--glow-blue": "205 78% 56%",
    },
  },
  {
    id: "black",
    name: "BLACK",
    label: "Stealth Dark",
    description: "أسود خالص مع لمسات فضية — أناقة مطلقة",
    colors: {
      "--background": "0 0% 3%",
      "--foreground": "0 0% 90%",
      "--card": "0 0% 8%",
      "--card-foreground": "0 0% 90%",
      "--popover": "0 0% 8%",
      "--popover-foreground": "0 0% 90%",
      "--primary": "0 0% 75%",
      "--primary-foreground": "0 0% 5%",
      "--secondary": "0 0% 12%",
      "--secondary-foreground": "0 0% 85%",
      "--muted": "0 0% 10%",
      "--muted-foreground": "0 0% 50%",
      "--accent": "0 0% 65%",
      "--accent-foreground": "0 0% 5%",
      "--destructive": "0 72% 51%",
      "--destructive-foreground": "0 0% 100%",
      "--border": "0 0% 15%",
      "--input": "0 0% 15%",
      "--ring": "0 0% 75%",
      "--sidebar-background": "0 0% 5%",
      "--sidebar-foreground": "0 0% 85%",
      "--sidebar-primary": "0 0% 75%",
      "--sidebar-primary-foreground": "0 0% 5%",
      "--sidebar-accent": "0 0% 12%",
      "--sidebar-accent-foreground": "0 0% 85%",
      "--sidebar-border": "0 0% 15%",
      "--sidebar-ring": "0 0% 75%",
      "--success": "145 63% 42%",
      "--warning": "45 93% 47%",
      "--info": "205 78% 56%",
      "--glow-orange": "0 0% 75%",
      "--glow-blue": "205 78% 56%",
    },
  },
  {
    id: "white",
    name: "WHITE",
    label: "Clean Light",
    description: "أبيض نظيف مع أزرق هادئ — مظهر احترافي",
    colors: {
      "--background": "0 0% 98%",
      "--foreground": "220 20% 15%",
      "--card": "0 0% 100%",
      "--card-foreground": "220 20% 15%",
      "--popover": "0 0% 100%",
      "--popover-foreground": "220 20% 15%",
      "--primary": "220 80% 55%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "220 15% 93%",
      "--secondary-foreground": "220 20% 25%",
      "--muted": "220 15% 95%",
      "--muted-foreground": "220 10% 45%",
      "--accent": "220 75% 50%",
      "--accent-foreground": "0 0% 100%",
      "--destructive": "0 72% 51%",
      "--destructive-foreground": "0 0% 100%",
      "--border": "220 15% 88%",
      "--input": "220 15% 88%",
      "--ring": "220 80% 55%",
      "--sidebar-background": "0 0% 100%",
      "--sidebar-foreground": "220 20% 25%",
      "--sidebar-primary": "220 80% 55%",
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "220 15% 95%",
      "--sidebar-accent-foreground": "220 20% 25%",
      "--sidebar-border": "220 15% 90%",
      "--sidebar-ring": "220 80% 55%",
      "--success": "145 63% 42%",
      "--warning": "45 93% 47%",
      "--info": "205 78% 56%",
      "--glow-orange": "220 80% 55%",
      "--glow-blue": "205 78% 56%",
    },
  },
  {
    id: "normal",
    name: "NORMAL",
    label: "Balanced",
    description: "توازن بين الفاتح والداكن — مريح للعين",
    colors: {
      "--background": "220 15% 12%",
      "--foreground": "220 10% 90%",
      "--card": "220 15% 16%",
      "--card-foreground": "220 10% 90%",
      "--popover": "220 15% 16%",
      "--popover-foreground": "220 10% 90%",
      "--primary": "210 70% 55%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "220 15% 20%",
      "--secondary-foreground": "220 10% 85%",
      "--muted": "220 15% 18%",
      "--muted-foreground": "220 10% 55%",
      "--accent": "210 65% 50%",
      "--accent-foreground": "0 0% 100%",
      "--destructive": "0 72% 51%",
      "--destructive-foreground": "0 0% 100%",
      "--border": "220 15% 22%",
      "--input": "220 15% 22%",
      "--ring": "210 70% 55%",
      "--sidebar-background": "220 15% 10%",
      "--sidebar-foreground": "220 10% 85%",
      "--sidebar-primary": "210 70% 55%",
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "220 15% 18%",
      "--sidebar-accent-foreground": "220 10% 85%",
      "--sidebar-border": "220 15% 22%",
      "--sidebar-ring": "210 70% 55%",
      "--success": "145 63% 42%",
      "--warning": "45 93% 47%",
      "--info": "205 78% 56%",
      "--glow-orange": "210 70% 55%",
      "--glow-blue": "205 78% 56%",
    },
  },
  {
    id: "royal",
    name: "ROYAL",
    label: "Royal Purple",
    description: "بنفسجي ملكي مع ذهبي — فخامة استثنائية",
    colors: {
      "--background": "270 25% 5%",
      "--foreground": "40 30% 95%",
      "--card": "270 20% 12%",
      "--card-foreground": "40 30% 95%",
      "--popover": "270 20% 12%",
      "--popover-foreground": "40 30% 95%",
      "--primary": "45 90% 55%",
      "--primary-foreground": "270 25% 8%",
      "--secondary": "270 18% 18%",
      "--secondary-foreground": "40 20% 90%",
      "--muted": "270 15% 15%",
      "--muted-foreground": "270 10% 50%",
      "--accent": "45 85% 50%",
      "--accent-foreground": "270 25% 8%",
      "--destructive": "0 72% 51%",
      "--destructive-foreground": "0 0% 100%",
      "--border": "270 15% 20%",
      "--input": "270 15% 20%",
      "--ring": "45 90% 55%",
      "--sidebar-background": "270 22% 8%",
      "--sidebar-foreground": "40 20% 90%",
      "--sidebar-primary": "45 90% 55%",
      "--sidebar-primary-foreground": "270 25% 8%",
      "--sidebar-accent": "270 15% 16%",
      "--sidebar-accent-foreground": "40 20% 90%",
      "--sidebar-border": "270 15% 20%",
      "--sidebar-ring": "45 90% 55%",
      "--success": "145 63% 42%",
      "--warning": "45 93% 47%",
      "--info": "205 78% 56%",
      "--glow-orange": "45 90% 55%",
      "--glow-blue": "270 60% 60%",
    },
  },
  {
    id: "sunset",
    name: "SUNSET",
    label: "Warm Sunset",
    description: "غروب دافئ مع تدرجات البرتقالي والوردي",
    colors: {
      "--background": "15 20% 5%",
      "--foreground": "30 30% 95%",
      "--card": "15 18% 12%",
      "--card-foreground": "30 30% 95%",
      "--popover": "15 18% 12%",
      "--popover-foreground": "30 30% 95%",
      "--primary": "15 85% 55%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "15 15% 18%",
      "--secondary-foreground": "30 20% 90%",
      "--muted": "15 12% 15%",
      "--muted-foreground": "15 10% 50%",
      "--accent": "340 70% 55%",
      "--accent-foreground": "0 0% 100%",
      "--destructive": "0 72% 51%",
      "--destructive-foreground": "0 0% 100%",
      "--border": "15 15% 20%",
      "--input": "15 15% 20%",
      "--ring": "15 85% 55%",
      "--sidebar-background": "15 18% 8%",
      "--sidebar-foreground": "30 20% 90%",
      "--sidebar-primary": "15 85% 55%",
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "15 12% 16%",
      "--sidebar-accent-foreground": "30 20% 90%",
      "--sidebar-border": "15 15% 20%",
      "--sidebar-ring": "15 85% 55%",
      "--success": "145 63% 42%",
      "--warning": "45 93% 47%",
      "--info": "205 78% 56%",
      "--glow-orange": "15 85% 55%",
      "--glow-blue": "340 70% 55%",
    },
  },
];

const DB_KEY = "active_theme";

function applyThemeColors(colors: Record<string, string>) {
  const root = document.documentElement;
  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export function useTheme() {
  const [activeTheme, setActiveTheme] = useState<ThemeId>("edge");
  const [loading, setLoading] = useState(true);

  // Load from DB on mount
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", DB_KEY)
        .maybeSingle();
      const themeId = (data?.value as any)?.theme as ThemeId | undefined;
      if (themeId && THEMES.find(t => t.id === themeId)) {
        setActiveTheme(themeId);
        applyThemeColors(THEMES.find(t => t.id === themeId)!.colors);
      }
      setLoading(false);
    };
    load();
  }, []);

  // Real-time sync
  useEffect(() => {
    const channel = supabase
      .channel("theme-rt")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "app_settings",
        filter: `key=eq.${DB_KEY}`,
      }, (payload: any) => {
        const themeId = payload.new?.value?.theme as ThemeId | undefined;
        if (themeId && THEMES.find(t => t.id === themeId)) {
          setActiveTheme(themeId);
          applyThemeColors(THEMES.find(t => t.id === themeId)!.colors);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const setTheme = useCallback(async (themeId: ThemeId) => {
    const theme = THEMES.find(t => t.id === themeId);
    if (!theme) return;
    setActiveTheme(themeId);
    applyThemeColors(theme.colors);
    await supabase.from("app_settings").upsert(
      { key: DB_KEY, value: { theme: themeId } as any, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  }, []);

  return { activeTheme, setTheme, loading, themes: THEMES };
}
