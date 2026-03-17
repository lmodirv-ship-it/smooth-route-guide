import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateTripPrice, DEFAULT_CURRENCY, CURRENCIES, type TripPriceEstimate } from '@/lib/pricing';

interface DistanceSegment {
  text: string;
  meters: number;
  km: number;
  durationText: string;
  durationMinutes: number;
}

export function useTripPricing(currencyCode: string = DEFAULT_CURRENCY) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<TripPriceEstimate | null>(null);

  const currency = CURRENCIES[currencyCode] || CURRENCIES[DEFAULT_CURRENCY];

  const getEstimate = useCallback(async (
    driverLocation: string,
    customerLocation: string,
    destination: string
  ) => {
    setLoading(true);
    setError(null);
    setEstimate(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('distance-matrix', {
        body: { driverLocation, customerLocation, destination, units: currency.unitSystem },
      });

      if (fnError) throw new Error(fnError.message);
      if (data.error) throw new Error(data.error);

      const d1 = data.d1 as DistanceSegment;
      const d2 = data.d2 as DistanceSegment;

      const pricing = calculateTripPrice(d1.meters, d2.meters, currencyCode);
      pricing.d1DurationMin = d1.durationMinutes;
      pricing.d2DurationMin = d2.durationMinutes;

      setEstimate(pricing);
      return pricing;
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في حساب التكلفة');
      return null;
    } finally {
      setLoading(false);
    }
  }, [currencyCode, currency.unitSystem]);

  const reset = useCallback(() => {
    setEstimate(null);
    setError(null);
  }, []);

  return { getEstimate, estimate, loading, error, reset, currency };
}
