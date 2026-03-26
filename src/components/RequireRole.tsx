import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_DASHBOARD } from "@/lib/routes";

type AppRole = "admin" | "moderator" | "user" | "driver" | "agent" | "delivery" | "store_owner" | "smart_admin_assistant";

/**
 * Unified route guard — Supabase is the single source of truth.
 *
 * Usage:
 *   <RequireRole allowed={["client"]}>       — any user/client
 *   <RequireRole allowed={["driver"]}>        — drivers only
 *   <RequireRole allowed={["admin"]}>         — admins only
 *   <RequireRole allowed={["admin","agent"]}> — admins + agents
 *   <RequireRole>                             — any authenticated user
 *
 * Access matrix:
 *   /admin/*       → allowed={["admin"]}
 *   /call-center/* → allowed={["admin","agent"]}
 *   /driver/*      → allowed={["driver"]}
 *   /customer/*    → allowed={["client"]}
 *   /delivery/*    → allowed={["delivery"]}
 */
interface RequireRoleProps {
  children: React.ReactNode;
  /** Labels that may access this route. Empty / undefined = any authenticated user. */
  allowed?: string[];
}

/**
 * Checks if a DB role satisfies a required route label.
 * - "admin" satisfies everything (superuser)
 * - "user" satisfies "client" and "delivery"
 * - "driver" satisfies "driver"
 * - "agent" satisfies "agent" and "call_center"
 */
function dbRoleSatisfies(dbRole: string, requiredLabel: string): boolean {
  if (dbRole === "admin") return true;

  switch (requiredLabel) {
    case "client":
      return dbRole === "user" || dbRole === "client";
    case "delivery":
      return dbRole === "delivery";
    case "driver":
      return dbRole === "driver";
    case "admin":
      return dbRole === "admin";
    case "moderator":
      return dbRole === "moderator";
    case "call_center":
    case "agent":
      return dbRole === "agent" || dbRole === "smart_admin_assistant";
    case "store_owner":
      return dbRole === "store_owner";
    case "smart_admin_assistant":
      return dbRole === "smart_admin_assistant";
    default:
      return false;
  }
}

/** Pick the best dashboard for a set of DB roles. */
function bestDashboard(roles: AppRole[]): string {
  if (roles.includes("admin")) return ROLE_DASHBOARD.admin;
  if (roles.includes("smart_admin_assistant")) return ROLE_DASHBOARD.smart_admin_assistant;
  if (roles.includes("moderator")) return ROLE_DASHBOARD.moderator;
  if (roles.includes("agent")) return ROLE_DASHBOARD.agent;
  if (roles.includes("store_owner")) return ROLE_DASHBOARD.store_owner;
  if (roles.includes("driver")) return ROLE_DASHBOARD.driver;
  if (roles.includes("delivery")) return ROLE_DASHBOARD.delivery;
  return ROLE_DASHBOARD.user || "/customer";
}

const RequireRole = ({ children, allowed }: RequireRoleProps) => {
  const [state, setState] = useState<"loading" | "ok" | "no-auth" | "wrong-role">("loading");
  const [userRoles, setUserRoles] = useState<AppRole[]>([]);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (mounted) setState("no-auth");
        return;
      }

      // No role requirement — just need auth
      if (!allowed || allowed.length === 0) {
        if (mounted) setState("ok");
        return;
      }

      // Fetch ALL roles for this user (supports multi-role accounts)
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const roles = (rolesData || []).map((r) => r.role as AppRole);

      if (!mounted) return;

      if (roles.length === 0) {
        setState("no-auth");
        return;
      }

      setUserRoles(roles);

      const hasAccess = roles.some((dbRole) =>
        allowed.some((label) => dbRoleSatisfies(dbRole, label))
      );
      setState(hasAccess ? "ok" : "wrong-role");
    };

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (mounted) check();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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

  if (state === "wrong-role") {
    const redirectTo = bestDashboard(userRoles);

    // For restricted areas (admin/agent) show an explicit "unauthorized" UI
    if (allowed?.some((a) => ["admin", "agent", "call_center"].includes(a))) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
          <div className="text-center space-y-4 max-w-md px-6">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <ShieldOff className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">غير مصرح</h1>
            <p className="text-muted-foreground">ليس لديك صلاحية الوصول إلى هذه الصفحة.</p>
            <div className="flex gap-3 justify-center pt-4">
              <Button variant="outline" onClick={() => window.history.back()} className="border-border">
                رجوع
              </Button>
              <Button
                onClick={async () => {
                  await supabase.auth.signOut();
                  localStorage.removeItem("hn_user_role");
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
