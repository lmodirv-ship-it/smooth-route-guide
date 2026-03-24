import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DeliveryPricingSettings {
  dayBaseFare: number;
  dayIncludedKm: number;
  dayExtraKmRate: number;
  nightBaseFare: number;
  nightIncludedKm: number;
  nightExtraKmRate: number;
  dayStartHour: number;   // e.g. 6
  dayEndHour: number;     // e.g. 22
  roundingMethod: "none" | "ceil" | "floor" | "round";
}

export const DELIVERY_PRICING_DEFAULTS: DeliveryPricingSettings = {
  dayBaseFare: 10,
  dayIncludedKm: 3,
  dayExtraKmRate: 3,
  nightBaseFare: 15,
  nightIncludedKm: 3,
  nightExtraKmRate: 5,
  dayStartHour: 6,
  dayEndHour: 22,
  roundingMethod: "round",
};

function isNight(settings: DeliveryPricingSettings): boolean {
  const hour = new Date().getHours();
  return hour < settings.dayStartHour || hour >= settings.dayEndHour;
}

function roundDistance(km: number, method: DeliveryPricingSettings["roundingMethod"]): number {
  switch (method) {
    case "ceil": return Math.ceil(km);
    case "floor": return Math.floor(km);
    case "round": return Math.round(km * 10) / 10;
    default: return km;
  }
}

/** Calculate delivery fee based on distance and current time */
export function calculateDeliveryFee(distanceKm: number, settings: DeliveryPricingSettings): number {
  const night = isNight(settings);
  const baseFare = night ? settings.nightBaseFare : settings.dayBaseFare;
  const includedKm = night ? settings.nightIncludedKm : settings.dayIncludedKm;
  const extraRate = night ? settings.nightExtraKmRate : settings.dayExtraKmRate;

  const rounded = roundDistance(distanceKm, settings.roundingMethod);
  const extraKm = Math.max(0, rounded - includedKm);
  return Math.round((baseFare + extraKm * extraRate) * 100) / 100;
}

export function useDeliveryPricingSettings() {
  const [settings, setSettings] = useState<DeliveryPricingSettings>(DELIVERY_PRICING_DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "delivery_pricing")
        .maybeSingle();

      if (!mounted) return;
      if (data?.value) {
        const v = data.value as Record<string, unknown>;
        setSettings({
          dayBaseFare: Number(v.dayBaseFare ?? DELIVERY_PRICING_DEFAULTS.dayBaseFare),
          dayIncludedKm: Number(v.dayIncludedKm ?? DELIVERY_PRICING_DEFAULTS.dayIncludedKm),
          dayExtraKmRate: Number(v.dayExtraKmRate ?? DELIVERY_PRICING_DEFAULTS.dayExtraKmRate),
          nightBaseFare: Number(v.nightBaseFare ?? DELIVERY_PRICING_DEFAULTS.nightBaseFare),
          nightIncludedKm: Number(v.nightIncludedKm ?? DELIVERY_PRICING_DEFAULTS.nightIncludedKm),
          nightExtraKmRate: Number(v.nightExtraKmRate ?? DELIVERY_PRICING_DEFAULTS.nightExtraKmRate),
          dayStartHour: Number(v.dayStartHour ?? DELIVERY_PRICING_DEFAULTS.dayStartHour),
          dayEndHour: Number(v.dayEndHour ?? DELIVERY_PRICING_DEFAULTS.dayEndHour),
          roundingMethod: (v.roundingMethod as DeliveryPricingSettings["roundingMethod"]) ?? DELIVERY_PRICING_DEFAULTS.roundingMethod,
        });
      }
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, []);

  return { ...settings, loading, calculateFee: (km: number) => calculateDeliveryFee(km, settings) };
}
