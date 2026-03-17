import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Wallet, ArrowRight, TrendingUp, TrendingDown, CreditCard, DollarSign, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const DriverWallet = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"all" | "in" | "out">("all");

  const transactions = [
    { id: 1, type: "in", label: "رحلة #342", amount: "+45.00 DH", time: "اليوم 14:30", icon: ArrowDownLeft },
    { id: 2, type: "in", label: "رحلة #341", amount: "+32.00 DH", time: "اليوم 12:15", icon: ArrowDownLeft },
    { id: 3, type: "out", label: "سحب إلى البنك", amount: "-200.00 DH", time: "أمس 18:00", icon: ArrowUpRight },
    { id: 4, type: "in", label: "مكافأة أسبوعية", amount: "+50.00 DH", time: "أمس 09:00", icon: ArrowDownLeft },
    { id: 5, type: "in", label: "رحلة #340", amount: "+28.00 DH", time: "12/03 16:45", icon: ArrowDownLeft },
    { id: 6, type: "out", label: "عمولة المنصة", amount: "-15.00 DH", time: "12/03 16:45", icon: ArrowUpRight },
  ];

  const filtered = activeTab === "all" ? transactions : transactions.filter(t => t.type === activeTab);

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
          <div className="absolute bottom-0 right-0 w-24 h-24 rounded-full bg-white/5 translate-x-6 translate-y-6" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-5 h-5 text-primary-foreground/70" />
              <span className="text-primary-foreground/70 text-sm">الرصيد المتاح</span>
            </div>
            <p className="text-4xl font-bold text-primary-foreground">1,250.00 <span className="text-lg">DH</span></p>
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

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="gradient-card rounded-xl p-4 border border-border text-center">
            <TrendingUp className="w-5 h-5 text-success mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">الدخل هذا الشهر</p>
            <p className="text-lg font-bold text-foreground mt-1">3,750 DH</p>
          </div>
          <div className="gradient-card rounded-xl p-4 border border-border text-center">
            <TrendingDown className="w-5 h-5 text-destructive mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">المسحوبات</p>
            <p className="text-lg font-bold text-foreground mt-1">2,500 DH</p>
          </div>
        </div>

        <div className="flex gap-2 mt-6 mb-4">
          {([["all", "الكل"], ["in", "الدخل"], ["out", "المسحوبات"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === key ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="gradient-card rounded-xl p-4 border border-border flex items-center justify-between">
              <span className={`font-bold text-sm ${t.type === "in" ? "text-success" : "text-destructive"}`}>{t.amount}</span>
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm text-foreground">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.time}</p>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === "in" ? "bg-success/10" : "bg-destructive/10"}`}>
                  <t.icon className={`w-5 h-5 ${t.type === "in" ? "text-success" : "text-destructive"}`} />
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
