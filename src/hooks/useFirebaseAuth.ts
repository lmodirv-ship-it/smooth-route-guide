import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export const useFirebaseLogout = () => {
  const navigate = useNavigate();

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("hn_user_role");
      navigate("/welcome", { replace: true });
    } catch {
      // Force navigate even on error
      navigate("/welcome", { replace: true });
    }
  }, [navigate]);

  return logout;
};
