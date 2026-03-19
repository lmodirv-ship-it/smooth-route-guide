import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

export interface DriverCoordinates {
  lat: number;
  lng: number;
}

export type DriverLocationWatchId = number | string;

const nativeOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 5000,
};

const browserOptions: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 5000,
};

export const isNativePlatform = Capacitor.isNativePlatform();

export const requestDriverLocationPermission = async () => {
  if (!isNativePlatform) return null;

  const permissions = await Geolocation.requestPermissions();
  return permissions.location;
};

export const getDriverCurrentPosition = async (): Promise<DriverCoordinates> => {
  if (isNativePlatform) {
    const position = await Geolocation.getCurrentPosition(nativeOptions);

    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      reject,
      browserOptions,
    );
  });
};

export const startDriverLocationWatch = async (
  onSuccess: (coords: DriverCoordinates) => void,
  onError: (error: GeolocationPositionError | Error) => void,
): Promise<DriverLocationWatchId> => {
  if (isNativePlatform) {
    return Geolocation.watchPosition(nativeOptions, (position, error) => {
      if (error) {
        onError(error);
        return;
      }

      if (!position) return;

      onSuccess({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    });
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      onSuccess({ lat: position.coords.latitude, lng: position.coords.longitude });
    },
    onError,
    browserOptions,
  );
};

export const stopDriverLocationWatch = async (watchId: DriverLocationWatchId | null) => {
  if (watchId === null) return;

  if (isNativePlatform) {
    await Geolocation.clearWatch({ id: String(watchId) });
    return;
  }

  navigator.geolocation.clearWatch(watchId as number);
};
