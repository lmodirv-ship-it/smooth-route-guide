import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
      <h1 className="text-3xl font-bold mb-2">403 — ممنوع الوصول</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        ليست لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة. قم بتسجيل الدخول بحساب مناسب أو ارجع إلى الصفحة الرئيسية.
      </p>
      <div className="flex gap-3">
        <Button asChild><Link to="/">الرئيسية</Link></Button>
        <Button variant="outline" asChild><Link to="/auth">تسجيل الدخول</Link></Button>
      </div>
    </main>
  );
}
