/**
 * Centralized API Key Fetcher
 * ───────────────────────────
 * Reads keys from Deno.env first, then falls back to app_settings table.
 * All edge functions should use this instead of duplicating fallback logic.
 */

let cachedSettings: Record<string, string> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function loadAppSettingsKeys(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedSettings && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedSettings;
  }

  try {
    const sbUrl = Deno.env.get("SUPABASE_URL") || "";
    const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    if (!sbUrl || !sbKey) return {};

    const res = await fetch(`${sbUrl}/rest/v1/app_settings?key=eq.api_keys&select=value`, {
      headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
    });
    if (!res.ok) return {};
    const rows = await res.json();
    const stored = rows?.[0]?.value || {};
    cachedSettings = stored as Record<string, string>;
    cacheTimestamp = now;
    return cachedSettings;
  } catch {
    return {};
  }
}

/**
 * Get a specific API key by checking env vars first, then app_settings fallback.
 * @param envNames - list of env var names to check (in order)
 * @param settingsKeys - list of app_settings keys to check as fallback (in order)
 */
export async function getApiKey(
  envNames: string[],
  settingsKeys: string[],
): Promise<string | null> {
  // 1. Check environment variables first
  for (const envName of envNames) {
    const val = Deno.env.get(envName);
    if (val && val.trim() !== "") return val.trim();
  }

  // 2. Fallback to app_settings
  const settings = await loadAppSettingsKeys();
  for (const key of settingsKeys) {
    const val = settings[key];
    if (val && String(val).trim() !== "") return String(val).trim();
  }

  return null;
}

// ─── Pre-built helpers for common services ───

export async function getGoogleMapsKey(): Promise<string | null> {
  return getApiKey(
    ["GOOGLE_MAPS_API_KEY"],
    ["google_maps_api_key", "google_directions_api_key", "google_geocoding_api_key"],
  );
}

export async function getGoogleTranslateKey(): Promise<string | null> {
  return getApiKey(
    ["GOOGLE_MAPS_API_KEY"],
    ["google_translate_api_key", "google_maps_api_key"],
  );
}

export async function getGooglePlacesKey(): Promise<string | null> {
  return getApiKey(
    ["GOOGLE_MAPS_API_KEY"],
    ["google_places_api_key", "google_maps_api_key"],
  );
}

export async function getStripeSecretKey(): Promise<string | null> {
  return getApiKey(
    ["STRIPE_SECRET_KEY"],
    ["stripe_secret_key"],
  );
}

export async function getMailBlusterKey(): Promise<string | null> {
  return getApiKey(
    ["MAILBLUSTER_API_KEY"],
    ["mailbluster_api_key"],
  );
}

export async function getPayPalCredentials(): Promise<{ clientId: string; secret: string; env: string } | null> {
  const settings = await loadAppSettingsKeys();
  
  // Also check paypal_settings in app_settings
  let ppClientId = Deno.env.get("PAYPAL_CLIENT_ID_LIVE") || Deno.env.get("PAYPAL_CLIENT_ID") || "";
  let ppSecret = Deno.env.get("PAYPAL_SECRET_LIVE") || Deno.env.get("PAYPAL_SECRET_KEY") || "";
  let ppEnv = Deno.env.get("PAYPAL_ENV") || "sandbox";

  if (!ppClientId) ppClientId = settings["paypal_client_id"] || "";
  if (!ppSecret) ppSecret = settings["paypal_secret_key"] || "";

  if (!ppClientId || !ppSecret) return null;
  return { clientId: ppClientId, secret: ppSecret, env: ppEnv };
}
