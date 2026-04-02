import { Banknote, Wallet, CreditCard, CheckCircle } from "lucide-react";
import { useI18n } from "@/i18n/context";

export type PaymentMethodType = "cash" | "wallet" | "paypal";

interface Props {
  selected: PaymentMethodType;
  onChange: (method: PaymentMethodType) => void;
  walletBalance?: number;
  compact?: boolean;
}

const PaymentMethodSelector = ({ selected, onChange, walletBalance = 0, compact = false }: Props) => {
  const { t } = useI18n();

  const methods: { id: PaymentMethodType; label: string; icon: any; desc: string; color: string }[] = [
    { id: "cash", label: t.customer.cashLabel, icon: Banknote, desc: t.customer.payOnArrival || "الدفع عند الوصول", color: "text-success" },
    { id: "wallet", label: t.customer.walletLabel, icon: Wallet, desc: `${walletBalance.toFixed(2)} DH`, color: "text-primary" },
    { id: "paypal", label: "PayPal", icon: CreditCard, desc: "دفع إلكتروني آمن", color: "text-info" },
  ];

  if (compact) {
    return (
      <div className="flex gap-2">
        {methods.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => onChange(id)}
            className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${selected === id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
            <Icon className="w-4 h-4" /><span className="text-sm">{label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {methods.map((m, i) => (
        <button key={m.id} onClick={() => onChange(m.id)}
          className={`w-full gradient-card rounded-xl p-4 border flex items-center justify-between transition-all ${selected === m.id ? "border-primary glow-ring-orange" : "border-border"}`}>
          <div className="flex items-center gap-2">
            {selected === m.id && <CheckCircle className="w-5 h-5 text-primary" />}
          </div>
          <div className="flex items-center gap-3">
            <div><p className="text-sm text-foreground font-medium">{m.label}</p><p className="text-xs text-muted-foreground">{m.desc}</p></div>
            <div className={`w-10 h-10 rounded-full bg-secondary flex items-center justify-center`}>
              {m.id === "paypal" ? (
                <span className="font-bold text-blue-500 text-xs">PP</span>
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
