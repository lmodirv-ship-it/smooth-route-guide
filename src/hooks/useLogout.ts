import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Unified logout hook. Clears Supabase session and local role storage.
 */
export const useLogout = () => {
  const navigate = useNavigate();

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("hn_user_role");
      navigate("/login", { replace: true });
    } catch {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  return logout;
};

/** @deprecated Use useLogout instead */
export const useFirebaseLogout = useLogout;
