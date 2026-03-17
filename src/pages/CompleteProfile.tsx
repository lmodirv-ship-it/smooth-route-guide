import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Camera, MapPin, Car, Loader2, CheckCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { updateDocument, COLLECTIONS, type UserRole } from "@/lib/firebaseServices";
import logo from "@/assets/hn-driver-logo.png";

const roleDashboard: Record<UserRole, string> = {
  driver: "/driver",
  client: "/client",
  delivery: "/delivery",
  call_center: "/call-center",
  admin: "/admin",
};

const CompleteProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<UserRole>("client");
  const [uid, setUid] = useState("");

  const [city, setCity] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/welcome", { replace: true });
        return;
      }
      setUid(user.uid);
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data.profileCompleted === true) {
            navigate(roleDashboard[(data.role as UserRole) || "client"], { replace: true });
            return;
          }
          setRole((data.role as UserRole) || "client");
          setCity(data.city || "");
          setAvatarUrl(data.photoURL || "");
        }
      } catch {
        // ignore
      }
      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city) {
      toast({ title: "يرجى إدخال المدينة", variant: "destructive" });
      return;
    }
    if (role === "driver" && (!vehicleType || !plateNumber || !licenseNumber)) {
      toast({ title: "يرجى إدخال بيانات المركبة ورقم الرخصة", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Update users collection
      await updateDocument(COLLECTIONS.users, uid, {
        city,
        photoURL: avatarUrl,
        profileCompleted: true,
      });

      // Update role-specific collection
      if (role === "driver") {
        await updateDocument(COLLECTIONS.drivers, uid, {
          city,
          vehicleType,
          vehiclePlate: plateNumber,
          licenseNumber,
        });
      } else if (role === "client") {
        await updateDocument(COLLECTIONS.clients, uid, { city });
      } else if (role === "delivery") {
        await updateDocument(COLLECTIONS.delivery_agents, uid, {
          city,
          vehicleType,
        });
      }

      toast({ title: "تم إكمال الملف الشخصي ✅" });
      navigate(roleDashboard[role], { replace: true });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col px-6 py-8 gradient-hero particles-bg relative" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mb-8 relative z-10"
      >
        <img src={logo} alt="HN" className="w-16 h-16 mb-3" />
        <h1 className="text-2xl font-bold text-foreground">إكمال الملف الشخصي</h1>
        <p className="text-sm text-muted-foreground mt-1">أكمل بياناتك للمتابعة</p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 w-full max-w-sm mx-auto relative z-10"
      >
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground block">المدينة</label>
          <div className="relative">
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="مثال: طنجة"
              className="bg-secondary/80 border-border text-foreground placeholder:text-muted-foreground h-12 rounded-xl pr-11" />
            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground block">رابط الصورة الشخصية (اختياري)</label>
          <div className="relative">
            <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..."
              className="bg-secondary/80 border-border text-foreground placeholder:text-muted-foreground h-12 rounded-xl pr-11" />
            <Camera className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        {(role === "driver" || role === "delivery") && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="flex flex-col gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground block">نوع المركبة</label>
              <div className="relative">
                <Input value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} placeholder="مثال: سيارة صغيرة"
                  className="bg-secondary/80 border-border text-foreground placeholder:text-muted-foreground h-12 rounded-xl pr-11" />
                <Car className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              </div>
            </div>
            {role === "driver" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground block">رقم اللوحة</label>
                  <Input value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} placeholder="مثال: 12345-أ-67"
                    className="bg-secondary/80 border-border text-foreground placeholder:text-muted-foreground h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground block">رقم الرخصة</label>
                  <div className="relative">
                    <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="رقم رخصة القيادة"
                      className="bg-secondary/80 border-border text-foreground placeholder:text-muted-foreground h-12 rounded-xl pr-11" />
                    <FileText className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        <Button type="submit" disabled={saving}
          className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-bold text-lg mt-4 hover:opacity-90 transition-opacity glow-primary">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <span className="flex items-center gap-2"><CheckCircle className="w-5 h-5" />حفظ والمتابعة</span>
          )}
        </Button>
      </motion.form>
    </div>
  );
};

export default CompleteProfile;
