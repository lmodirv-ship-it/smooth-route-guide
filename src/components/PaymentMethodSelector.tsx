import { Banknote, Wallet, CreditCard, CheckCircle, Building2, MapPin, Zap } from "lucide-react";
import { useI18n } from "@/i18n/context";

export type PaymentMethodType = "cash" | "wallet" | "paypal" | "stripe" | "bank_transfer" | "agency_transfer";

interface Props {
  selected: PaymentMethodType;
  onChange: (method: PaymentMethodType) => void;
  walletBalance?: number;
  compact?: boolean;
}

const PaymentMethodSelector = ({ selected, onChange, walletBalance = 0, compact = false }: Props) => {
  const { t } = useI18n();

  const methods: { id: PaymentMethodType; label: string; icon: any; desc: string; color: string; iconText?: string }[] = [
    { id: "cash", label: t.customer.cashLabel, icon: Banknote, desc: "الدفع عند الوصول", color: "text-success" },
    { id: "wallet", label: t.customer.walletLabel, icon: Wallet, desc: `${walletBalance.toFixed(2)} DH`, color: "text-primary" },
    { id: "stripe", label: "Stripe", icon: Zap, desc: "Visa, Mastercard, Apple/Google Pay", color: "text-violet-500" },
    { id: "paypal", label: "PayPal", icon: CreditCard, desc: "دفع إلكتروني آمن", color: "text-info", iconText: "PP" },
    { id: "bank_transfer", label: "تحويل بنكي", icon: Building2, desc: "تحويل عبر الحساب البنكي", color: "text-blue-500" },
    { id: "agency_transfer", label: "تحويل وكالة", icon: MapPin, desc: "Wafacash / Cash Plus", color: "text-amber-500" },
  ];

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {methods.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => onChange(id)}
            className={`flex-1 min-w-[80px] p-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all ${selected === id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
            <Icon className="w-3.5 h-3.5" /><span className="text-xs">{label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {methods.map((m) => (
        <button key={m.id} onClick={() => onChange(m.id)}
          className={`w-full gradient-card rounded-xl p-4 border flex items-center justify-between transition-all ${selected === m.id ? "border-primary glow-ring-orange" : "border-border"}`}>
          <div className="flex items-center gap-2">
            {selected === m.id && <CheckCircle className="w-5 h-5 text-primary" />}
          </div>
          <div className="flex items-center gap-3">
            <div><p className="text-sm text-foreground font-medium">{m.label}</p><p className="text-xs text-muted-foreground">{m.desc}</p></div>
            <div className={`w-10 h-10 rounded-full bg-secondary flex items-center justify-center`}>
              {m.iconText ? (
                <span className={`font-bold ${m.color} text-xs`}>{m.iconText}</span>
              ) : (
                <m.icon className={`w-5 h-5 ${m.color}`} />
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default PaymentMethodSelector;
