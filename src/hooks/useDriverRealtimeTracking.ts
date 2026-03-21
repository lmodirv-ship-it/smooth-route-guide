import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DriverPosition {
  lat: number;
  lng: number;
  updatedAt: string | null;
}

/**
 * Subscribe to a specific driver's real-time location updates.
 * Uses Supabase Realtime (postgres_changes) on the drivers table.
 */
export function useDriverRealtimeTracking(driverId: string | null | undefined) {
  const [position, setPosition] = useState<DriverPosition | null>(null);
  const [loading, setLoading] = useState(!!driverId);
  const prevId = useRef(driverId);

  // Reset when driver changes
  useEffect(() => {
    if (driverId !== prevId.current) {
      setPosition(null);
      setLoading(!!driverId);
      prevId.current = driverId;
    }
  }, [driverId]);

  useEffect(() => {
    if (!driverId) {
      setPosition(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    // Initial fetch
    const fetchInitial = async () => {
      const { data } = await supabase
        .from('drivers')
        .select('current_lat, current_lng, location_updated_at')
        .eq('id', driverId)
        .single();

      if (!cancelled && data?.current_lat && data?.current_lng) {
        setPosition({
          lat: Number(data.current_lat),
          lng: Number(data.current_lng),
          updatedAt: data.location_updated_at,
        });
      }
      if (!cancelled) setLoading(false);
    };

    void fetchInitial();

    // Real-time subscription
    const channel = supabase
      .channel(`driver-track-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'drivers',
          filter: `id=eq.${driverId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (row.current_lat != null && row.current_lng != null) {
            setPosition({
              lat: Number(row.current_lat),
              lng: Number(row.current_lng),
              updatedAt: row.location_updated_at ?? null,
            });
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  return { position, loading };
}
