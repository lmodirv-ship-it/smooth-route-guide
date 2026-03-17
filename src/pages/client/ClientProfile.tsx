import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, ArrowRight, Phone, Mail, MapPin, Car, Wallet, Clock, Star, Heart, Settings, LogOut, ChevronLeft, HelpCircle, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const ClientProfile = () => {
  const navigate = useNavigate();

  const menuItems = [
    { icon: Clock, label: "سجل الرحلات", path: "/client/history", color: "text-primary" },
    { icon: Wallet, label: "المحفظة", path: "/client/wallet", color: "text-info" },
    { icon: Car, label: "طرق الدفع", path: "/client/payment", color: "text-success" },
    { icon: Heart, label: "الأماكن المفضلة", path: "#", color: "text-warning" },
    { icon: Bot, label: "المساعد الذكي", path: "/assistant", color: "text-primary" },
    { icon: HelpCircle, label: "الدعم والمساعدة", path: "/client/support", color: "text-info" },
    { icon: Settings, label: "الإعدادات", path: "#", color: "text-muted-foreground" },
  ];

  return (
    <div className="min-h-screen gradient-dark pb-24" dir="rtl">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate("/client")}><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
        <span className="font-bold text-foreground">حسابي</span>
        <div className="w-5" />
      </div>

      <div className="flex flex-col items-center pt-6 px-4">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[hsl(205,78%,56%)] to-[hsl(220,80%,40%)] flex items-center justify-center glow-blue">
          <User className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-xl font-bold text-foreground mt-3">محمد أحمد</h2>
        <p className="text-sm text-muted-foreground">عميل منذ يناير 2025</p>
        <div className="flex items-center gap-4 mt-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> +212 6XX-XXXX</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> m@hn.ma</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 px-4 mt-6">
        {[
          { label: "الرحلات", value: "24" },
          { label: "الرصيد", value: "350 DH" },
          { label: "التقييم", value: "4.9 ⭐" },
        ].map((s, i) => (
          <div key={i} className="gradient-card rounded-xl p-3 border border-border text-center">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-lg font-bold text-foreground mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="px-4 mt-6 space-y-2">
        {menuItems.map((item, i) => (
          <motion.button key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
            onClick={() => navigate(item.path)}
            className="w-full gradient-card rounded-xl p-4 border border-border flex items-center justify-between hover:border-primary/20 transition-colors">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            <div className="flex items-center gap-3">
              <span className="text-foreground text-sm">{item.label}</span>
              <item.icon className={`w-5 h-5 ${item.color}`} />
            </div>
          </motion.button>
        ))}

        <Button variant="outline"
          className="w-full mt-4 border-destructive/30 text-destructive hover:bg-destructive/10 rounded-xl"
          onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}>
          <LogOut className="w-4 h-4 ml-2" /> تسجيل الخروج
        </Button>
      </div>
    </div>
  );
};

export default ClientProfile;
