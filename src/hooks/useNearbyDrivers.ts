import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NearbyDriver {
  id: string;
  lat: number;
  lng: number;
  name: string;
  rating: number | null;
  onlineSince: string | null;
}

export function useNearbyDrivers() {
  const [drivers, setDrivers] = useState<NearbyDriver[]>([]);

  const fetchDrivers = async () => {
    const { data, error } = await supabase
      .from('active_drivers_public')
      .select('id, car_id, current_lat, current_lng, rating, online_since')
      .not('current_lat', 'is', null)
      .not('current_lng', 'is', null) as any;

    if (error || !data) return;

    setDrivers(
      data
        .filter((d: any) => d.current_lat && d.current_lng)
        .map((d: any) => ({
          id: d.id,
          lat: Number(d.current_lat),
          lng: Number(d.current_lng),
          name: 'سائق',
          rating: d.rating,
          onlineSince: d.online_since ?? null,
        }))
    );
  };

  useEffect(() => {
    fetchDrivers();

    // Refresh every 5 minutes (realtime handles live updates)
    const interval = setInterval(fetchDrivers, 5 * 60 * 1000);

    // Realtime updates
    const channel = supabase
      .channel('nearby-drivers')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'drivers' },
        () => fetchDrivers()
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  return { drivers, refresh: fetchDrivers };
}
