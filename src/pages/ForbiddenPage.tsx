import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/hn-driver-badge.png";
import Error3DBackground from "@/components/Error3DBackground";

export default function ForbiddenPage() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <Error3DBackground />
      <div className="relative z-10 rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl px-8 py-10 shadow-2xl animate-fade-in">
        <img src={logo} alt="HN Driver" className="h-24 w-auto mb-4 mx-auto drop-shadow-[0_10px_30px_hsl(var(--primary)/0.5)]" />
        <h1 className="text-3xl font-bold mb-2">مجموعة HN Driver ترحب بكم</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          نحن في خدمتكم. يمكنكم إنشاء حساب جديد أو تسجيل الدخول للوصول إلى حسابكم.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button asChild><Link to="/auth/client?mode=signup">إنشاء حساب جديد</Link></Button>
          <Button variant="outline" asChild><Link to="/login">تسجيل الدخول</Link></Button>
          <Button variant="ghost" asChild><Link to="/">الرئيسية</Link></Button>
        </div>
      </div>
    </main>
  );
}
