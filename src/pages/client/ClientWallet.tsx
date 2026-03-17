import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Wallet, ArrowRight, Plus, ArrowDownLeft, ArrowUpRight, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ClientWallet = () => {
  const navigate = useNavigate();
  const [showRecharge, setShowRecharge] = useState(false);

  const transactions = [
    { id: 1, type: "out", label: "رحلة إلى كازا فوياجور", amount: "-35.00 DH", time: "اليوم 14:30" },
    { id: 2, type: "in", label: "شحن المحفظة", amount: "+200.00 DH", time: "أمس 10:00" },
    { id: 3, type: "out", label: "رحلة إلى عين الشق", amount: "-28.00 DH", time: "أمس 08:30" },
    { id: 4, type: "in", label: "مكافأة ترحيبية", amount: "+50.00 DH", time: "12/03" },
  ];

  return (
    <div className="min-h-screen gradient-dark pb-24" dir="rtl">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)}><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
        <span className="font-bold text-foreground">المحفظة</span>
        <div className="w-5" />
      </div>

      <div className="px-4 mt-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[hsl(205,78%,56%)] to-[hsl(220,80%,40%)] rounded-2xl p-6 glow-blue relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 translate-x-10 -translate-y-10" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-5 h-5 text-white/70" />
              <span className="text-white/70 text-sm">الرصيد المتاح</span>
            </div>
            <p className="text-4xl font-bold text-white">350.00 <span className="text-lg">DH</span></p>
            <Button onClick={() => setShowRecharge(!showRecharge)} size="sm"
              className="mt-4 bg-white/20 text-white hover:bg-white/30 rounded-xl">
              <Plus className="w-4 h-4 ml-1" /> شحن المحفظة
            </Button>
          </div>
        </motion.div>

        {showRecharge && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            className="gradient-card rounded-xl p-4 border border-border mt-3">
            <p className="text-sm text-foreground font-bold mb-3">اختر المبلغ</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[50, 100, 200].map(amount => (
                <button key={amount} className="py-2 rounded-xl border border-border text-foreground hover:border-primary hover:text-primary transition-all text-sm font-medium">
                  {amount} DH
                </button>
              ))}
            </div>
            <Input placeholder="مبلغ آخر..." type="number" className="bg-secondary border-border rounded-xl text-right mb-3" />
            <Button className="w-full gradient-primary text-primary-foreground rounded-xl">شحن الآن</Button>
          </motion.div>
        )}

        <div className="gradient-card rounded-xl p-4 border border-border mt-3 flex items-center justify-between">
          <Button size="sm" variant="outline" className="border-primary text-primary rounded-lg text-xs">استخدام</Button>
          <div className="flex items-center gap-2">
            <div>
              <p className="text-sm text-foreground">كود ترويجي</p>
              <p className="text-xs text-muted-foreground">أدخل كود للحصول على رصيد</p>
            </div>
            <Gift className="w-5 h-5 text-primary" />
          </div>
        </div>

        <h3 className="text-foreground font-bold mt-6 mb-3">سجل العمليات</h3>
        <div className="space-y-2">
          {transactions.map((t) => (
            <div key={t.id} className="gradient-card rounded-xl p-4 border border-border flex items-center justify-between">
              <span className={`font-bold text-sm ${t.type === "in" ? "text-success" : "text-destructive"}`}>{t.amount}</span>
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm text-foreground">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.time}</p>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === "in" ? "bg-success/10" : "bg-destructive/10"}`}>
                  {t.type === "in" ? <ArrowDownLeft className="w-4 h-4 text-success" /> : <ArrowUpRight className="w-4 h-4 text-destructive" />}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClientWallet;
