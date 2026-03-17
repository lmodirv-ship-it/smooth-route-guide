import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CreditCard, Wallet, Banknote, Plus, CheckCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const ClientPayment = () => {
  const navigate = useNavigate();
  const [defaultMethod, setDefaultMethod] = useState("cash");

  const methods = [
    { id: "cash", label: "نقداً", icon: Banknote, desc: "الدفع نقداً عند الوصول", color: "text-success" },
    { id: "wallet", label: "المحفظة", icon: Wallet, desc: "الرصيد: 350 DH", color: "text-primary" },
    { id: "card1", label: "Visa •••• 4532", icon: CreditCard, desc: "تنتهي 12/2027", color: "text-info" },
  ];

  const history = [
    { id: 1, amount: "35 DH", method: "نقداً", date: "اليوم 14:30", trip: "المعاريف → كازا فوياجور" },
    { id: 2, amount: "28 DH", method: "المحفظة", date: "أمس 10:15", trip: "حي الحسني → عين الشق" },
    { id: 3, amount: "52 DH", method: "Visa", date: "14/03 18:00", trip: "المطار → مراكش" },
  ];

  return (
    <div className="min-h-screen gradient-dark pb-24" dir="rtl">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)}><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
        <span className="font-bold text-foreground">طرق الدفع</span>
        <div className="w-5" />
      </div>

      <div className="px-4 mt-4">
        <h3 className="text-foreground font-bold mb-3">طريقة الدفع الافتراضية</h3>
        <div className="space-y-2">
          {methods.map((m, i) => (
            <motion.button key={m.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => setDefaultMethod(m.id)}
              className={`w-full gradient-card rounded-xl p-4 border flex items-center justify-between transition-all ${defaultMethod === m.id ? "border-primary glow-ring-orange" : "border-border"}`}>
              <div className="flex items-center gap-2">
                {defaultMethod === m.id && <CheckCircle className="w-5 h-5 text-primary" />}
                {m.id.startsWith("card") && <Trash2 className="w-4 h-4 text-destructive/50 hover:text-destructive" />}
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm text-foreground font-medium">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.desc}</p>
                </div>
                <div className={`w-10 h-10 rounded-full bg-secondary flex items-center justify-center`}>
                  <m.icon className={`w-5 h-5 ${m.color}`} />
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        <Button variant="outline" className="w-full mt-3 border-dashed border-border text-muted-foreground rounded-xl">
          <Plus className="w-4 h-4 ml-2" /> إضافة بطاقة جديدة
        </Button>

        <h3 className="text-foreground font-bold mt-6 mb-3">سجل المدفوعات</h3>
        <div className="space-y-2">
          {history.map((h) => (
            <div key={h.id} className="gradient-card rounded-xl p-4 border border-border flex items-center justify-between">
              <span className="text-primary font-bold">{h.amount}</span>
              <div className="text-right">
                <p className="text-sm text-foreground">{h.trip}</p>
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
