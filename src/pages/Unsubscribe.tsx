import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "valid" | "used" | "invalid" | "done" | "error">("loading");

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }

    const validate = async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`;
        const res = await fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
        const data = await res.json();
        if (!res.ok) { setStatus("invalid"); return; }
        setStatus(data.valid ? "valid" : data.reason === "already_unsubscribed" ? "used" : "invalid");
      } catch { setStatus("error"); }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    try {
      const { data } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      setStatus(data?.success ? "done" : "error");
    } catch { setStatus("error"); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6" dir="rtl">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        {status === "loading" && <p className="text-muted-foreground">جاري التحقق...</p>}
        {status === "valid" && (
          <>
            <h1 className="text-xl font-bold text-foreground mb-4">إلغاء الاشتراك</h1>
            <p className="text-muted-foreground mb-6">هل تريد إلغاء استقبال رسائل البريد الإلكتروني من HN Driver؟</p>
            <button onClick={handleUnsubscribe} className="rounded-xl bg-destructive px-6 py-3 text-sm font-semibold text-destructive-foreground hover:opacity-90 transition-opacity">
              تأكيد إلغاء الاشتراك
            </button>
          </>
        )}
        {status === "done" && <p className="text-success font-semibold">✅ تم إلغاء اشتراكك بنجاح</p>}
        {status === "used" && <p className="text-muted-foreground">تم إلغاء اشتراكك مسبقاً</p>}
        {status === "invalid" && <p className="text-destructive">رابط غير صالح</p>}
        {status === "error" && <p className="text-destructive">حدث خطأ، حاول مرة أخرى</p>}
      </div>
    </div>
  );
};

export default Unsubscribe;
