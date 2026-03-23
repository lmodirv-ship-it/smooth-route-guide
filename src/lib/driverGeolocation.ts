/**
 * Unified Driver Geolocation Service
 * Works identically on Web (browser), APK (Android) and AAB (iOS) via Capacitor.
 * All platform differences are abstracted here — consumers get a single API.
 */
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

/* ── Types ─────────────────────────────────────────────── */

export interface DriverCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number | null;
  heading?: number | null;
  timestamp?: number;
}

export type DriverLocationWatchId = number | string;

export type DriverLocationPermissionState =
  | "granted"
  | "denied"
  | "prompt"
  | "prompt-with-rationale"
  | null;

/* ── Platform detection ────────────────────────────────── */

export const isNativePlatform = Capacitor.isNativePlatform();
export const currentPlatform = Capacitor.getPlatform(); // 'web' | 'android' | 'ios'

/* ── Options per platform ──────────────────────────────── */

const HIGH_ACCURACY_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 3000,
};

const FALLBACK_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 15000,
  maximumAge: 10000,
};

/* ── Accuracy filter ───────────────────────────────────── */

/** Max acceptable accuracy in meters — reject readings worse than this */
const MAX_ACCURACY_METERS = 150;

/** Min distance (meters) between updates to reduce noise */
const MIN_DISTANCE_METERS = 5;

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/* ── Permission helpers ────────────────────────────────── */

export const checkDriverLocationPermission =
  async (): Promise<DriverLocationPermissionState> => {
    if (!isNativePlatform) {
      // Browser Permissions API
      try {
        const result = await navigator.permissions.query({ name: "geolocation" });
        return result.state as DriverLocationPermissionState;
      } catch {
        return null; // browser doesn't support permissions API
      }
    }

    const permissions = await Geolocation.checkPermissions();
    return permissions.location as DriverLocationPermissionState;
  };

export const requestDriverLocationPermission =
  async (): Promise<DriverLocationPermissionState> => {
    if (!isNativePlatform) {
      // On web, requesting permission is done via getCurrentPosition
      return null;
    }

    const permissions = await Geolocation.requestPermissions();
    return permissions.location as DriverLocationPermissionState;
  };

/* ── Get current position (with fallback) ──────────────── */

export const getDriverCurrentPosition =
  async (): Promise<DriverCoordinates> => {
    if (isNativePlatform) {
      try {
        const position = await Geolocation.getCurrentPosition(HIGH_ACCURACY_OPTIONS);
        return mapPosition(position);
      } catch {
        // Fallback to lower accuracy
        const position = await Geolocation.getCurrentPosition(FALLBACK_OPTIONS);
        return mapPosition(position);
      }
    }

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("GEOLOCATION_NOT_SUPPORTED"));
        return;
      }

      // Try high accuracy first
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(mapBrowserPosition(pos)),
        () => {
          // Fallback to lower accuracy
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(mapBrowserPosition(pos)),
            reject,
            FALLBACK_OPTIONS
          );
        },
        HIGH_ACCURACY_OPTIONS
      );
    });
  };

/* ── Watch position (with accuracy filtering & noise reduction) ── */

export const startDriverLocationWatch = async (
  onSuccess: (coords: DriverCoordinates) => void,
  onError: (error: GeolocationPositionError | Error) => void
): Promise<DriverLocationWatchId> => {
  let lastEmitted: DriverCoordinates | null = null;

  const filteredSuccess = (coords: DriverCoordinates) => {
    // Filter out very inaccurate readings
    if (coords.accuracy && coords.accuracy > MAX_ACCURACY_METERS) {
      console.log(
        `[Location] Rejected: accuracy ${coords.accuracy?.toFixed(0)}m > ${MAX_ACCURACY_METERS}m`
      );
      return;
    }

    // Filter out tiny movements (GPS jitter)
    if (lastEmitted) {
      const dist = haversineMeters(lastEmitted, coords);
      if (dist < MIN_DISTANCE_METERS && coords.accuracy && coords.accuracy > 20) {
        return; // skip jittery update
      }
    }

    lastEmitted = coords;
    onSuccess(coords);
  };

  if (isNativePlatform) {
    return Geolocation.watchPosition(HIGH_ACCURACY_OPTIONS, (position, error) => {
      if (error) {
        onError(error);
        return;
      }
      if (!position) return;
      filteredSuccess(mapPosition(position));
    });
  }

  if (!navigator.geolocation) {
    throw new Error("GEOLOCATION_NOT_SUPPORTED");
  }

  return navigator.geolocation.watchPosition(
    (position) => filteredSuccess(mapBrowserPosition(position)),
    onError,
    HIGH_ACCURACY_OPTIONS
  );
};

/* ── Stop watching ─────────────────────────────────────── */

export const stopDriverLocationWatch = async (
  watchId: DriverLocationWatchId | null
) => {
  if (watchId === null) return;

  if (isNativePlatform) {
    await Geolocation.clearWatch({ id: String(watchId) });
    return;
  }

  navigator.geolocation.clearWatch(watchId as number);
};

/* ── Internal mappers ──────────────────────────────────── */

function mapPosition(position: any): DriverCoordinates {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy ?? undefined,
    speed: position.coords.speed ?? null,
    heading: position.coords.heading ?? null,
    timestamp: position.timestamp ?? Date.now(),
  };
}

function mapBrowserPosition(position: GeolocationPosition): DriverCoordinates {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy,
    speed: position.coords.speed,
    heading: position.coords.heading,
    timestamp: position.timestamp,
  };
}
