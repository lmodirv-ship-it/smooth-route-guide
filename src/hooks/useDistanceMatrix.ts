import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculatePrice, formatPrice, formatDistance, PRICING_CONFIGS, type PricingConfig, type PriceEstimate } from '@/lib/pricing';

interface DistanceResult {
  distance: { text: string; meters: number; km: number; miles: number };
  duration: { text: string; seconds: number; minutes: number };
}

export function useDistanceMatrix(currencyCode: string = 'SAR') {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<PriceEstimate | null>(null);

  const config: PricingConfig = PRICING_CONFIGS[currencyCode] || PRICING_CONFIGS.SAR;

  const getEstimate = async (origin: string, destination: string) => {
    setLoading(true);
    setError(null);
    setEstimate(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('distance-matrix', {
        body: { origin, destination, units: config.unitSystem },
      });

      if (fnError) throw new Error(fnError.message);
      if (data.error) throw new Error(data.error);

      const result = data as DistanceResult;
      const pricing = calculatePrice(result.distance.meters, config);

      const est: PriceEstimate = {
        ...pricing,
        distanceText: formatDistance(result.distance.meters, config.unitSystem),
        durationText: `${result.duration.minutes} دقيقة`,
        currency: config.currency,
        currencySymbol: config.currencySymbol,
      };

      setEstimate(est);
      return est;
    } catch (err: any) {
      setError(err.message || 'حدث خطأ');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setEstimate(null);
    setError(null);
  };

  return { getEstimate, estimate, loading, error, reset, config };
}
