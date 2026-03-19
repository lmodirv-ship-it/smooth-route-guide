/* @refresh reset */
import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { syncDriverOrderMetrics } from '@/lib/orderService';
import {
  DriverCoordinates,
  DriverLocationWatchId,
  checkDriverLocationPermission,
  getDriverCurrentPosition,
  requestDriverLocationPermission,
  startDriverLocationWatch,
  stopDriverLocationWatch,
} from '@/lib/driverGeolocation';

interface DriverLocation {
  lat: number;
  lng: number;
}

const isPermissionDeniedError = (error: GeolocationPositionError | Error) => {
  if ('code' in error && error.code === 1) return true;
  return /denied|permission/i.test(error.message);
};

export function useDriverGeolocation(isOnline: boolean) {
  const [location, setLocation] = useState<DriverLocation | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [requiresSettings, setRequiresSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const watchIdRef = useRef<DriverLocationWatchId | null>(null);
  const lastDbUpdateRef = useRef<number>(0);

  const clearWatch = useCallback(async () => {
    await stopDriverLocationWatch(watchIdRef.current);
    watchIdRef.current = null;
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

  const handleLocationSuccess = useCallback((coords: DriverCoordinates) => {
    setLocation(coords);
    setLoading(false);
    setPermissionDenied(false);
    setRequiresSettings(false);
    void updateLocationInDb(coords.lat, coords.lng);
  }, [updateLocationInDb]);

  const handleLocationError = useCallback((error: GeolocationPositionError | Error) => {
    setLoading(false);

    if (isPermissionDeniedError(error)) {
      setPermissionDenied(true);
      return;
    }

    toast({
      title: 'تعذر تحديد الموقع',
      description: 'تأكد من تشغيل GPS ثم اضغط إعادة المحاولة.',
      variant: 'destructive',
    });
  }, []);

  const startWatching = useCallback(async () => {
    if (!navigator.geolocation) {
      toast({ title: 'خطأ', description: 'هذا الجهاز لا يدعم تحديد الموقع.', variant: 'destructive' });
      return;
    }

    await clearWatch();
    setLoading(true);
    setPermissionDenied(false);
    setRequiresSettings(false);

    try {
      const existingPermissionState = await checkDriverLocationPermission();
      if (existingPermissionState === 'denied') {
        setLoading(false);
        setPermissionDenied(true);
        setRequiresSettings(true);
        return;
      }

      const permissionState = await requestDriverLocationPermission();
      if (permissionState === 'denied') {
        setLoading(false);
        setPermissionDenied(true);
        setRequiresSettings(true);
        return;
      }

      if (permissionState === 'prompt-with-rationale') {
        setLoading(false);
        setPermissionDenied(true);
        return;
      }

      const currentPosition = await getDriverCurrentPosition();
      handleLocationSuccess(currentPosition);
      watchIdRef.current = await startDriverLocationWatch(handleLocationSuccess, handleLocationError);
    } catch (error) {
      handleLocationError(error instanceof Error ? error : new Error('LOCATION_REQUEST_FAILED'));
    }
  }, [clearWatch, handleLocationError, handleLocationSuccess]);

  const retryLocationAccess = useCallback(() => {
    void startWatching();
  }, [startWatching]);

  const stopWatching = useCallback(async () => {
    await clearWatch();
    setLocation(null);
    setLoading(false);
    setPermissionDenied(false);
    setRequiresSettings(false);

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
    if (isOnline) {
      void startWatching();
    } else {
      void stopWatching();
    }

    return () => {
      void clearWatch();
    };
  }, [clearWatch, isOnline, startWatching, stopWatching]);

  return { location, permissionDenied, requiresSettings, loading, retryLocationAccess };
}

