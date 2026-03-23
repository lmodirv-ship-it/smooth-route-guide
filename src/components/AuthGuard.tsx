import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type UserRole = "driver" | "client" | "delivery" | "admin" | "agent" | "user";

const roleDashboard: Record<UserRole, string> = {
  driver: "/driver",
  client: "/client",
  delivery: "/delivery",
  agent: "/call-center",
  admin: "/admin",
  user: "/client",
};

/**
 * Maps a requiredRole prop to the set of database roles that are allowed access.
 * - "client" pages accept both "user" role (default signup) and "admin" (admins can access everything)
 * - "driver" pages require "driver" role
 * - "delivery" pages accept "user" role (delivery is a feature, not a separate db role)
 */
function isRoleAllowed(dbRole: string, requiredRole: string): boolean {
  if (dbRole === "admin") return true; // admins can access everything

  switch (requiredRole) {
    case "client":
      return dbRole === "user" || dbRole === "client";
    case "delivery":
      return dbRole === "user" || dbRole === "client";
    case "driver":
      return dbRole === "driver";
    case "admin":
      return dbRole === "admin";
    case "call_center":
      return dbRole === "agent";
    default:
      return false;
  }
}

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole: string;
}

const AuthGuard = ({ children, requiredRole }: AuthGuardProps) => {
  const [state, setState] = useState<"loading" | "ok" | "no-auth" | "wrong-role">("loading");
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState("no-auth");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .limit(1);

      const role = roles?.[0]?.role as UserRole | undefined;
      if (!role) {
        setState("no-auth");
        return;
      }

      setUserRole(role);

      if (isRoleAllowed(role, requiredRole)) {
        setState("ok");
      } else {
        setState("wrong-role");
      }
    };

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => subscription.unsubscribe();
  }, [requiredRole]);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (state === "no-auth") return <Navigate to="/login" replace />;
  if (state === "wrong-role" && userRole) return <Navigate to={roleDashboard[userRole]} replace />;

  return <>{children}</>;
};

export default AuthGuard;
