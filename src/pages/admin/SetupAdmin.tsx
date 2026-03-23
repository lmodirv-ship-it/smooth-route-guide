import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, ShieldCheck } from "lucide-react";

const SetupAdmin = () => {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const setup = async () => {
    setStatus("loading");
    try {
      // Sign in with the test account
      const cred = await signInWithEmailAndPassword(auth, "Lmodirv@gmail.com", "123456");
      const uid = cred.user.uid;

      // Check if user doc exists
      const userSnap = await getDoc(doc(db, "users", uid));

      const userData = {
        uid,
        fullName: "Admin Master",
        email: "Lmodirv@gmail.com",
        phone: "",
        role: "admin",
        city: "الرياض",
        status: "active",
        photoURL: "",
        profileCompleted: true,
        createdAt: userSnap.exists() ? (userSnap.data().createdAt || new Date().toISOString()) : new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      // Set user doc with admin role
      await setDoc(doc(db, "users", uid), userData, { merge: true });

      // Create admin doc
      await setDoc(doc(db, "admins", uid), {
        uid,
        fullName: "Admin Master",
        email: "Lmodirv@gmail.com",
        phone: "",
        isActive: true,
        createdAt: new Date().toISOString(),
      }, { merge: true });

      setMsg(`✅ تم تعيين الحساب كـ Admin بنجاح (UID: ${uid})`);
      setStatus("done");
    } catch (e: any) {
      setMsg(`❌ خطأ: ${e.message}`);
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen gradient-dark flex items-center justify-center p-6" dir="rtl">
      <div className="gradient-card rounded-2xl border border-border p-8 max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto">
          <ShieldCheck className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">إعداد حساب المسؤول</h1>
        <p className="text-sm text-muted-foreground">
          سيتم تسجيل الدخول بـ <span className="text-primary font-mono">Lmodirv@gmail.com</span> وتعيينه كـ Admin
        </p>

        {status === "idle" && (
          <Button onClick={setup} className="gradient-primary text-primary-foreground w-full">
            تعيين كمسؤول
          </Button>
        )}

        {status === "loading" && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>جاري الإعداد...</span>
          </div>
        )}

        {(status === "done" || status === "error") && (
          <div className="space-y-4">
            <p className={`text-sm ${status === "done" ? "text-success" : "text-destructive"}`}>{msg}</p>
            {status === "done" && (
              <Button onClick={() => window.location.href = "/admin"} className="gradient-primary text-primary-foreground w-full">
                الذهاب إلى لوحة التحكم
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SetupAdmin;
