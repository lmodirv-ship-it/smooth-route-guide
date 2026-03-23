/* @refresh reset */
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  DriverCoordinates,
  DriverLocationWatchId,
  checkDriverLocationPermission,
  getDriverCurrentPosition,
  requestDriverLocationPermission,
  startDriverLocationWatch,
  stopDriverLocationWatch,
  isNativePlatform,
} from "@/lib/driverGeolocation";

/* ── Config ─────────────────────────────────────────────── */

/** Minimum interval (ms) between DB writes */
const DB_THROTTLE_MS = 4000;

/** If no update for this long (ms), consider location stale and auto-retry */
const STALE_TIMEOUT_MS = 30000;

/** Max auto-retry attempts before giving up */
const MAX_AUTO_RETRIES = 3;

/* ── Types ──────────────────────────────────────────────── */

interface DriverLocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

const isPermissionDeniedError = (error: GeolocationPositionError | Error) => {
  if ("code" in error && (error as GeolocationPositionError).code === 1) return true;
  return /denied|permission/i.test(error.message);
};

/* ── Hook ───────────────────────────────────────────────── */

export function useDriverGeolocation(isOnline: boolean) {
  const [location, setLocation] = useState<DriverLocation | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [requiresSettings, setRequiresSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationAge, setLocationAge] = useState<number | null>(null);

  const watchIdRef = useRef<DriverLocationWatchId | null>(null);
  const lastDbUpdateRef = useRef<number>(0);
  const lastLocationTimeRef = useRef<number>(0);
  const staleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRetryCountRef = useRef(0);
  const mountedRef = useRef(true);

  /* ── Cleanup helper ──────────────────────────────────── */

  const clearWatch = useCallback(async () => {
    await stopDriverLocationWatch(watchIdRef.current);
    watchIdRef.current = null;
  }, []);

  const clearStaleTimer = useCallback(() => {
    if (staleTimerRef.current) {
      clearInterval(staleTimerRef.current);
      staleTimerRef.current = null;
    }
  }, []);

  /* ── DB update (Supabase only) ───────────────────────── */

  const updateLocationInDb = useCallback(
    async (lat: number, lng: number) => {
      const now = Date.now();
      if (now - lastDbUpdateRef.current < DB_THROTTLE_MS) return;
      lastDbUpdateRef.current = now;

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
          .from("drivers")
          .update({
            current_lat: lat,
            current_lng: lng,
            location_updated_at: new Date().toISOString(),
            status: "active",
          })
          .eq("user_id", user.id);
      } catch (err) {
        console.warn("[Location] DB update failed:", err);
      }
    },
    []
  );

  /* ── Location success handler ────────────────────────── */

  const handleLocationSuccess = useCallback(
    (coords: DriverCoordinates) => {
      if (!mountedRef.current) return;

      lastLocationTimeRef.current = Date.now();
      autoRetryCountRef.current = 0; // reset retry counter on success

      setLocation({
        lat: coords.lat,
        lng: coords.lng,
        accuracy: coords.accuracy,
      });
      setLocationAge(0);
      setLoading(false);
      setPermissionDenied(false);
      setRequiresSettings(false);

      void updateLocationInDb(coords.lat, coords.lng);
    },
    [updateLocationInDb]
  );

  /* ── Location error handler ──────────────────────────── */

  const handleLocationError = useCallback(
    (error: GeolocationPositionError | Error) => {
      if (!mountedRef.current) return;
      setLoading(false);

      if (isPermissionDeniedError(error)) {
        setPermissionDenied(true);
        setRequiresSettings(isNativePlatform);
        return;
      }

      console.warn("[Location] Error:", error.message);

      // Auto-retry for transient errors
      if (autoRetryCountRef.current < MAX_AUTO_RETRIES) {
        autoRetryCountRef.current += 1;
        console.log(
          `[Location] Auto-retry ${autoRetryCountRef.current}/${MAX_AUTO_RETRIES}`
        );
        setTimeout(() => {
          if (mountedRef.current) void startWatchingInternal();
        }, 2000 * autoRetryCountRef.current);
        return;
      }

      toast({
        title: "تعذر تحديد الموقع",
        description: "تأكد من تشغيل GPS ثم اضغط إعادة المحاولة.",
        variant: "destructive",
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /* ── Start watching ──────────────────────────────────── */

  const startWatchingInternal = useCallback(async () => {
    if (!mountedRef.current) return;

    if (!navigator.geolocation && !isNativePlatform) {
      toast({
        title: "خطأ",
        description: "هذا الجهاز لا يدعم تحديد الموقع.",
        variant: "destructive",
      });
      return;
    }

    await clearWatch();
    setLoading(true);
    setPermissionDenied(false);
    setRequiresSettings(false);

    try {
      // Check existing permission on native
      if (isNativePlatform) {
        const existingState = await checkDriverLocationPermission();
        if (existingState === "denied") {
          setLoading(false);
          setPermissionDenied(true);
          setRequiresSettings(true);
          return;
        }

        const permState = await requestDriverLocationPermission();
        if (permState === "denied") {
          setLoading(false);
          setPermissionDenied(true);
          setRequiresSettings(true);
          return;
        }
        if (permState === "prompt-with-rationale") {
          setLoading(false);
          setPermissionDenied(true);
          return;
        }
      }

      // Get initial position
      const currentPos = await getDriverCurrentPosition();
      handleLocationSuccess(currentPos);

      // Start continuous watch
      watchIdRef.current = await startDriverLocationWatch(
        handleLocationSuccess,
        handleLocationError
      );
    } catch (error) {
      handleLocationError(
        error instanceof Error ? error : new Error("LOCATION_REQUEST_FAILED")
      );
    }
  }, [clearWatch, handleLocationError, handleLocationSuccess]);

  /* ── Stale detection timer ───────────────────────────── */

  const startStaleDetection = useCallback(() => {
    clearStaleTimer();

    staleTimerRef.current = setInterval(() => {
      if (!mountedRef.current) return;

      const elapsed = Date.now() - lastLocationTimeRef.current;
      setLocationAge(elapsed);

      // If location is stale and we haven't exceeded retries, restart watch
      if (
        elapsed > STALE_TIMEOUT_MS &&
        autoRetryCountRef.current < MAX_AUTO_RETRIES
      ) {
        console.warn("[Location] Stale location detected, restarting watch...");
        autoRetryCountRef.current += 1;
        void clearWatch().then(() => {
          if (mountedRef.current) void startWatchingInternal();
        });
      }
    }, 10000); // check every 10s
  }, [clearStaleTimer, clearWatch, startWatchingInternal]);

  /* ── Public retry ────────────────────────────────────── */

  const retryLocationAccess = useCallback(() => {
    autoRetryCountRef.current = 0;
    void startWatchingInternal();
  }, [startWatchingInternal]);

  /* ── Stop watching ───────────────────────────────────── */

  const stopWatching = useCallback(async () => {
    await clearWatch();
    clearStaleTimer();
    setLocation(null);
    setLoading(false);
    setPermissionDenied(false);
    setRequiresSettings(false);
    setLocationAge(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("drivers")
        .update({
          current_lat: null,
          current_lng: null,
          status: "inactive",
          location_updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    } catch {
      // silent fail
    }
  }, [clearWatch, clearStaleTimer]);

  /* ── Lifecycle ───────────────────────────────────────── */

  useEffect(() => {
    mountedRef.current = true;

    if (isOnline) {
      void startWatchingInternal();
      startStaleDetection();
    } else {
      void stopWatching();
    }

    return () => {
      mountedRef.current = false;
      void clearWatch();
      clearStaleTimer();
    };
  }, [isOnline, startWatchingInternal, stopWatching, startStaleDetection, clearWatch, clearStaleTimer]);

  /* ── App resume recovery (Capacitor) ─────────────────── */

  useEffect(() => {
    if (!isNativePlatform) return;

    const handleResume = () => {
      console.log("[Location] App resumed — refreshing location...");
      if (isOnline && mountedRef.current) {
        autoRetryCountRef.current = 0;
        void startWatchingInternal();
      }
    };

    // Capacitor App plugin for resume events
    let cleanup: (() => void) | undefined;

    import("@capacitor/app").then(({ App }) => {
      App.addListener("resume", handleResume).then((handle) => {
        cleanup = () => handle.remove();
      });
    }).catch(() => {
      // App plugin not available
    });

    return () => {
      cleanup?.();
    };
  }, [isOnline, startWatchingInternal]);

  return {
    location,
    permissionDenied,
    requiresSettings,
    loading,
    locationAge,
    retryLocationAccess,
  };
}
