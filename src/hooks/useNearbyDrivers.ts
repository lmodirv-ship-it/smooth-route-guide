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
    const { data, error } = await supabase
      .from('drivers')
      .select('id, user_id, current_lat, current_lng, rating, status')
      .eq('status', 'active')
      .not('current_lat', 'is', null)
      .not('current_lng', 'is', null) as any;

    if (error || !data) return;

    const userIds = data.map((d: any) => d.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', userIds);

    const nameMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

    setDrivers(
      data
        .filter((d: any) => d.current_lat && d.current_lng)
        .map((d: any) => ({
          id: d.id,
          lat: Number(d.current_lat),
          lng: Number(d.current_lng),
          name: nameMap.get(d.user_id) || 'سائق',
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
