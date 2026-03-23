import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Camera, MapPin, Car, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/hn-driver-logo.png";

const roleDashboard: Record<string, string> = {
  driver: "/driver-panel",
  user: "/customer",
  admin: "/admin",
  agent: "/call-center",
};

const CompleteProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login", { replace: true }); return; }

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (profile) {
        setName(profile.name || "");
        setPhone(profile.phone || "");
      }
      setLoading(false);
    };
    load();
  }, [navigate]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "يرجى إدخال الاسم", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    await supabase.from("profiles").update({ name, phone }).eq("id", user.id);

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).limit(1);
    const role = roles?.[0]?.role || "user";

    toast({ title: "تم حفظ الملف الشخصي ✅" });
    navigate(roleDashboard[role] || "/client", { replace: true });
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-10 gradient-hero" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center mb-8">
        <img src={logo} alt="HN Driver" className="w-16 h-16 mb-3" />
        <h1 className="text-2xl font-bold text-foreground">إكمال الملف الشخصي</h1>
      </motion.div>

      <div className="w-full max-w-sm space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground block">الاسم الكامل</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="أدخل اسمك" className="h-12 rounded-xl" />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground block">رقم الهاتف</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06XXXXXXXX" type="tel" className="h-12 rounded-xl" />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-bold text-lg mt-4">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5 ml-2" />حفظ</>}
        </Button>
      </div>
    </div>
  );
};

export default CompleteProfile;
