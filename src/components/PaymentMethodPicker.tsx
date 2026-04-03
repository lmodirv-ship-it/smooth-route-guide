import { useState, useEffect } from "react";
import { CheckCircle, CreditCard, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePayPal } from "@/hooks/usePayPal";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export type PaymentMethod = "cash" | "wallet" | "paypal" | "bank_transfer" | "agency_transfer";

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
  const { createPayment } = usePayPal();

  // Bank transfer fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");

  // Agency transfer
  const [agencyRecipient, setAgencyRecipient] = useState<{ firstName: string; lastName: string } | null>(null);
  const [loadingAgency, setLoadingAgency] = useState(false);

  useEffect(() => {
    if (selected === "agency_transfer" && !agencyRecipient) {
      setLoadingAgency(true);
      supabase.from("app_settings").select("value").eq("key", "agency_transfer_settings").maybeSingle()
        .then(({ data }) => {
          if (data?.value) {
            const v = data.value as Record<string, unknown>;
            setAgencyRecipient({
              firstName: String(v.firstName ?? ""),
              lastName: String(v.lastName ?? ""),
            });
          }
          setLoadingAgency(false);
        });
    }
  }, [selected, agencyRecipient]);

  const methods = [
    { id: "cash" as PaymentMethod, label: "💵 نقداً", desc: "الدفع عند التأكيد" },
    { id: "wallet" as PaymentMethod, label: "👛 محفظة", desc: `${walletBalance.toFixed(2)} DH` },
    { id: "bank_transfer" as PaymentMethod, label: "🏦 بطاقة بنكية / تحويل", desc: "Visa, Mastercard أو تحويل بنكي" },
    { id: "agency_transfer" as PaymentMethod, label: "📍 تحويل عبر وكالة", desc: "Wafacash, Cash Plus, Barid..." },
    { id: "paypal" as PaymentMethod, label: "💎 PayPal", desc: "دفع إلكتروني آمن" },
  ];

  const handlePay = async () => {
    if (processing || externalLoading) return;

    if (selected === "bank_transfer") {
      if (!fullName.trim()) { toast.error("يرجى إدخال الاسم الكامل"); return; }
      if (!phone.trim()) { toast.error("يرجى إدخال رقم الهاتف"); return; }
      if (!bankAccount.trim() && !cardNumber.trim()) { toast.error("يرجى إدخال رقم الحساب أو البطاقة البنكية"); return; }
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
            sender_name: fullName.trim(),
            sender_phone: phone.trim(),
            sender_bank_account: bankAccount.trim(),
            sender_card: cardNumber.trim() ? `****${cardNumber.trim().slice(-4)}` : null,
            card_expiry: cardExpiry.trim() || null,
          },
        }).select("id").single();
        if (error) throw error;
        toast.success("تمت عملية الدفع بنجاح ✅");
        onPaymentComplete("bank_transfer", txn?.id);

      } else if (selected === "agency_transfer") {
        const { data: txn, error } = await supabase.from("payment_transactions").insert({
          user_id: user.id, amount, currency: "MAD", transaction_type: "payment",
          payment_method: "agency_transfer", provider: "agency_transfer", status: "pending",
          reference_type: referenceType || null, reference_id: referenceId || null,
          metadata: {
            recipient_name: `${agencyRecipient?.firstName} ${agencyRecipient?.lastName}`,
            note: "في انتظار إرسال صورة الوصل عبر الدردشة الداخلية",
          },
        }).select("id").single();
        if (error) throw error;
        toast.success("تم تسجيل طلبك ✅ قم بالتحويل ثم أرسل صورة الوصل عبر الدردشة الداخلية للتفعيل");
        onPaymentComplete("agency_transfer", txn?.id);

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

      {/* Bank / Card Payment Form */}
      {selected === "bank_transfer" && (
        <div className="space-y-3 p-4 rounded-xl border border-primary/30 bg-secondary/20" dir="rtl">
          <div className="flex items-center gap-2 justify-center mb-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <p className="text-sm font-bold text-foreground">أدخل بياناتك البنكية</p>
          </div>
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center mb-2">
            <p className="text-foreground font-bold">المبلغ: <span className="text-primary text-lg">{amount} DH</span></p>
          </div>
          <Input placeholder="الاسم الكامل *" value={fullName} onChange={e => setFullName(e.target.value)} className="text-right" />
          <Input placeholder="رقم الهاتف *" value={phone} onChange={e => setPhone(e.target.value)} className="text-right" type="tel" />
          <Input placeholder="رقم الحساب البنكي (RIB)" value={bankAccount} onChange={e => setBankAccount(e.target.value)} className="text-right font-mono" dir="ltr" maxLength={30} />
          <div className="border-t border-border pt-3 mt-2">
            <p className="text-xs text-muted-foreground text-right mb-2">أو ادفع بالبطاقة البنكية:</p>
            <Input placeholder="رقم البطاقة (Visa / Mastercard)" value={cardNumber} onChange={e => setCardNumber(e.target.value.replace(/\D/g, ""))} className="font-mono" dir="ltr" maxLength={19} />
            <Input placeholder="تاريخ الانتهاء (MM/YY)" value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} className="font-mono mt-2" dir="ltr" maxLength={5} />
          </div>
        </div>
      )}

      {/* Agency Transfer */}
      {selected === "agency_transfer" && (
        <div className="space-y-3 p-4 rounded-xl border border-accent/30 bg-secondary/20" dir="rtl">
          <div className="flex items-center gap-2 justify-center mb-2">
            <MapPin className="w-5 h-5 text-accent-foreground" />
            <p className="text-sm font-bold text-foreground">تحويل عبر وكالة</p>
          </div>
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
            <p className="text-foreground font-bold">المبلغ: <span className="text-primary text-lg">{amount} DH</span></p>
          </div>

          {loadingAgency ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : agencyRecipient?.firstName ? (
            <div className="p-4 rounded-xl bg-accent/10 border border-accent/30 text-center space-y-2">
              <p className="text-sm text-muted-foreground">قم بالتحويل باسم:</p>
              <p className="text-xl font-bold text-foreground">
                {agencyRecipient.firstName} {agencyRecipient.lastName}
              </p>
              <p className="text-xs text-muted-foreground">
                عبر Wafacash أو Cash Plus أو Barid Cash أو أي وكالة تحويل
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-destructive/10 text-center">
              <p className="text-sm text-destructive">لم يتم تكوين بيانات المستلم بعد. تواصل مع الإدارة.</p>
            </div>
          )}

          <div className="p-3 rounded-lg bg-muted/50 text-right space-y-1">
            <p className="text-xs font-bold text-foreground">📋 الخطوات:</p>
            <p className="text-xs text-muted-foreground">1. اذهب إلى أقرب وكالة تحويل</p>
            <p className="text-xs text-muted-foreground">2. حوّل المبلغ باسم المستلم أعلاه</p>
            <p className="text-xs text-muted-foreground">3. التقط صورة لوصل التحويل</p>
            <p className="text-xs text-muted-foreground">4. أرسل الصورة عبر الدردشة الداخلية للمدير أو مركز الاتصال</p>
            <p className="text-xs text-muted-foreground">5. سيتم تفعيل باقتك فور التأكد من التحويل</p>
          </div>
        </div>
      )}

      <button
        onClick={handlePay}
        disabled={processing || externalLoading}
        className="w-full h-12 rounded-xl font-bold text-base gradient-primary text-primary-foreground disabled:opacity-50"
      >
        {processing ? "جاري المعالجة..." :
          selected === "bank_transfer" ? `تأكيد الدفع ${amount} DH` :
          selected === "agency_transfer" ? `تأكيد طلب التحويل ${amount} DH` :
          `ادفع ${amount} DH`}
      </button>
    </div>
  );
};

export default PaymentMethodPicker;
