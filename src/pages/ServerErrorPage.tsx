import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ServerErrorPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
      <h1 className="text-3xl font-bold mb-2">500 — خطأ داخلي</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        حدث خطأ غير متوقع في الخادم. حاول تحديث الصفحة، وإن استمر الخطأ تواصل مع الدعم.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => window.location.reload()}>تحديث</Button>
        <Button variant="outline" asChild><Link to="/">الرئيسية</Link></Button>
      </div>
    </main>
  );
}
