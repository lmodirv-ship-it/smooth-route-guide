import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tracks agent login/logout sessions in the agent_sessions table.
 * Creates a session on mount and updates logout_at on unmount / tab close.
 */
export function useAgentSession() {
  const sessionId = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const startSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      // Get agent code from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_code")
        .eq("id", user.id)
        .single();

      const { data, error } = await supabase
        .from("agent_sessions")
        .insert({
          user_id: user.id,
          agent_code: profile?.user_code || "",
          status: "online",
          user_agent: navigator.userAgent,
        })
        .select("id")
        .single();

      if (!error && data) {
        sessionId.current = data.id;
      }
    };

    startSession();

    const endSession = () => {
      if (!sessionId.current) return;
      // Use sendBeacon for reliable logout tracking
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/agent_sessions?id=eq.${sessionId.current}`;
      const body = JSON.stringify({ logout_at: new Date().toISOString(), status: "offline" });
      navigator.sendBeacon(
        url,
        new Blob([body], { type: "application/json" })
      );
    };

    window.addEventListener("beforeunload", endSession);

    return () => {
      mounted = false;
      window.removeEventListener("beforeunload", endSession);
      // Also try regular update on unmount
      if (sessionId.current) {
        supabase
          .from("agent_sessions")
          .update({ logout_at: new Date().toISOString(), status: "offline" })
          .eq("id", sessionId.current)
          .then(() => {});
      }
    };
  }, []);
}
