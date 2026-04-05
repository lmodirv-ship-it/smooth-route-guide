import { supabase } from "@/integrations/supabase/client";

let cachedServers: RTCIceServer[] | null = null;
let cacheExpiry = 0;

/** Fetch TURN credentials from Twilio via edge function, cached for 1 hour */
export async function fetchTurnServers(): Promise<RTCIceServer[]> {
  if (cachedServers && Date.now() < cacheExpiry) return cachedServers;

  try {
    const { data, error } = await supabase.functions.invoke("twilio-turn", { method: "POST" });
    if (error || !data?.ice_servers?.length) {
      console.warn("[TURN] Failed to fetch, using fallback STUN", error);
      return fallbackServers();
    }

    cachedServers = data.ice_servers.map((s: any) => ({
      urls: s.urls || s.url,
      ...(s.username ? { username: s.username, credential: s.credential } : {}),
    }));
    cacheExpiry = Date.now() + 3600_000; // 1 hour
    console.log("[TURN] Got", cachedServers!.length, "ICE servers from Twilio");
    return cachedServers!;
  } catch (e) {
    console.warn("[TURN] Exception, using fallback", e);
    return fallbackServers();
  }
}

function fallbackServers(): RTCIceServer[] {
  return [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ];
}
