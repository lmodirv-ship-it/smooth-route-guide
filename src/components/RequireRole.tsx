import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_DASHBOARD } from "@/lib/routes";

type AppRole = "admin" | "moderator" | "user" | "driver" | "agent";

/**
 * Unified route guard.
 *
 * Usage:
 *   <RequireRole allowed={["client"]}>      — any user/client
 *   <RequireRole allowed={["driver"]}>       — drivers only
 *   <RequireRole allowed={["admin"]}>        — admins only
 *   <RequireRole allowed={["admin","agent"]}> — admins + agents
 *   <RequireRole>                            — any authenticated user
 */
interface RequireRoleProps {
  children: React.ReactNode;
  /** DB roles that may access this route. Empty / undefined = any authenticated user. */
  allowed?: string[];
}

/**
 * Maps a DB role to the set of "allowed" labels it satisfies.
 * - "admin" satisfies everything
 * - "user" satisfies "client" and "delivery" (these are features, not DB roles)
 * - "agent" satisfies "call_center" and "agent"
 */
function dbRoleSatisfies(dbRole: string, requiredLabel: string): boolean {
  if (dbRole === "admin") return true;

  switch (requiredLabel) {
    case "client":
    case "delivery":
      return dbRole === "user" || dbRole === "client";
    case "driver":
      return dbRole === "driver";
    case "admin":
      return dbRole === "admin";
    case "call_center":
    case "agent":
      return dbRole === "agent";
    default:
      return false;
  }
}

const RequireRole = ({ children, allowed }: RequireRoleProps) => {
  const [state, setState] = useState<"loading" | "ok" | "no-auth" | "wrong-role">("loading");
  const [userDbRole, setUserDbRole] = useState<AppRole | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState("no-auth");
        return;
      }

      // If no role requirement, just need auth
      if (!allowed || allowed.length === 0) {
        setState("ok");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .limit(1);

      const role = roles?.[0]?.role as AppRole | undefined;
      if (!role) {
        setState("no-auth");
        return;
      }

      setUserDbRole(role);

      const hasAccess = allowed.some((label) => dbRoleSatisfies(role, label));
      setState(hasAccess ? "ok" : "wrong-role");
    };

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => subscription.unsubscribe();
  }, [allowed]);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (state === "no-auth") return <Navigate to="/login" replace />;

  if (state === "wrong-role" && userDbRole) {
    const redirectTo = ROLE_DASHBOARD[userDbRole] || "/customer";

    // For admin/agent unauthorized pages show a nice UI
    if (allowed?.includes("admin") || allowed?.includes("agent") || allowed?.includes("call_center")) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
          <div className="text-center space-y-4 max-w-md px-6">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <ShieldOff className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">غير مصرح</h1>
            <p className="text-muted-foreground">ليس لديك صلاحية الوصول إلى هذه الصفحة.</p>
            <div className="flex gap-3 justify-center pt-4">
              <Button variant="outline" onClick={() => window.history.back()} className="border-border">رجوع</Button>
              <Button
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/login";
                }}
                className="bg-primary text-primary-foreground"
              >
                تسجيل الخروج
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default RequireRole;
