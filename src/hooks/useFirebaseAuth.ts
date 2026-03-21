import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const useFirebaseLogout = () => {
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
