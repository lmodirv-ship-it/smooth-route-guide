import { LogOut } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useLogout } from "@/hooks/useLogout";

const hiddenPrefixes = ["/login", "/auth", "/welcome", "/forgot-password", "/reset-password", "/setup-admin", "/"];

const GlobalLogoutButton = () => {
  const location = useLocation();
  const logout = useLogout();

  const isHidden =
    location.pathname === "/" ||
    hiddenPrefixes.some((prefix) => prefix !== "/" && location.pathname.startsWith(prefix));

  if (isHidden) return null;

  return (
    <button
      type="button"
      onClick={logout}
      aria-label="تسجيل الخروج"
      title="تسجيل الخروج"
      className="fixed bottom-24 right-4 z-[60] flex h-12 w-12 items-center justify-center rounded-full border border-destructive/30 bg-card/90 text-destructive shadow-lg backdrop-blur-sm transition-colors hover:bg-destructive/10 md:bottom-6"
    >
      <LogOut className="h-5 w-5" />
    </button>
  );
};

export default GlobalLogoutButton;
