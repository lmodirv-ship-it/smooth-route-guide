import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Wallet, ArrowRight, TrendingUp, TrendingDown, CreditCard, ArrowUpRight, ArrowDownLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/context";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import PaymentMethodSelector, { PaymentMethodType } from "@/components/PaymentMethodSelector";

const DriverWallet = () => {
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const [activeTab, setActiveTab] = useState<"all" | "in" | "out">("all");
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState(0);
  const [depositMethod, setDepositMethod] = useState<PaymentMethodType>("cash");
  const [freeTrial, setFreeTrial] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: wallet } = await supabase.from("wallet").select("balance").eq("user_id", user.id).maybeSingle();
      setBalance(wallet?.balance || 0);
      // Check free trial (3 days from registration)
      const { data: profile } = await supabase.from("profiles").select("created_at").eq("id", user.id).maybeSingle();
      if (profile) {
        const daysSinceReg = (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24);
        setFreeTrial(daysSinceReg <= 3);
      }
      const { data: driver } = await supabase.from("drivers").select("id").eq("user_id", user.id).maybeSingle();
      if (!driver) { setLoading(false); return; }
      const { data: trips } = await supabase.from("trips")
        .select("id, fare, created_at, start_location, end_location, status")
        .eq("driver_id", driver.id).eq("status", "completed")
        .order("created_at", { ascending: false }).limit(20);
      const txns = (trips || []).map(trip => ({
        id: trip.id, type: "in",
        label: `${t.driver.trip}: ${trip.start_location || "—"} → ${trip.end_location || "—"}`,
        amount: `+${trip.fare || 0} DH`,
        time: new Date(trip.created_at).toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }),
      }));
      setTransactions(txns);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = activeTab === "all" ? transactions : transactions.filter(t => t.type === activeTab);

  if (loading) return <div className="min-h-screen gradient-dark flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen gradient-dark pb-6" dir={dir}>
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate("/driver")}><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
        <span className="font-bold text-foreground">{t.driver.wallet}</span>
        <div className="w-5" />
      </div>

      <div className="px-4 mt-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="gradient-primary rounded-2xl p-6 glow-primary relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 rounded-full bg-white/5 -translate-x-10 -translate-y-10" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-5 h-5 text-primary-foreground/70" />
              <span className="text-primary-foreground/70 text-sm">{t.driver.availableBalance}</span>
            </div>
            <p className="text-4xl font-bold text-primary-foreground">{balance.toFixed(2)} <span className="text-lg">DH</span></p>
            <div className="flex gap-3 mt-4">
              <Button size="sm" className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 rounded-xl flex-1">
                <ArrowUpRight className="w-4 h-4 ml-1" /> {t.driver.withdraw}
              </Button>
              <Button size="sm" className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 rounded-xl flex-1"
                onClick={() => setShowDeposit(!showDeposit)}>
                <CreditCard className="w-4 h-4 ml-1" /> {t.driver.deposit}
              </Button>
            </div>
          </div>
        </motion.div>

        {freeTrial && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 mt-3 text-center">
            <span className="text-green-400 text-sm font-bold">🎉 أنت في فترة تجريبية مجانية (3 أيام) — استمتع بالخدمة!</span>
          </div>
        )}

        {showDeposit && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="glass-card rounded-xl p-4 mt-3">
            <p className="text-sm text-foreground font-bold mb-3">اختر مبلغ الإيداع</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[50, 100, 200].map(a => (
                <button key={a} onClick={() => setDepositAmount(a)}
                  className={`py-2 rounded-xl border text-sm font-medium transition-all ${depositAmount === a ? "border-primary text-primary bg-primary/10" : "border-border text-foreground"}`}>
                  {a} DH
                </button>
              ))}
            </div>
            <Input placeholder="مبلغ آخر" type="number" value={depositAmount || ""} onChange={e => setDepositAmount(Number(e.target.value))}
              className="bg-secondary border-border rounded-xl mb-3" />
            <p className="text-sm text-foreground font-bold mb-2">طريقة الدفع</p>
            <PaymentMethodSelector selected={depositMethod} onChange={setDepositMethod} walletBalance={balance} compact />
            <Button className="w-full gradient-primary text-primary-foreground rounded-xl" onClick={async () => {
              if (!depositAmount || depositAmount <= 0) { toast.error("اختر مبلغاً"); return; }
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;
              await supabase.from("wallet_recharge_requests").insert({ user_id: user.id, amount: depositAmount });
              await supabase.from("payment_transactions").insert({
                user_id: user.id,
                amount: depositAmount,
                currency: "MAD",
                transaction_type: "topup",
                payment_method: "cash",
                provider: "cash",
                status: "pending",
                reference_type: "wallet_topup",
              });
              toast.success("تم إرسال طلب الإيداع — سيتواصل معك فريق الدعم");
              setShowDeposit(false);
            }}>إرسال طلب الإيداع</Button>
          </motion.div>
        )}

        <div className="flex gap-2 mt-6 mb-4">
          {([["all", t.driver.allFilter], ["in", t.driver.incomeFilter], ["out", t.driver.withdrawalsFilter]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key as any)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === key ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">{t.driver.noTransactions}</p>}
          {filtered.map((tx, i) => (
            <motion.div key={tx.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="glass-card rounded-xl p-4 flex items-center justify-between">
              <span className={`font-bold text-sm ${tx.type === "in" ? "text-success" : "text-destructive"}`}>{tx.amount}</span>
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm text-foreground truncate max-w-[200px]">{tx.label}</p>
                  <p className="text-xs text-muted-foreground">{tx.time}</p>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === "in" ? "bg-success/10" : "bg-destructive/10"}`}>
                  {tx.type === "in" ? <ArrowDownLeft className="w-5 h-5 text-success" /> : <ArrowUpRight className="w-5 h-5 text-destructive" />}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DriverWallet;
