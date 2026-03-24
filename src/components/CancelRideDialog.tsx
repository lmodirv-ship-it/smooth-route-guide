import { useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const CANCEL_REASONS_CUSTOMER = [
  "وجدت وسيلة نقل أخرى",
  "السائق تأخر كثيراً",
  "أخطأت في العنوان",
  "تغيرت خططي",
  "سبب آخر",
];

const CANCEL_REASONS_DRIVER = [
  "العميل لا يرد",
  "العنوان غير صحيح",
  "مشكلة في السيارة",
  "ازدحام شديد",
  "سبب آخر",
];

interface CancelRideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rideId: string;
  role: "customer" | "driver";
  onCancelled: () => void;
}

export default function CancelRideDialog({ open, onOpenChange, rideId, role, onCancelled }: CancelRideDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const reasons = role === "customer" ? CANCEL_REASONS_CUSTOMER : CANCEL_REASONS_DRIVER;

  const handleCancel = async () => {
    if (!selectedReason || cancelling) return;
    setCancelling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("غير مسجل الدخول");

      const { error } = await supabase
        .from("ride_requests")
        .update({
          status: "cancelled",
          cancelled_by: user.id,
          cancel_reason: selectedReason,
          cancelled_at: new Date().toISOString(),
        } as any)
        .eq("id", rideId)
        .not("status", "in", "(completed,cancelled)");

      if (error) throw error;

      toast({ title: "تم إلغاء الرحلة ❌", description: selectedReason });
      onOpenChange(false);
      setSelectedReason(null);
      onCancelled();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message || "فشل إلغاء الرحلة", variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm rounded-2xl" dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="w-5 h-5" />
            إلغاء الرحلة
          </AlertDialogTitle>
          <AlertDialogDescription>
            يرجى اختيار سبب الإلغاء. لا يمكن التراجع عن هذا الإجراء.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 my-2">
          {reasons.map((reason) => (
            <button
              key={reason}
              onClick={() => setSelectedReason(reason)}
              className={`w-full text-right p-3 rounded-xl border text-sm transition-all ${
                selectedReason === reason
                  ? "border-destructive bg-destructive/10 text-destructive font-bold"
                  : "border-border bg-muted/30 text-foreground hover:bg-muted/50"
              }`}
            >
              {reason}
            </button>
          ))}
        </div>

        <AlertDialogFooter className="flex gap-2 sm:gap-2">
          <AlertDialogCancel className="rounded-xl flex-1">تراجع</AlertDialogCancel>
          <Button
            onClick={handleCancel}
            disabled={!selectedReason || cancelling}
            variant="destructive"
            className="rounded-xl flex-1 gap-2"
          >
            {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            {cancelling ? "جارٍ الإلغاء..." : "تأكيد الإلغاء"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
