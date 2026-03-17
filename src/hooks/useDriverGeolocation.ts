import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/firestoreClient';
import { toast } from '@/hooks/use-toast';

interface DriverLocation {
  lat: number;
  lng: number;
}

export function useDriverGeolocation(isOnline: boolean) {
  const [location, setLocation] = useState<DriverLocation | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loading, setLoading] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastDbUpdateRef = useRef<number>(0);

  const updateLocationInDb = useCallback(async (lat: number, lng: number) => {
    // Throttle DB updates to every 10 seconds
    const now = Date.now();
    if (now - lastDbUpdateRef.current < 10000) return;
    lastDbUpdateRef.current = now;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('drivers')
        .update({
          current_lat: lat,
          current_lng: lng,
          location_updated_at: new Date().toISOString(),
        } as any)
        .eq('user_id', user.id);
    } catch (err) {
      // Silent fail for DB updates
    }
  }, []);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: 'خطأ',
        description: 'المتصفح لا يدعم تحديد الموقع',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setPermissionDenied(false);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setLocation(newLocation);
        setLoading(false);
        updateLocationInDb(newLocation.lat, newLocation.lng);
      },
      (error) => {
        setLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setPermissionDenied(true);
          toast({
            title: 'إذن الموقع مطلوب',
            description: 'يجب تفعيل إذن الموقع ليظهر مكان السائق على الخريطة',
            variant: 'destructive',
          });
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );
  }, [updateLocationInDb]);

  const stopWatching = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setLocation(null);

    // Clear location in DB
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('drivers')
          .update({
            current_lat: null,
            current_lng: null,
            location_updated_at: null,
          } as any)
          .eq('user_id', user.id);
      }
    } catch (err) { /* silent */ }
  }, []);

  useEffect(() => {
    if (isOnline) {
      startWatching();
    } else {
      stopWatching();
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isOnline, startWatching, stopWatching]);

  return { location, permissionDenied, loading };
}
