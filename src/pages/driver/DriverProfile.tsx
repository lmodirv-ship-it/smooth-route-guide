import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User, Star, Phone, Mail, MapPin, Car, Shield, Edit2, Camera,
  ChevronLeft, ArrowRight, LogOut, Loader2, TrendingUp, Wallet,
  Percent, Clock, Route, FileText, Package, CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLogout } from "@/hooks/useLogout";
import { driverNetEarnings, COMMISSION_RATE } from "@/lib/pricing";


const DriverProfile = () => {
  const navigate = useNavigate();
  const logout = useLogout();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    name: "", phone: "", email: "", rating: 0, trips: 0,
    license: "", status: "", avatarUrl: "", driverType: "ride", driverCode: "",
  });
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "" });
  const [stats, setStats] = useState({
    todayTrips: 0, todayEarnings: 0, totalKm: 0, totalTrips: 0, grossEarnings: 0,
  });

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profRes, driverRes, tripsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("drivers").select("id, rating, status, license_no, driver_type, driver_code").eq("user_id", user.id).maybeSingle(),
        supabase.from("ride_requests").select("id, price, distance, created_at")
          .eq("driver_id", user.id).eq("status", "completed"),
      ]);

      const p = {
        name: profRes.data?.name || "",
        phone: profRes.data?.phone || "",
        email: profRes.data?.email || "",
        rating: Number(driverRes.data?.rating) || 0,
        trips: tripsRes.data?.length || 0,
        license: driverRes.data?.license_no || "",
        status: driverRes.data?.status || "inactive",
        avatarUrl: profRes.data?.avatar_url || "",
        driverType: driverRes.data?.driver_type || "ride",
        driverCode: driverRes.data?.driver_code || "",
      };
      setProfile(p);
      setEditForm({ name: p.name, phone: p.phone, email: p.email });

      // Calculate stats
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayRides = tripsRes.data?.filter(
        (r) => new Date(r.created_at) >= todayStart
      ) || [];
      const todayGross = todayRides.reduce((s, r) => s + (Number(r.price) || 0), 0);
      const totalGross = tripsRes.data?.reduce((s, r) => s + (Number(r.price) || 0), 0) || 0;
      const totalKm = tripsRes.data?.reduce((s, r) => s + (Number(r.distance) || 0), 0) || 0;

      setStats({
        todayTrips: todayRides.length,
        todayEarnings: driverNetEarnings(todayGross),
        totalKm: Math.round(totalKm),
        totalTrips: tripsRes.data?.length || 0,
        grossEarnings: driverNetEarnings(totalGross),
      });

      setLoading(false);
    };
    fetchAll();
  }, []);

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({
      name: editForm.name, phone: editForm.phone, email: editForm.email,
    }).eq("id", user.id);
    setProfile((p) => ({ ...p, ...editForm }));
    setEditing(false);
    toast({ title: "تم تحديث الملف الشخصي" });
  };

  const menuItems = [
    { icon: Car, label: "معلومات السيارة", path: "/driver/car-info", color: "text-primary" },
    { icon: Shield, label: "الوثائق", path: "/driver/documents", color: "text-info" },
    { icon: Star, label: "التقييمات", path: "/driver/history", color: "text-warning" },
    { icon: MapPin, label: "حالة السائق", path: "/driver/status", color: "text-success" },
    { icon: Package, label: "الاشتراك والباقات", path: "/driver/subscription", color: "text-amber-400" },
    { icon: CreditCard, label: "طرق الدفع", path: "/driver/wallet", color: "text-blue-400" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-dark pb-20" dir="rtl">
      {/* Header */}
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate("/driver")}>
          <ArrowRight className="w-5 h-5 text-muted-foreground" />
        </button>
        <span className="font-bold text-foreground">الملف الشخصي</span>
        <button onClick={() => setEditing(!editing)}>
          <Edit2 className="w-5 h-5 text-primary" />
        </button>
      </div>

      {/* Avatar & Name */}
      <div className="flex flex-col items-center pt-6 px-4">
        <div className="relative">
          <Avatar className="w-24 h-24 border-3 border-primary/30 shadow-lg shadow-primary/20">
            <AvatarImage src={profile.avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
              {profile.name?.charAt(0)?.toUpperCase() || "S"}
            </AvatarFallback>
          </Avatar>
          <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-black ${
            profile.status === "active" ? "bg-emerald-400" : "bg-zinc-500"
          }`} />
        </div>
        <h2 className="text-xl font-bold text-foreground mt-3">{profile.name || "سائق"}</h2>
        {profile.driverCode && (
          <span className="mt-1 text-xs font-mono px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            {profile.driverCode}
          </span>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span className={`text-[11px] px-3 py-1 rounded-full ${
            profile.status === "active"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
              : "bg-muted text-muted-foreground border border-border"
          }`}>
            {profile.status === "active" ? "نشط" : "غير نشط"}
          </span>
          <span className="text-[11px] px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            {profile.driverType === "delivery" ? "توصيل" : profile.driverType === "both" ? "ركاب + توصيل" : "نقل ركاب"}
          </span>
          {profile.rating > 0 && (
            <span className="text-[11px] px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400" /> {profile.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-4 mt-5">
        <div className="grid grid-cols-2 gap-2">
          <StatBox icon={TrendingUp} label="رحلات اليوم" value={`${stats.todayTrips}`} color="text-emerald-400" />
          <StatBox icon={Wallet} label="أرباح اليوم" value={`${stats.todayEarnings} DH`} color="text-primary" />
          <StatBox icon={Route} label="إجمالي الكيلومترات" value={`${stats.totalKm} كم`} color="text-blue-400" />
          <StatBox icon={Percent} label="عمولة المنصة" value={`${Math.round(COMMISSION_RATE * 100)}%`} color="text-destructive" />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <MiniStat label="إجمالي الرحلات" value={`${stats.totalTrips}`} />
          <MiniStat label="إجمالي الأرباح" value={`${stats.grossEarnings} DH`} />
          <MiniStat label="التقييم" value={profile.rating > 0 ? profile.rating.toFixed(1) : "—"} />
        </div>
      </div>

      {/* Contact Info */}
      <div className="px-4 mt-5 space-y-3">
        <div className="glass-card rounded-xl p-4 space-y-3">
          {[
            { icon: Phone, label: "الهاتف", value: profile.phone, key: "phone" },
            { icon: Mail, label: "البريد", value: profile.email, key: "email" },
            { icon: Shield, label: "رخصة القيادة", value: profile.license, key: null },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              {editing && item.key ? (
                <Input
                  value={editForm[item.key as keyof typeof editForm]}
                  onChange={(e) => setEditForm((f) => ({ ...f, [item.key!]: e.target.value }))}
                  className="w-48 h-8 bg-secondary border-border text-sm text-foreground"
                />
              ) : (
                <span className="text-sm text-muted-foreground">{item.value || "—"}</span>
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">{item.label}</span>
                <item.icon className="w-4 h-4 text-primary" />
              </div>
            </div>
          ))}
        </div>

        {editing && (
          <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11" onClick={handleSave}>
            حفظ التغييرات
          </Button>
        )}

        {/* Menu Items */}
        <div className="space-y-2 mt-4">
          {menuItems.map((item, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(item.path)}
              className="w-full glass-card rounded-xl p-4 flex items-center justify-between hover:border-primary/20 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-3">
                <span className="text-foreground text-sm">{item.label}</span>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
            </motion.button>
          ))}
        </div>

        <Button
          variant="outline"
          className="w-full mt-6 border-destructive/30 text-destructive hover:bg-destructive/10 rounded-xl"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 ml-2" /> تسجيل الخروج
        </Button>
      </div>

      <div className="px-4 pb-3">
        <Button onClick={() => navigate("/driver")} className="w-full gap-2 h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
          <MapPin className="w-4 h-4" />
          العودة إلى الخريطة
        </Button>
      </div>

      
    </div>
  );
};

/* ─── Sub-components ─── */

const StatBox = ({ icon: Icon, label, value, color }: {
  icon: typeof TrendingUp; label: string; value: string; color: string;
}) => (
  <div className="glass-card rounded-xl p-3 text-center">
    <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
    <p className={`text-base font-bold ${color}`}>{value}</p>
    <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
  </div>
);

const MiniStat = ({ label, value }: { label: string; value: string }) => (
  <div className="glass-card rounded-lg p-2 text-center">
    <p className="text-sm font-bold text-foreground">{value}</p>
    <p className="text-[9px] text-muted-foreground">{label}</p>
  </div>
);

export default DriverProfile;
