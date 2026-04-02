import { useState, useEffect } from "react";
import { CheckCircle, Building2, Loader2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePayPal } from "@/hooks/usePayPal";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export type PaymentMethod = "cash" | "wallet" | "paypal" | "bank_transfer";

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

interface AdminBankInfo {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  bankCity: string;
  bankSwift: string;
  enabled: boolean;
}

const PaymentMethodPicker = ({
  selected, onChange, walletBalance = 0, amount,
  onPaymentComplete, loading: externalLoading,
  referenceType, referenceId,
}: Props) => {
  const [processing, setProcessing] = useState(false);
  const { createPayment, capturePayment, init, ready } = usePayPal();
  const [senderName, setSenderName] = useState("");
  const [senderBank, setSenderBank] = useState("");
  const [senderAccount, setSenderAccount] = useState("");
  const [adminBank, setAdminBank] = useState<AdminBankInfo | null>(null);
  const [loadingBank, setLoadingBank] = useState(false);

  useEffect(() => {
    if (selected === "bank_transfer" && !adminBank) {
      setLoadingBank(true);
      supabase.from("app_settings").select("value").eq("key", "bank_transfer_settings").maybeSingle()
        .then(({ data }) => {
          if (data?.value) {
            const v = data.value as Record<string, unknown>;
            setAdminBank({
              bankName: String(v.bankName ?? ""),
              accountNumber: String(v.accountNumber ?? ""),
              accountHolder: String(v.accountHolder ?? ""),
              bankCity: String(v.bankCity ?? ""),
              bankSwift: String(v.bankSwift ?? ""),
              enabled: v.enabled !== false,
            });
          }
          setLoadingBank(false);
        });
    }
  }, [selected, adminBank]);

  const methods = [
    { id: "cash" as PaymentMethod, label: "💵 نقداً", desc: "الدفع عند التأكيد" },
    { id: "wallet" as PaymentMethod, label: "👛 محفظة", desc: `${walletBalance.toFixed(2)} DH` },
    { id: "bank_transfer" as PaymentMethod, label: "🏦 تحويل بنكي", desc: "تحويل مباشر إلى حساب المنصة" },
    { id: "paypal" as PaymentMethod, label: "💎 PayPal", desc: "دفع إلكتروني آمن" },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ ✅");
  };

  const handlePay = async () => {
    if (processing || externalLoading) return;

    if (selected === "bank_transfer") {
      if (!senderName.trim()) {
        toast.error("يرجى إدخال اسمك الكامل");
        return;
      }
    }

    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("يجب تسجيل الدخول");

      if (selected === "cash") {
        const { data: txn, error } = await supabase.from("payment_transactions").insert({
          user_id: user.id, amount, currency: "MAD", transaction_type: "payment",
          payment_method: "cash", provider: "cash", status: "pending",
          reference_type: referenceType || null, reference_id: referenceId || null,
        }).select("id").single();
        if (error) throw error;
        onPaymentComplete("cash", txn?.id);
      } else if (selected === "bank_transfer") {
        const { data: txn, error } = await supabase.from("payment_transactions").insert({
          user_id: user.id, amount, currency: "MAD", transaction_type: "payment",
          payment_method: "bank_transfer", provider: "bank_transfer", status: "pending",
          reference_type: referenceType || null, reference_id: referenceId || null,
          metadata: {
            sender_name: senderName.trim(),
            sender_bank: senderBank.trim(),
            sender_account: senderAccount.trim(),
            admin_bank: adminBank?.bankName,
            admin_account: adminBank?.accountNumber,
          },
        }).select("id").single();
        if (error) throw error;
        toast.success("تم تسجيل طلب التحويل ✅ سيتم التفعيل بعد التأكد من الدفع");
        onPaymentComplete("bank_transfer", txn?.id);
      } else if (selected === "wallet") {
        if (walletBalance < amount) { toast.error("رصيد المحفظة غير كافٍ"); setProcessing(false); return; }
        const { data: wallet } = await supabase.from("wallet").select("id, balance").eq("user_id", user.id).single();
        if (!wallet || Number(wallet.balance) < amount) { toast.error("رصيد المحفظة غير كافٍ"); setProcessing(false); return; }
        const newBal = Number(wallet.balance) - amount;
        await supabase.from("wallet").update({ balance: newBal }).eq("id", wallet.id);
        const { data: txn } = await supabase.from("payment_transactions").insert({
          user_id: user.id, amount, currency: "MAD", transaction_type: "payment",
          payment_method: "wallet", provider: "wallet", status: "completed",
          completed_at: new Date().toISOString(), reference_type: referenceType || null, reference_id: referenceId || null,
        }).select("id").single();
        await supabase.from("wallet_transactions").insert({
          wallet_id: wallet.id, user_id: user.id, amount: -amount, balance_after: newBal,
          transaction_type: "payment", description: referenceType || "شراء باقة", payment_transaction_id: txn?.id,
        });
        onPaymentComplete("wallet", txn?.id);
      } else if (selected === "paypal") {
        if (!ready) await init();
        const result = await createPayment({ amount, currency: "MAD", description: referenceType || "شراء باقة", referenceType, referenceId });
        if (result) {
          if (result.approveUrl) {
            window.open(result.approveUrl, "_blank");
            toast.info("أكمل الدفع في نافذة PayPal ثم عد هنا");
          }
          onPaymentComplete("paypal", result.transactionId);
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

      {/* Bank Transfer Section */}
      {selected === "bank_transfer" && (
        <div className="space-y-4 p-4 rounded-xl border border-primary/30 bg-secondary/20" dir="rtl">
          {/* Admin bank info - where to send money */}
          {loadingBank ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : adminBank && adminBank.accountNumber ? (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                قم بتحويل المبلغ إلى هذا الحساب:
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <button onClick={() => copyToClipboard(adminBank.accountNumber)} className="text-primary hover:text-primary/80"><Copy className="w-3.5 h-3.5" /></button>
                  <p className="text-foreground"><span className="text-muted-foreground">البنك:</span> {adminBank.bankName}</p>
                </div>
                <div className="flex items-center justify-between">
                  <button onClick={() => copyToClipboard(adminBank.accountNumber)} className="text-primary hover:text-primary/80"><Copy className="w-3.5 h-3.5" /></button>
                  <p className="text-foreground font-mono" dir="ltr">{adminBank.accountNumber}</p>
                </div>
                <p className="text-foreground"><span className="text-muted-foreground">باسم:</span> {adminBank.accountHolder}</p>
                {adminBank.bankCity && <p className="text-muted-foreground text-xs">المدينة: {adminBank.bankCity}</p>}
              </div>
              <div className="mt-2 p-2 rounded-lg bg-accent/50 text-center">
                <p className="text-foreground font-bold">المبلغ: <span className="text-primary text-lg">{amount} DH</span></p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-destructive/10 text-center">
              <p className="text-sm text-destructive">لم يتم تكوين الحساب البنكي بعد. تواصل مع الإدارة.</p>
            </div>
          )}

          {/* Sender info */}
          <div className="space-y-3">
            <p className="text-sm font-bold text-foreground">بياناتك (المرسل):</p>
            <Input placeholder="اسمك الكامل *" value={senderName} onChange={e => setSenderName(e.target.value)} className="text-right" />
            <Input placeholder="اسم بنكك (اختياري)" value={senderBank} onChange={e => setSenderBank(e.target.value)} className="text-right" />
            <Input placeholder="رقم حسابك (اختياري)" value={senderAccount} onChange={e => setSenderAccount(e.target.value)} className="text-right font-mono" dir="ltr" />
          </div>
        </div>
      )}

      <button
        onClick={handlePay}
        disabled={processing || externalLoading}
        className="w-full h-12 rounded-xl font-bold text-base gradient-primary text-primary-foreground disabled:opacity-50"
      >
        {processing ? "جاري المعالجة..." : selected === "bank_transfer" ? `تأكيد التحويل ${amount} DH` : `ادفع ${amount} DH`}
      </button>
    </div>
  );
};

export default PaymentMethodPicker;
