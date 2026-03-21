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
};

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

      // Map requiredRole to match db roles
      const mappedRequired = requiredRole === "call_center" ? "agent" : requiredRole === "delivery" ? "user" : requiredRole;
      
      if (role !== mappedRequired && !(requiredRole === "client" && role === "user") && !(requiredRole === "delivery" && role === "user")) {
        setState("wrong-role");
        return;
      }

      setState("ok");
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
