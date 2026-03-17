import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Loader2 } from "lucide-react";
import type { UserRole } from "@/lib/firebaseServices";

const roleDashboard: Record<UserRole, string> = {
  driver: "/driver",
  client: "/client",
  delivery: "/delivery",
  call_center: "/call-center",
  admin: "/admin",
};

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole: UserRole;
}

const AuthGuard = ({ children, requiredRole }: AuthGuardProps) => {
  const [state, setState] = useState<"loading" | "ok" | "no-auth" | "wrong-role" | "incomplete-profile">("loading");
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const location = useLocation();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState("no-auth");
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) {
          setState("no-auth");
          return;
        }
        const data = snap.data();
        const role = data.role as UserRole;
        setUserRole(role);

        if (role !== requiredRole) {
          setState("wrong-role");
          return;
        }

        if (data.profileCompleted === false && !location.pathname.includes("complete-profile")) {
          setState("incomplete-profile");
          return;
        }

        setState("ok");
      } catch {
        setState("no-auth");
      }
    });
    return () => unsub();
  }, [requiredRole, location.pathname]);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (state === "no-auth") return <Navigate to="/welcome" replace />;
  if (state === "wrong-role" && userRole) return <Navigate to={roleDashboard[userRole]} replace />;
  if (state === "incomplete-profile") return <Navigate to="/complete-profile" replace />;

  return <>{children}</>;
};

export default AuthGuard;
