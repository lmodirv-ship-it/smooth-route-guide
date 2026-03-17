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

interface DistanceMatrixResponse {
  success?: boolean;
  mode?: 'google' | 'fallback';
  warning?: string;
  error?: string;
  d1?: DistanceSegment;
  d2?: DistanceSegment;
}

const FALLBACK_ERROR_MESSAGE = 'تعذر حساب تكلفة الرحلة حالياً. حاول اختيار الوجهة من القائمة أو أعد المحاولة بعد قليل.';

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
      console.info('[trip-pricing] requesting_estimate', {
        driverLocation,
        customerLocation,
        destination,
        units: currency.unitSystem,
      });

      const { data, error: fnError } = await supabase.functions.invoke<DistanceMatrixResponse>('distance-matrix', {
        body: { driverLocation, customerLocation, destination, units: currency.unitSystem },
      });

      if (fnError) {
        console.error('[trip-pricing] edge_function_error', fnError);
        throw new Error(FALLBACK_ERROR_MESSAGE);
      }

      if (!data?.success || !data.d1 || !data.d2) {
        console.error('[trip-pricing] invalid_response', data);
        throw new Error(data?.error || FALLBACK_ERROR_MESSAGE);
      }

      if (data.warning) {
        console.warn('[trip-pricing] fallback_warning', data.warning);
      }

      const pricing = calculateTripPrice(data.d1.meters, data.d2.meters, currencyCode);
      pricing.d1DurationMin = data.d1.durationMinutes;
      pricing.d2DurationMin = data.d2.durationMinutes;

      console.info('[trip-pricing] estimate_ready', {
        mode: data.mode,
        totalPrice: pricing.totalPrice,
        totalDistanceKm: pricing.totalDistanceKm,
      });

      setEstimate(pricing);
      return pricing;
    } catch (err) {
      const message = err instanceof Error ? err.message : FALLBACK_ERROR_MESSAGE;
      setError(message);
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
