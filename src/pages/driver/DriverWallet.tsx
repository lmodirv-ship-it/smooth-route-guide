import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Wallet, ArrowRight, TrendingUp, TrendingDown, CreditCard, ArrowUpRight, ArrowDownLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/firestoreClient";

const DriverWallet = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"all" | "in" | "out">("all");
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Wallet balance
      const { data: wallet } = await supabase.from("wallet").select("balance").eq("user_id", user.id).maybeSingle();
      setBalance(wallet?.balance || 0);

      // Get driver id
      const { data: driver } = await supabase.from("drivers").select("id").eq("user_id", user.id).maybeSingle();
      if (!driver) { setLoading(false); return; }

      // Recent completed trips as transactions
      const { data: trips } = await supabase.from("trips")
        .select("id, fare, created_at, start_location, end_location, status")
        .eq("driver_id", driver.id).eq("status", "completed")
        .order("created_at", { ascending: false }).limit(20);

      const txns = (trips || []).map(t => ({
        id: t.id, type: "in",
        label: `رحلة: ${t.start_location || "—"} → ${t.end_location || "—"}`,
        amount: `+${t.fare || 0} DH`,
        time: new Date(t.created_at).toLocaleString("ar-SA", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }),
      }));
      setTransactions(txns);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = activeTab === "all" ? transactions : transactions.filter(t => t.type === activeTab);

  if (loading) return <div className="min-h-screen gradient-dark flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen gradient-dark pb-6" dir="rtl">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate("/driver")}><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
        <span className="font-bold text-foreground">المحفظة</span>
        <div className="w-5" />
      </div>

      <div className="px-4 mt-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="gradient-primary rounded-2xl p-6 glow-primary relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 rounded-full bg-white/5 -translate-x-10 -translate-y-10" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-5 h-5 text-primary-foreground/70" />
              <span className="text-primary-foreground/70 text-sm">الرصيد المتاح</span>
            </div>
            <p className="text-4xl font-bold text-primary-foreground">{balance.toFixed(2)} <span className="text-lg">DH</span></p>
            <div className="flex gap-3 mt-4">
              <Button size="sm" className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 rounded-xl flex-1">
                <ArrowUpRight className="w-4 h-4 ml-1" /> سحب
              </Button>
              <Button size="sm" className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 rounded-xl flex-1">
                <CreditCard className="w-4 h-4 ml-1" /> إيداع
              </Button>
            </div>
          </div>
        </motion.div>

        <div className="flex gap-2 mt-6 mb-4">
          {([["all", "الكل"], ["in", "الدخل"], ["out", "المسحوبات"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === key ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">لا توجد معاملات</p>}
          {filtered.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="gradient-card rounded-xl p-4 border border-border flex items-center justify-between">
              <span className={`font-bold text-sm ${t.type === "in" ? "text-success" : "text-destructive"}`}>{t.amount}</span>
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm text-foreground truncate max-w-[200px]">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.time}</p>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === "in" ? "bg-success/10" : "bg-destructive/10"}`}>
                  {t.type === "in" ? <ArrowDownLeft className="w-5 h-5 text-success" /> : <ArrowUpRight className="w-5 h-5 text-destructive" />}
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
