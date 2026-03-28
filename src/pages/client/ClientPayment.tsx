import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CreditCard, Wallet, Banknote, Plus, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/context";

const ClientPayment = () => {
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const [defaultMethod, setDefaultMethod] = useState("cash");
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: wallet } = await supabase.from("wallet").select("balance").eq("user_id", user.id).maybeSingle();
      setBalance(wallet?.balance || 0);
      const { data: trips } = await supabase.from("trips")
        .select("id, fare, created_at, start_location, end_location")
        .eq("user_id", user.id).eq("status", "completed")
        .order("created_at", { ascending: false }).limit(10);
      setPayments((trips || []).map(trip => ({
        id: trip.id,
        amount: `${trip.fare || 0} DH`,
        method: t.customer.cashLabel,
        date: new Date(trip.created_at).toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }),
        trip: `${trip.start_location || "—"} → ${trip.end_location || "—"}`,
      })));
      setLoading(false);
    };
    fetch();
  }, []);

  const methods = [
    { id: "cash", label: t.customer.cashLabel, icon: Banknote, desc: t.customer.payOnArrival, color: "text-success" },
    { id: "wallet", label: t.customer.walletLabel, icon: Wallet, desc: `${t.customer.availableBalance}: ${balance} DH`, color: "text-primary" },
  ];

  if (loading) return <div className="min-h-screen gradient-dark flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen gradient-dark pb-24" dir={dir}>
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)}><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
        <span className="font-bold text-foreground">{t.customer.paymentMethodsPageTitle}</span>
        <div className="w-5" />
      </div>

      <div className="px-4 mt-4">
        <h3 className="text-foreground font-bold mb-3">{t.customer.defaultPayment}</h3>
        <div className="space-y-2">
          {methods.map((m, i) => (
            <motion.button key={m.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => setDefaultMethod(m.id)}
              className={`w-full gradient-card rounded-xl p-4 border flex items-center justify-between transition-all ${defaultMethod === m.id ? "border-primary glow-ring-orange" : "border-border"}`}>
              <div className="flex items-center gap-2">
                {defaultMethod === m.id && <CheckCircle className="w-5 h-5 text-primary" />}
              </div>
              <div className="flex items-center gap-3">
                <div><p className="text-sm text-foreground font-medium">{m.label}</p><p className="text-xs text-muted-foreground">{m.desc}</p></div>
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"><m.icon className={`w-5 h-5 ${m.color}`} /></div>
              </div>
            </motion.button>
          ))}
        </div>

        <h3 className="text-foreground font-bold mt-6 mb-3">{t.customer.paymentHistoryTitle}</h3>
        <div className="space-y-2">
          {payments.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">{t.customer.noPayments}</p>}
          {payments.map(h => (
            <div key={h.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
              <span className="text-primary font-bold">{h.amount}</span>
              <div>
                <p className="text-sm text-foreground truncate max-w-[200px]">{h.trip}</p>
                <p className="text-xs text-muted-foreground">{h.date} • {h.method}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClientPayment;
