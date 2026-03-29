import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Updates `last_seen_at` on the current user's profile every 2 minutes.
 * This powers the online/offline indicator on Reference badges.
 */
export const usePresenceHeartbeat = () => {
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const beat = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() } as any)
        .eq("id", user.id);
    };

    // Initial beat + interval
    beat();
    interval = setInterval(beat, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);
};
