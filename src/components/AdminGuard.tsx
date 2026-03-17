import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminGuardProps {
  children: React.ReactNode;
}

const AdminGuard = ({ children }: AdminGuardProps) => {
  const [state, setState] = useState<"loading" | "authorized" | "unauthorized" | "unauthenticated">("loading");

  useEffect(() => {
    let mounted = true;

    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (mounted) setState("unauthenticated");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin");

      if (mounted) {
        setState(roles && roles.length > 0 ? "authorized" : "unauthorized");
      }
    };

    checkAccess();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        if (mounted) setState("unauthenticated");
      } else {
        checkAccess();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (state === "loading") {
    return (
      <div className="min-h-screen gradient-dark flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (state === "unauthenticated") {
    return <Navigate to="/login?role=admin" replace />;
  }

  if (state === "unauthorized") {
    return (
      <div className="min-h-screen gradient-dark flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <ShieldOff className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">غير مصرح</h1>
          <p className="text-muted-foreground">ليس لديك صلاحية الوصول إلى لوحة التحكم. يجب أن يكون لديك دور "مسؤول" للدخول.</p>
          <div className="flex gap-3 justify-center pt-4">
            <Button variant="outline" onClick={() => window.history.back()} className="border-border">
              رجوع
            </Button>
            <Button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}
              className="gradient-primary text-primary-foreground">
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminGuard;
