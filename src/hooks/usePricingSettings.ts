import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PricingSettings {
  baseFare: number;
  perKmRate: number;
  perMinRate: number;
  minFare: number;
}

const DEFAULTS: PricingSettings = {
  baseFare: 0,
  perKmRate: 3,
  perMinRate: 0.5,
  minFare: 3,
};

/**
 * Reads pricing settings from `app_settings` table (key = "pricing").
 * Falls back to hardcoded defaults if DB is unreachable.
 */
export function usePricingSettings() {
  const [settings, setSettings] = useState<PricingSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "pricing")
        .maybeSingle();

      if (!mounted) return;

      if (data?.value) {
        const v = data.value as Record<string, unknown>;
        setSettings({
          baseFare: Number(v.baseFare ?? DEFAULTS.baseFare),
          perKmRate: Number(v.perKmRate ?? DEFAULTS.perKmRate),
          perMinRate: Number(v.perMinRate ?? DEFAULTS.perMinRate),
          minFare: Number(v.minFare ?? DEFAULTS.minFare),
        });
      }
      setLoading(false);
    };

    load();
    return () => { mounted = false; };
  }, []);

  return { ...settings, loading };
}
