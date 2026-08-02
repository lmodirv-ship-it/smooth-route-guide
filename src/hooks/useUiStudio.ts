import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UiScope = "customer" | "driver" | "delivery" | "store" | "callcenter";

export interface UiStudioOptions {
  showTopBar: boolean;
  showQuickCards: boolean;
  showOptionsBar: boolean;
  showFareCard: boolean;
  showSafetyStrip: boolean;
  showBottomNav: boolean;
  mapHeight: number;
  radius: number;
  density: "compact" | "comfortable" | "spacious";
  glow: number;
}

export interface UiStudioSetting {
  scope: UiScope;
  layout: string;
  options: UiStudioOptions;
  isActive: boolean;
}

export const DEFAULT_UI_OPTIONS: UiStudioOptions = {
  showTopBar: true,
  showQuickCards: true,
  showOptionsBar: true,
  showFareCard: true,
  showSafetyStrip: true,
  showBottomNav: true,
  mapHeight: 320,
  radius: 18,
  density: "comfortable",
  glow: 40,
};

function normalize(row: any, scope: UiScope): UiStudioSetting {
  return {
    scope,
    layout: row?.layout || "classic",
    options: { ...DEFAULT_UI_OPTIONS, ...(row?.options || {}) },
    isActive: row?.is_active !== false,
  };
}

/** Reads the UI Studio configuration for a given interface scope, live-updating via Realtime. */
export function useUiStudio(scope: UiScope) {
  const [setting, setSetting] = useState<UiStudioSetting>(() => normalize(null, scope));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      const { data } = await supabase
        .from("ui_studio_settings")
        .select("layout, options, is_active")
        .eq("scope", scope)
        .maybeSingle();
      if (!alive) return;
      setSetting(normalize(data, scope));
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel(`ui_studio_${scope}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ui_studio_settings", filter: `scope=eq.${scope}` },
        () => load()
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [scope]);

  return { ...setting, loading };
}

export const DENSITY_GAP: Record<UiStudioOptions["density"], string> = {
  compact: "0.5rem",
  comfortable: "0.75rem",
  spacious: "1.15rem",
};
