import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Navigation, Clock, Car, User, Star, CreditCard, Wallet, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import GoogleMapWrapper from "@/components/GoogleMap";
import { supabase } from "@/integrations/supabase/client";
import { useNearbyDrivers } from "@/hooks/useNearbyDrivers";

const ClientBooking = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"confirm" | "searching" | "matched">("confirm");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "wallet">("cash");
  const [matchedDriver, setMatchedDriver] = useState<any>(null);
  const { drivers: nearbyDrivers } = useNearbyDrivers();

  // These would come from navigation state in a real app
  const ride = {
    pickup: "حي المعاريف، الدار البيضاء",
    destination: "محطة القطار كازا فوياجور",
    distance: "8.5 كم",
    duration: "18 دقيقة",
    price: 35,
  };

  const handleConfirmBooking = async () => {
    setStep("searching");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast({ title: "يجب تسجيل الدخول", variant: "destructive" }); setStep("confirm"); return; }

    // Create ride request
    const { data: request, error } = await supabase.from("ride_requests").insert({
      user_id: user.id,
      pickup: ride.pickup,
      destination: ride.destination,
      price: ride.price,
      status: "pending",
    }).select().single();

    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); setStep("confirm"); return; }

    // Listen for acceptance
    const ch = supabase.channel(`booking-${request.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "ride_requests", filter: `id=eq.${request.id}` }, async (payload) => {
        if (payload.new.status === "accepted") {
          // Find driver info from the trip
          const { data: trip } = await supabase.from("trips").select("driver_id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
          if (trip?.driver_id) {
            const { data: driver } = await supabase.from("drivers").select("id, user_id, rating").eq("id", trip.driver_id).maybeSingle() as any;
            if (driver) {
              const { data: prof } = await supabase.from("profiles").select("name").eq("id", driver.user_id).maybeSingle();
              const { data: vehicle } = await supabase.from("vehicles").select("brand, model, plate_no, color").eq("driver_id", driver.id).maybeSingle();
              setMatchedDriver({
                name: prof?.name || "سائق",
                rating: driver.rating || 0,
                car: vehicle ? `${vehicle.brand} ${vehicle.model} ${vehicle.color || ""}` : "—",
                plate: vehicle?.plate_no || "—",
                eta: "3 دقائق",
              });
            }
          }
          setStep("matched");
          supabase.removeChannel(ch);
        }
      }).subscribe();

    // Fallback timeout - simulate match after 5s if no real driver responds
    setTimeout(() => {
      if (step === "searching") {
        setMatchedDriver({ name: "سائق متاح", rating: 4.5, car: "—", plate: "—", eta: "5 دقائق" });
        setStep("matched");
        supabase.removeChannel(ch);
      }
    }, 5000);
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
        <GoogleMapWrapper zoom={14} showMarker nearbyDrivers={nearbyDrivers} />
      </div>

      <div className="px-4 -mt-6 relative z-10">
        {step === "confirm" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="gradient-card rounded-2xl p-4 border border-border mb-3">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <div className="flex-1"><p className="text-xs text-muted-foreground">نقطة الانطلاق</p><p className="text-sm text-foreground">{ride.pickup}</p></div>
                </div>
                <div className="mr-1.5 border-r border-dashed border-border h-4" />
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <div className="flex-1"><p className="text-xs text-muted-foreground">الوجهة</p><p className="text-sm text-foreground">{ride.destination}</p></div>
                </div>
              </div>
            </div>

            <div className="gradient-card rounded-xl p-4 border border-border mb-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="text-center"><p className="text-xs text-muted-foreground">المسافة</p><p className="text-sm font-bold text-foreground">{ride.distance}</p></div>
                  <div className="text-center"><p className="text-xs text-muted-foreground">المدة</p><p className="text-sm font-bold text-foreground">{ride.duration}</p></div>
                </div>
                <div className="text-left"><p className="text-xs text-muted-foreground">السعر</p><p className="text-2xl font-bold text-primary">{ride.price} DH</p></div>
              </div>
            </div>

            <div className="gradient-card rounded-xl p-4 border border-border mb-4">
              <p className="text-sm text-foreground font-bold mb-3">طريقة الدفع</p>
              <div className="flex gap-3">
                {([["cash", "نقداً", CreditCard], ["wallet", "المحفظة", Wallet]] as const).map(([key, label, Icon]) => (
                  <button key={key} onClick={() => setPaymentMethod(key)}
                    className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${paymentMethod === key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                    <Icon className="w-4 h-4" /><span className="text-sm">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={handleConfirmBooking}
              className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-bold text-lg glow-primary">
              تأكيد الحجز
            </Button>
          </motion.div>
        )}

        {step === "searching" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="gradient-card rounded-2xl p-8 border border-border text-center">
            <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground">جاري البحث عن سائق</h3>
            <p className="text-sm text-muted-foreground mt-2">يرجى الانتظار...</p>
          </motion.div>
        )}

        {step === "matched" && matchedDriver && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="gradient-card rounded-2xl p-6 border border-primary/30 glow-ring-orange mb-4">
              <div className="flex items-center justify-center gap-2 mb-4">
                <CheckCircle className="w-6 h-6 text-success" /><span className="text-success font-bold">تم العثور على سائق!</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="icon-circle-orange w-16 h-16"><User className="w-8 h-8 text-primary" /></div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground">{matchedDriver.name}</h3>
                  <div className="flex items-center gap-1"><Star className="w-4 h-4 text-warning fill-warning" /><span className="text-sm text-warning">{matchedDriver.rating}</span></div>
                  <p className="text-sm text-muted-foreground">{matchedDriver.car}</p>
                  <p className="text-xs text-muted-foreground">{matchedDriver.plate}</p>
                </div>
                <div className="text-center"><p className="text-xs text-muted-foreground">الوصول خلال</p><p className="text-lg font-bold text-primary">{matchedDriver.eta}</p></div>
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
