import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Navigation, Clock, Car, User, Star, CreditCard, Wallet, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import GoogleMapWrapper from "@/components/GoogleMap";

const ClientBooking = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"confirm" | "searching" | "matched">("confirm");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "wallet">("cash");

  const ride = {
    pickup: "حي المعاريف، الدار البيضاء",
    destination: "محطة القطار كازا فوياجور",
    distance: "8.5 كم",
    duration: "18 دقيقة",
    price: "35 DH",
  };

  const driver = {
    name: "أحمد الفاسي",
    rating: 4.9,
    car: "Toyota Camry أبيض",
    plate: "أ-12345",
    eta: "3 دقائق",
  };

  return (
    <div className="min-h-screen gradient-dark" dir="rtl">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate("/client")}><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
        <span className="font-bold text-foreground">
          {step === "confirm" ? "تأكيد الحجز" : step === "searching" ? "جاري البحث..." : "تم العثور على سائق"}
        </span>
        <div className="w-5" />
      </div>

      <div className="h-48 relative">
        <GoogleMapWrapper zoom={14} showMarker />
      </div>

      <div className="px-4 -mt-6 relative z-10">
        {step === "confirm" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="gradient-card rounded-2xl p-4 border border-border mb-3">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">نقطة الانطلاق</p>
                    <p className="text-sm text-foreground">{ride.pickup}</p>
                  </div>
                </div>
                <div className="mr-1.5 border-r border-dashed border-border h-4" />
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">الوجهة</p>
                    <p className="text-sm text-foreground">{ride.destination}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="gradient-card rounded-xl p-4 border border-border mb-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">المسافة</p>
                    <p className="text-sm font-bold text-foreground">{ride.distance}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">المدة</p>
                    <p className="text-sm font-bold text-foreground">{ride.duration}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">السعر</p>
                  <p className="text-2xl font-bold text-primary">{ride.price}</p>
                </div>
              </div>
            </div>

            <div className="gradient-card rounded-xl p-4 border border-border mb-4">
              <p className="text-sm text-foreground font-bold mb-3">طريقة الدفع</p>
              <div className="flex gap-3">
                {([["cash", "نقداً", CreditCard], ["wallet", "المحفظة", Wallet]] as const).map(([key, label, Icon]) => (
                  <button key={key} onClick={() => setPaymentMethod(key)}
                    className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${paymentMethod === key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={() => { setStep("searching"); setTimeout(() => setStep("matched"), 3000); }}
              className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-bold text-lg glow-primary">
              تأكيد الحجز
            </Button>
          </motion.div>
        )}

        {step === "searching" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="gradient-card rounded-2xl p-8 border border-border text-center">
            <div className="w-20 h-20 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground">جاري البحث عن سائق</h3>
            <p className="text-sm text-muted-foreground mt-2">يرجى الانتظار بينما نبحث عن أقرب سائق لك...</p>
            <Button variant="outline" onClick={() => setStep("confirm")} className="mt-4 border-destructive text-destructive">إلغاء</Button>
          </motion.div>
        )}

        {step === "matched" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="gradient-card rounded-2xl p-6 border border-primary/30 glow-ring-orange mb-4">
              <div className="flex items-center justify-center gap-2 mb-4">
                <CheckCircle className="w-6 h-6 text-success" />
                <span className="text-success font-bold">تم العثور على سائق!</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="icon-circle-orange w-16 h-16">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground">{driver.name}</h3>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-warning fill-warning" />
                    <span className="text-sm text-warning">{driver.rating}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{driver.car}</p>
                  <p className="text-xs text-muted-foreground">{driver.plate}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">الوصول خلال</p>
                  <p className="text-lg font-bold text-primary">{driver.eta}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-border rounded-xl" onClick={() => navigate("/client/tracking")}>
                <Navigation className="w-4 h-4 ml-2" /> تتبع الرحلة
              </Button>
              <Button variant="outline" className="flex-1 border-destructive text-destructive rounded-xl">إلغاء</Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ClientBooking;
