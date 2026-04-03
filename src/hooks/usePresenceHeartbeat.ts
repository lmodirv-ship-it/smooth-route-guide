import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Updates `last_seen_at` on the current user's profile every 2 minutes.
 * IMPORTANT: Delays first beat by 20s to avoid auth lock contention on startup.
 */
export const usePresenceHeartbeat = () => {
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let startDelay: ReturnType<typeof setTimeout>;

    const beat = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        await supabase
          .from("profiles")
          .update({ last_seen_at: new Date().toISOString() } as any)
          .eq("id", session.user.id);
      } catch {
        // silently ignore — heartbeat is best-effort
      }
    };

    // Delay first beat to let auth settle and avoid lock contention
    startDelay = setTimeout(() => {
      beat();
      interval = setInterval(beat, 2 * 60 * 1000);
    }, 20_000);

    return () => {
      clearTimeout(startDelay);
      clearInterval(interval);
    };
  }, []);
};
