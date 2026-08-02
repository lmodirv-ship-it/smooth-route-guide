import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/hn-driver-badge.png";

export default function ServerErrorPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <img src={logo} alt="HN Driver" className="h-24 w-auto mb-4 drop-shadow-lg" />
      <h1 className="text-3xl font-bold mb-2">مجموعة HN Driver ترحب بكم</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        نحن في خدمتكم. حدث خلل بسيط، يمكنكم تحديث الصفحة أو العودة إلى الصفحة الرئيسية.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Button asChild><Link to="/auth/client?mode=signup">إنشاء حساب جديد</Link></Button>
        <Button variant="outline" onClick={() => window.location.reload()}>تحديث</Button>
        <Button variant="ghost" asChild><Link to="/">الرئيسية</Link></Button>
      </div>
    </main>
  );
}

