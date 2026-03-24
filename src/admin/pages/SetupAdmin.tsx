import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SetupAdmin = () => {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const setup = async () => {
    setStatus("loading");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMsg("يجب تسجيل الدخول أولاً");
        setStatus("error");
        return;
      }

      // Check if already admin
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const isAdmin = roles?.some(r => r.role === "admin");
      
      if (isAdmin) {
        setMsg("أنت بالفعل مسؤول");
        setStatus("done");
        return;
      }

      // Note: Admin role must be assigned via database directly for security
      setMsg("لتعيين دور المسؤول، يرجى التواصل مع فريق الدعم أو تعيينه من قاعدة البيانات مباشرة.");
      setStatus("done");
    } catch (e: any) {
      setMsg(e.message || "حدث خطأ");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6" dir="rtl">
      <div className="max-w-md w-full space-y-6 text-center">
        <ShieldCheck className="w-16 h-16 text-primary mx-auto" />
        <h1 className="text-2xl font-bold text-foreground">إعداد المسؤول</h1>

        {status === "idle" && (
          <Button onClick={setup} className="gradient-primary text-primary-foreground font-bold px-8 py-3 rounded-xl">
            بدء الإعداد
          </Button>
        )}

        {status === "loading" && <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />}

        {(status === "done" || status === "error") && (
          <div className={`p-4 rounded-xl ${status === "done" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
            {status === "done" && <CheckCircle className="w-6 h-6 mx-auto mb-2" />}
            <p>{msg}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SetupAdmin;
