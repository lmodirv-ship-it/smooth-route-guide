import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NearbyDriver {
  id: string;
  lat: number;
  lng: number;
  name: string;
  rating: number | null;
}

export function useNearbyDrivers() {
  const [drivers, setDrivers] = useState<NearbyDriver[]>([]);

  const fetchDrivers = async () => {
    // Get active drivers with location
    // Use the secure public view instead of the drivers table directly
    const { data, error } = await supabase
      .from('active_drivers_public')
      .select('id, car_id, current_lat, current_lng, rating')
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
        }))
    );
  };

  useEffect(() => {
    fetchDrivers();

    // Refresh every 15 seconds
    const interval = setInterval(fetchDrivers, 15000);

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
