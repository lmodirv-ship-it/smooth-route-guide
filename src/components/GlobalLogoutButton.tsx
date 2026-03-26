import { useState, useEffect } from "react";
import { LogOut, LogIn } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLogout } from "@/hooks/useLogout";
import { useI18n } from "@/i18n/context";
import { supabase } from "@/integrations/supabase/client";

const roleDashboard: Record<string, string> = {
  driver: "/driver",
  user: "/customer",
  client: "/customer",
  delivery: "/driver/delivery",
  admin: "/admin",
  agent: "/call-center",
  store_owner: "/delivery/my-store",
  smart_admin_assistant: "/admin",
  moderator: "/admin",
};

const GlobalLogoutButton = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useLogout();
  const { t } = useI18n();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Hide on auth-related pages
  const hiddenPaths = ["/login", "/auth", "/forgot-password", "/reset-password", "/setup-admin"];
  const isHidden = hiddenPaths.some((prefix) => location.pathname.startsWith(prefix));
  if (isHidden) return null;

  const handleLogin = async () => {
    // Check if already logged in → redirect to role dashboard
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      const userRole = roles?.[0]?.role || "user";
      const dest = roleDashboard[userRole] || "/customer";
      navigate(dest);
    } else {
      navigate("/auth/client");
    }
  };

  if (isLoggedIn) {
    return (
      <button
        type="button"
        onClick={logout}
        aria-label={t.common.logout}
        title={t.common.logout}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs font-medium transition-colors hover:bg-destructive/20"
      >
        <LogOut className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t.common.logout}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogin}
      aria-label={t.common.login}
      title={t.common.login}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-success/30 bg-success/10 text-success text-xs font-medium transition-colors hover:bg-success/20"
    >
      <LogIn className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{t.common.login}</span>
    </button>
  );
};

export default GlobalLogoutButton;
