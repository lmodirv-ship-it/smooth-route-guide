import { AlertTriangle, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type LocationPermissionPromptProps = {
  busy?: boolean;
  onRetry: () => void;
};

const steps = [
  "اسمح بالوصول إلى الموقع عند ظهور نافذة الإذن.",
  "فعّل GPS أو خدمات الموقع في الهاتف.",
  "إذا رفضت الإذن سابقًا، افتح إعدادات التطبيق ثم فعّل الموقع.",
];

const LocationPermissionPrompt = ({ busy = false, onRetry }: LocationPermissionPromptProps) => {
  return (
    <Alert className="mx-4 mt-4 overflow-hidden rounded-3xl border border-destructive/30 bg-card/95 p-0 shadow-2xl shadow-destructive/10">
      <div className="border-b border-destructive/15 bg-destructive/10 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1 text-right">
            <AlertTitle className="text-base font-bold text-foreground">إذن الموقع مطلوب</AlertTitle>
            <AlertDescription className="mt-1 text-sm leading-6 text-muted-foreground">
              فعّل إذن الموقع ليظهر مكانك على الخريطة وتستقبل الطلبات القريبة بدقة.
            </AlertDescription>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4 text-right">
        <div className="grid gap-2 rounded-2xl border border-border bg-background/70 p-3">
          {steps.map((step, index) => (
            <div key={step} className="flex items-start justify-between gap-3">
              <p className="text-sm leading-6 text-foreground">{step}</p>
              <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {index + 1}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-2 rounded-2xl border border-border bg-background/60 p-3 sm:grid-cols-2">
          <div className="flex items-center justify-end gap-2 text-right text-xs text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground">خدمات الموقع</p>
              <p>شغّل GPS من الجهاز</p>
            </div>
            <Smartphone className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-center justify-end gap-2 text-right text-xs text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground">إذن التطبيق</p>
              <p>اسمح للتطبيق باستخدام الموقع</p>
            </div>
            <ShieldCheck className="h-4 w-4 text-success" />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button onClick={onRetry} disabled={busy} className="flex-1 gap-2 rounded-2xl">
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
            {busy ? "جارٍ طلب الموقع..." : "إعادة المحاولة"}
          </Button>
          <p className="flex-1 self-center text-center text-xs leading-6 text-muted-foreground sm:text-right">
            بعد السماح بالموقع سيظهر وضعك كـ <span className="font-semibold text-foreground">متصل</span> وتتحرك الخريطة إلى موقعك الحالي.
          </p>
        </div>
      </div>
    </Alert>
  );
};

export default LocationPermissionPrompt;
