/**
 * Shared hook: loads ui_visibility settings from DB with realtime sync.
 * All global UI elements check this before rendering.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useVisibility() {
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("key", "ui_visibility")
        .maybeSingle();
      if (data?.value) {
        setVisibility(data.value as Record<string, boolean>);
      }
      setLoaded(true);
    };
    load();

    // Realtime subscription
    const channel = supabase
      .channel("ui-visibility-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings", filter: "key=eq.ui_visibility" },
        (payload: any) => {
          if (payload.new?.value) {
            setVisibility(payload.new.value as Record<string, boolean>);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isVisible = (key: string) => visibility[key] !== false;

  return { visibility, isVisible, loaded };
}
