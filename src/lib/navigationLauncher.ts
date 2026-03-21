import { Capacitor } from "@capacitor/core";
import { toast } from "@/hooks/use-toast";

export type NavApp = "waze" | "google_maps" | "here_wego" | "browser";

interface NavTarget {
  lat: number;
  lng: number;
  label?: string;
}

const NAV_APPS: { id: NavApp; name: string; getUrl: (t: NavTarget) => string; deepLink?: (t: NavTarget) => string }[] = [
  {
    id: "waze",
    name: "Waze",
    getUrl: (t) => `https://waze.com/ul?ll=${t.lat},${t.lng}&navigate=yes`,
    deepLink: (t) => `waze://?ll=${t.lat},${t.lng}&navigate=yes`,
  },
  {
    id: "google_maps",
    name: "Google Maps",
    getUrl: (t) => `https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lng}`,
    deepLink: (t) => `google.navigation:q=${t.lat},${t.lng}`,
  },
  {
    id: "here_wego",
    name: "HERE WeGo",
    getUrl: (t) => `https://share.here.com/r/${t.lat},${t.lng}${t.label ? `?title=${encodeURIComponent(t.label)}` : ""}`,
    deepLink: (t) => `here-route://${t.lat},${t.lng}${t.label ? `?title=${encodeURIComponent(t.label)}` : ""}`,
  },
  {
    id: "browser",
    name: "OpenStreetMap",
    getUrl: (t) => `https://www.openstreetmap.org/directions?mlat=${t.lat}&mlon=${t.lng}#map=16/${t.lat}/${t.lng}`,
  },
];

const isNative = Capacitor.isNativePlatform();

/**
 * Try to open a deep link (native) or URL. Returns true if it seemed to work.
 * On native Android, we use the deep link scheme; on web we fall through to https URL.
 */
const tryOpen = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    // Track if we stay in-app (means the external app didn't open)
    let didLeave = false;

    const onBlur = () => { didLeave = true; };
    window.addEventListener("blur", onBlur);

    // Open the URL
    const w = window.open(url, "_system");

    // Give it a moment to see if the app opened
    setTimeout(() => {
      window.removeEventListener("blur", onBlur);

      // If window.open returned null AND we didn't blur → likely failed
      if (!w && !didLeave) {
        resolve(false);
      } else {
        resolve(true);
      }
    }, 1500);
  });
};

/**
 * Launch navigation to the given coordinates with automatic fallback:
 * Waze → Google Maps → HERE WeGo → Browser (OSM)
 */
export const launchNavigation = async (target: NavTarget): Promise<void> => {
  for (const app of NAV_APPS) {
    const url = isNative && app.deepLink ? app.deepLink(target) : app.getUrl(target);

    try {
      const opened = await tryOpen(url);
      if (opened) return; // Success — stop trying
    } catch {
      // This app failed, try next
    }
  }

  // All failed
  toast({
    title: "تعذر فتح تطبيقات الملاحة",
    description: "يرجى تثبيت تطبيق خرائط مثل Waze أو Google Maps.",
    variant: "destructive",
  });
};

/**
 * Launch a specific navigation app directly (for manual selection).
 */
export const launchSpecificNavApp = (appId: NavApp, target: NavTarget): void => {
  const app = NAV_APPS.find((a) => a.id === appId);
  if (!app) return;

  const url = isNative && app.deepLink ? app.deepLink(target) : app.getUrl(target);
  window.open(url, "_system");
};

export { NAV_APPS };
