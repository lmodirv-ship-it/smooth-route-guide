import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/context";
import PaymentMethodSelector, { PaymentMethodType } from "@/components/PaymentMethodSelector";

const ClientPayment = () => {
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const [defaultMethod, setDefaultMethod] = useState<PaymentMethodType>("cash");
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: wallet } = await supabase.from("wallet").select("balance").eq("user_id", user.id).maybeSingle();
      setBalance(wallet?.balance || 0);

      // Load saved default method
      const { data: methods } = await supabase.from("payment_methods")
        .select("method_type").eq("user_id", user.id).eq("is_default", true).maybeSingle();
      if (methods) setDefaultMethod(methods.method_type as PaymentMethodType);

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
    fetchData();
  }, []);

  const handleMethodChange = async (method: PaymentMethodType) => {
    setDefaultMethod(method);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Reset all defaults, then set new one
    await supabase.from("payment_methods").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("payment_methods").upsert({
      user_id: user.id,
      method_type: method,
      provider: method,
      label: method === "cash" ? "نقد" : method === "wallet" ? "محفظة" : "PayPal",
      is_default: true,
    }, { onConflict: "user_id,method_type" }).select();
  };

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
        <PaymentMethodSelector selected={defaultMethod} onChange={handleMethodChange} walletBalance={balance} />

        <h3 className="text-foreground font-bold mt-6 mb-3">{t.customer.paymentHistoryTitle}</h3>
        <div className="space-y-2">
          {payments.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">{t.customer.noPayments}</p>}
          {payments.map(h => (
            <motion.div key={h.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
              className="glass-card rounded-xl p-4 flex items-center justify-between">
              <span className="text-primary font-bold">{h.amount}</span>
              <div>
                <p className="text-sm text-foreground truncate max-w-[200px]">{h.trip}</p>
                <p className="text-xs text-muted-foreground">{h.date} • {h.method}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClientPayment;
