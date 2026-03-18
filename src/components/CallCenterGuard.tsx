import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Loader2, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFirebaseLogout } from "@/hooks/useFirebaseAuth";

interface CallCenterGuardProps {
  children: React.ReactNode;
}

const CallCenterGuard = ({ children }: CallCenterGuardProps) => {
  const [state, setState] = useState<"loading" | "authorized" | "unauthorized" | "unauthenticated">("loading");
  const logout = useFirebaseLogout();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState("unauthenticated");
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const role = snap.data().role;
          // Allow admin and agent roles
          if (role === "admin" || role === "agent" || role === "call_center") {
            setState("authorized");
          } else {
            setState("unauthorized");
          }
        } else {
          setState("unauthorized");
        }
      } catch {
        setState("unauthorized");
      }
    });
    return () => unsub();
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
    return <Navigate to="/login" replace />;
  }

  if (state === "unauthorized") {
    return (
      <div className="min-h-screen gradient-dark flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <ShieldOff className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">غير مصرح</h1>
          <p className="text-muted-foreground">ليس لديك صلاحية الوصول إلى مركز الاتصال.</p>
          <div className="flex gap-3 justify-center pt-4">
            <Button variant="outline" onClick={() => window.history.back()} className="border-border">
              رجوع
            </Button>
            <Button onClick={logout} className="gradient-primary text-primary-foreground">
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default CallCenterGuard;
