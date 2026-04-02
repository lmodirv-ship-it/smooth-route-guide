import { useState } from "react";
import { Banknote, Wallet, CreditCard, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePayPal } from "@/hooks/usePayPal";
import { toast } from "sonner";

export type PaymentMethod = "cash" | "wallet" | "paypal";

interface Props {
  selected: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
  walletBalance?: number;
  amount: number;
  onPaymentComplete: (method: PaymentMethod, transactionId?: string) => void;
  loading?: boolean;
  referenceType?: string;
  referenceId?: string;
}

const PaymentMethodPicker = ({
  selected, onChange, walletBalance = 0, amount,
  onPaymentComplete, loading: externalLoading,
  referenceType, referenceId,
}: Props) => {
  const [processing, setProcessing] = useState(false);
  const { createPayment, capturePayment, init, ready } = usePayPal();

  const methods = [
    { id: "cash" as PaymentMethod, label: "💵 نقداً", desc: "الدفع عند التأكيد", color: "text-emerald-400" },
    { id: "wallet" as PaymentMethod, label: "👛 محفظة", desc: `${walletBalance.toFixed(2)} DH`, color: "text-primary" },
    { id: "paypal" as PaymentMethod, label: "💎 PayPal", desc: "دفع إلكتروني آمن", color: "text-blue-400" },
  ];

  const handlePay = async () => {
    if (processing || externalLoading) return;
    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("يجب تسجيل الدخول");

      if (selected === "cash") {
        // Record cash transaction as pending (needs admin/agent approval)
        const { data: txn, error } = await supabase.from("payment_transactions").insert({
          user_id: user.id,
          amount,
          currency: "MAD",
          transaction_type: "payment",
          payment_method: "cash",
          provider: "cash",
          status: "pending",
          reference_type: referenceType || null,
          reference_id: referenceId || null,
        }).select("id").single();
        if (error) throw error;
        onPaymentComplete("cash", txn?.id);
      } else if (selected === "wallet") {
        if (walletBalance < amount) {
          toast.error("رصيد المحفظة غير كافٍ");
          setProcessing(false);
          return;
        }
        // Deduct from wallet
        const { data: wallet } = await supabase.from("wallet")
          .select("id, balance").eq("user_id", user.id).single();
        if (!wallet || Number(wallet.balance) < amount) {
          toast.error("رصيد المحفظة غير كافٍ");
          setProcessing(false);
          return;
        }
        const newBal = Number(wallet.balance) - amount;
        await supabase.from("wallet").update({ balance: newBal }).eq("id", wallet.id);

        const { data: txn } = await supabase.from("payment_transactions").insert({
          user_id: user.id,
          amount,
          currency: "MAD",
          transaction_type: "payment",
          payment_method: "wallet",
          provider: "wallet",
          status: "completed",
          completed_at: new Date().toISOString(),
          reference_type: referenceType || null,
          reference_id: referenceId || null,
        }).select("id").single();

        await supabase.from("wallet_transactions").insert({
          wallet_id: wallet.id,
          user_id: user.id,
          amount: -amount,
          balance_after: newBal,
          transaction_type: "payment",
          description: referenceType || "شراء باقة",
          payment_transaction_id: txn?.id,
        });

        onPaymentComplete("wallet", txn?.id);
      } else if (selected === "paypal") {
        if (!ready) await init();
        const result = await createPayment({
          amount,
          currency: "MAD",
          description: referenceType || "شراء باقة",
          referenceType,
          referenceId,
        });
        if (result) {
          // Open PayPal approval URL
          if (result.approveUrl) {
            window.open(result.approveUrl, "_blank");
            toast.info("أكمل الدفع في نافذة PayPal ثم عد هنا");
            // For now, mark as pending - will be captured via webhook or manual
            onPaymentComplete("paypal", result.transactionId);
          } else {
            onPaymentComplete("paypal", result.transactionId);
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || "خطأ في عملية الدفع");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-foreground text-right">اختر طريقة الدفع</p>
      <div className="space-y-2">
        {methods.map(m => (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className={`w-full rounded-xl p-3 border flex items-center justify-between transition-all ${
              selected === m.id ? "border-primary bg-primary/10" : "border-border bg-secondary/30"
            }`}
          >
            <div className="flex items-center gap-2">
              {selected === m.id && <CheckCircle className="w-4 h-4 text-primary" />}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{m.label}</p>
              <p className="text-xs text-muted-foreground">{m.desc}</p>
            </div>
          </button>
        ))}
      </div>
      <button
        onClick={handlePay}
        disabled={processing || externalLoading}
        className="w-full h-12 rounded-xl font-bold text-base gradient-primary text-primary-foreground disabled:opacity-50"
      >
        {processing ? "جاري المعالجة..." : `ادفع ${amount} DH`}
      </button>
    </div>
  );
};

export default PaymentMethodPicker;
