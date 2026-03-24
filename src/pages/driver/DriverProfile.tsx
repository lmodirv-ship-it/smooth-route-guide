import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Star, Phone, Mail, MapPin, Car, Shield, Edit2, Camera, ChevronLeft, ArrowRight, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLogout } from "@/hooks/useLogout";

const DriverProfile = () => {
  const navigate = useNavigate();
  const logout = useLogout();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({ name: "", phone: "", email: "", rating: 0, trips: 0, license: "", status: "" });
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "" });

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profRes, driverRes, tripsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("drivers").select("id, rating, status, license_no").eq("user_id", user.id).maybeSingle(),
        supabase.from("trips").select("id", { count: "exact", head: true }).eq("status", "completed"),
      ]);

      const p = {
        name: profRes.data?.name || "",
        phone: profRes.data?.phone || "",
        email: profRes.data?.email || "",
        rating: Number(driverRes.data?.rating) || 0,
        trips: tripsRes.count || 0,
        license: driverRes.data?.license_no || "",
        status: driverRes.data?.status || "inactive",
      };
      setProfile(p);
      setEditForm({ name: p.name, phone: p.phone, email: p.email });
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ name: editForm.name, phone: editForm.phone, email: editForm.email }).eq("id", user.id);
    setProfile(p => ({ ...p, ...editForm }));
    setEditing(false);
    toast({ title: "تم تحديث الملف الشخصي" });
  };

  const menuItems = [
    { icon: Car, label: "معلومات السيارة", path: "/driver/car-info", color: "text-primary" },
    { icon: Shield, label: "الوثائق", path: "/driver/documents", color: "text-info" },
    { icon: Star, label: "التقييمات", path: "/driver/history", color: "text-warning" },
    { icon: MapPin, label: "حالة السائق", path: "/driver/status", color: "text-success" },
  ];

  if (loading) return <div className="min-h-screen gradient-dark flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen gradient-dark pb-24" dir="rtl">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate("/driver")}><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
        <span className="font-bold text-foreground">الملف الشخصي</span>
        <button onClick={() => setEditing(!editing)}><Edit2 className="w-5 h-5 text-primary" /></button>
      </div>

      <div className="flex flex-col items-center pt-6 px-4">
        <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center glow-primary">
          <User className="w-10 h-10 text-primary-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground mt-3">{profile.name || "سائق"}</h2>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-xs px-3 py-1 rounded-full ${profile.status === "active" ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"}`}>
            {profile.status === "active" ? "نشط" : "غير نشط"}
          </span>
          {profile.rating > 0 && (
            <span className="text-xs bg-warning/10 text-warning px-3 py-1 rounded-full flex items-center gap-1">
              <Star className="w-3 h-3 fill-warning" /> {profile.rating.toFixed(1)}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">{profile.trips} رحلة</p>
      </div>

      <div className="px-4 mt-6 space-y-3">
        <div className="gradient-card rounded-xl p-4 border border-border space-y-3">
          {[
            { icon: Phone, label: "الهاتف", value: profile.phone, key: "phone" },
            { icon: Mail, label: "البريد", value: profile.email, key: "email" },
            { icon: Shield, label: "رخصة القيادة", value: profile.license, key: null },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              {editing && item.key ? (
                <Input value={editForm[item.key as keyof typeof editForm]} onChange={e => setEditForm(f => ({ ...f, [item.key!]: e.target.value }))}
                  className="w-48 h-8 bg-secondary border-border text-sm" />
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
          <Button className="w-full gradient-primary text-primary-foreground rounded-xl h-11" onClick={handleSave}>
            حفظ التغييرات
          </Button>
        )}

        <div className="space-y-2 mt-4">
          {menuItems.map((item, i) => (
            <motion.button key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => navigate(item.path)}
              className="w-full gradient-card rounded-xl p-4 border border-border flex items-center justify-between hover:border-primary/20 transition-colors">
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-3">
                <span className="text-foreground text-sm">{item.label}</span>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
            </motion.button>
          ))}
        </div>

        <Button variant="outline" className="w-full mt-6 border-destructive/30 text-destructive hover:bg-destructive/10 rounded-xl"
          onClick={logout}>
          <LogOut className="w-4 h-4 ml-2" /> تسجيل الخروج
        </Button>
      </div>
    </div>
  );
};

export default DriverProfile;
