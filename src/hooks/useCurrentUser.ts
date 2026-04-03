import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Provides the current user ID.
 * Uses getSession() instead of getUser() to avoid extra auth lock contention.
 */
export function useCurrentUser() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Use getSession (cached, no network call) instead of getUser (network call)
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.session?.user?.id || null);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUserId(session?.user?.id || null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return { userId, loading };
}
