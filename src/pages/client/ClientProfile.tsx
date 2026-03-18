import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, ArrowRight, Phone, Mail, Car, Wallet, Clock, Star, Heart, Settings, LogOut, ChevronLeft, HelpCircle, Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/firestoreClient";
import { useFirebaseLogout } from "@/hooks/useFirebaseAuth";

const ClientProfile = () => {
  const navigate = useNavigate();
  const logout = useFirebaseLogout();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({ name: "", email: "", phone: "", tripCount: 0, balance: 0 });

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profRes, tripsRes, walletRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("trips").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("wallet").select("balance").eq("user_id", user.id).maybeSingle(),
      ]);

      setProfile({
        name: profRes.data?.name || "",
        email: profRes.data?.email || "",
        phone: profRes.data?.phone || "",
        tripCount: tripsRes.count || 0,
        balance: walletRes.data?.balance || 0,
      });
      setLoading(false);
    };
    fetch();
  }, []);

  const menuItems = [
    { icon: Clock, label: "سجل الرحلات", path: "/client/history", color: "text-primary" },
    { icon: Wallet, label: "المحفظة", path: "/client/wallet", color: "text-info" },
    { icon: Car, label: "طرق الدفع", path: "/client/payment", color: "text-success" },
    { icon: Bot, label: "المساعد الذكي", path: "/assistant", color: "text-primary" },
    { icon: HelpCircle, label: "الدعم والمساعدة", path: "/client/support", color: "text-info" },
  ];

  if (loading) return <div className="min-h-screen gradient-dark flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

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
        <h2 className="text-xl font-bold text-foreground mt-3">{profile.name || "مستخدم"}</h2>
        <div className="flex items-center gap-4 mt-2">
          {profile.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {profile.phone}</span>}
          {profile.email && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> {profile.email}</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 mt-6">
        <div className="gradient-card rounded-xl p-3 border border-border text-center">
          <p className="text-xs text-muted-foreground">الرحلات</p>
          <p className="text-lg font-bold text-foreground mt-1">{profile.tripCount}</p>
        </div>
        <div className="gradient-card rounded-xl p-3 border border-border text-center">
          <p className="text-xs text-muted-foreground">الرصيد</p>
          <p className="text-lg font-bold text-foreground mt-1">{profile.balance} DH</p>
        </div>
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

        <Button variant="outline" className="w-full mt-4 border-destructive/30 text-destructive hover:bg-destructive/10 rounded-xl"
          onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}>
          <LogOut className="w-4 h-4 ml-2" /> تسجيل الخروج
        </Button>
      </div>
    </div>
  );
};

export default ClientProfile;
