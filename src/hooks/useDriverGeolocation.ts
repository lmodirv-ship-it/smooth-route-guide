import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { syncDriverOrderMetrics } from '@/lib/orderService';

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

  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const updateLocationInDb = useCallback(async (lat: number, lng: number) => {
    const user = auth.currentUser;
    if (!user) return;

    const now = Date.now();
    if (now - lastDbUpdateRef.current < 10000) return;
    lastDbUpdateRef.current = now;

    try {
      await setDoc(doc(db, 'drivers', user.uid), {
        uid: user.uid,
        currentLat: lat,
        currentLng: lng,
        current_lat: lat,
        current_lng: lng,
        isOnline: true,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      await syncDriverOrderMetrics(user.uid, lat, lng);
    } catch {
      // silent fail
    }
  }, []);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      toast({ title: 'خطأ', description: 'هذا الجهاز لا يدعم تحديد الموقع.', variant: 'destructive' });
      return;
    }

    clearWatch();
    setLoading(true);
    setPermissionDenied(false);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        setLocation(newLocation);
        setLoading(false);
        setPermissionDenied(false);
        updateLocationInDb(newLocation.lat, newLocation.lng);
      },
      (error) => {
        setLoading(false);

        if (error.code === error.PERMISSION_DENIED) {
          setPermissionDenied(true);
          return;
        }

        toast({
          title: 'تعذر تحديد الموقع',
          description: 'تأكد من تشغيل GPS ثم اضغط إعادة المحاولة.',
          variant: 'destructive',
        });
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  }, [clearWatch, updateLocationInDb]);

  const retryLocationAccess = useCallback(() => {
    startWatching();
  }, [startWatching]);

  const stopWatching = useCallback(async () => {
    clearWatch();
    setLocation(null);
    setLoading(false);
    setPermissionDenied(false);

    const user = auth.currentUser;
    if (!user) return;

    try {
      await setDoc(doc(db, 'drivers', user.uid), {
        currentLat: null,
        currentLng: null,
        current_lat: null,
        current_lng: null,
        isOnline: false,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch {
      // silent fail
    }
  }, [clearWatch]);

  useEffect(() => {
    if (isOnline) startWatching();
    else stopWatching();

    return () => {
      clearWatch();
    };
  }, [clearWatch, isOnline, startWatching, stopWatching]);

  return { location, permissionDenied, loading, retryLocationAccess };
}

