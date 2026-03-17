import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Star, Phone, Mail, MapPin, Car, Shield, Edit2, Camera, ChevronLeft, ArrowRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/hn-driver-logo.png";

const DriverProfile = () => {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [profile] = useState({
    name: "أحمد محمد الفاسي",
    phone: "+212 6XX-XXXXXX",
    email: "ahmed@hndriver.ma",
    rating: 4.8,
    trips: 342,
    joined: "يناير 2025",
    address: "الدار البيضاء، المغرب",
    license: "AB-123456",
    status: "نشط",
  });

  const menuItems = [
    { icon: Car, label: "معلومات السيارة", path: "/driver/car-info", color: "text-primary" },
    { icon: Shield, label: "الوثائق", path: "/driver/documents", color: "text-info" },
    { icon: Star, label: "التقييمات", path: "/driver/history", color: "text-warning" },
    { icon: MapPin, label: "العناوين المحفوظة", path: "#", color: "text-success" },
  ];

  return (
    <div className="min-h-screen gradient-dark pb-24" dir="rtl">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate("/driver")}><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
        <span className="font-bold text-foreground">الملف الشخصي</span>
        <button onClick={() => setEditing(!editing)}><Edit2 className="w-5 h-5 text-primary" /></button>
      </div>

      <div className="flex flex-col items-center pt-6 px-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center glow-primary">
            <User className="w-10 h-10 text-primary-foreground" />
          </div>
          <button className="absolute bottom-0 left-0 w-8 h-8 rounded-full bg-info flex items-center justify-center border-2 border-background">
            <Camera className="w-4 h-4 text-white" />
          </button>
        </div>
        <h2 className="text-xl font-bold text-foreground mt-3">{profile.name}</h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs bg-success/10 text-success px-3 py-1 rounded-full">{profile.status}</span>
          <span className="text-xs bg-warning/10 text-warning px-3 py-1 rounded-full flex items-center gap-1">
            <Star className="w-3 h-3 fill-warning" /> {profile.rating}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{profile.trips} رحلة • انضم {profile.joined}</p>
      </div>

      <div className="px-4 mt-6 space-y-3">
        <div className="gradient-card rounded-xl p-4 border border-border space-y-3">
          {[
            { icon: Phone, label: "الهاتف", value: profile.phone },
            { icon: Mail, label: "البريد", value: profile.email },
            { icon: MapPin, label: "العنوان", value: profile.address },
            { icon: Shield, label: "رخصة القيادة", value: profile.license },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              {editing ? <Input defaultValue={item.value} className="w-48 h-8 bg-secondary border-border text-sm" /> : <span className="text-sm text-muted-foreground">{item.value}</span>}
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">{item.label}</span>
                <item.icon className="w-4 h-4 text-primary" />
              </div>
            </div>
          ))}
        </div>

        {editing && (
          <Button className="w-full gradient-primary text-primary-foreground rounded-xl h-11" onClick={() => setEditing(false)}>
            حفظ التغييرات
          </Button>
        )}

        <div className="space-y-2 mt-4">
          {menuItems.map((item, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(item.path)}
              className="w-full gradient-card rounded-xl p-4 border border-border flex items-center justify-between hover:border-primary/20 transition-colors"
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
          onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}
        >
          <LogOut className="w-4 h-4 ml-2" /> تسجيل الخروج
        </Button>
      </div>
    </div>
  );
};

export default DriverProfile;
