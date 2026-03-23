import { useState, useEffect } from "react";

const cache = new Map<string, string>();

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (cache.has(key)) return cache.get(key)!;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ar&zoom=18&addressdetails=1`,
      { headers: { "User-Agent": "HN-Driver-App/1.0" } }
    );
    if (!res.ok) throw new Error("Geocode failed");
    const data = await res.json();

    const addr = data.address || {};
    // Build a readable name from address parts
    const parts = [
      addr.road || addr.pedestrian || addr.neighbourhood,
      addr.suburb || addr.quarter,
      addr.city || addr.town || addr.village,
    ].filter(Boolean);

    const name = parts.length > 0 ? parts.join("، ") : (data.display_name?.split(",").slice(0, 3).join("،") || key);
    cache.set(key, name);
    return name;
  } catch {
    return key;
  }
}

export function useReverseGeocode(coords: { lat: number; lng: number } | null) {
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!coords) { setName(null); return; }
    setLoading(true);
    reverseGeocode(coords.lat, coords.lng)
      .then(setName)
      .finally(() => setLoading(false));
  }, [coords?.lat, coords?.lng]);

  return { name, loading };
}
