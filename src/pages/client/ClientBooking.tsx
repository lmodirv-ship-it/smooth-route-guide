import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CreditCard, Loader2, Navigation, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import LeafletMap from "@/components/LeafletMap";
import { useNearbyDrivers } from "@/hooks/useNearbyDrivers";
import { supabase } from "@/integrations/supabase/client";

interface RideDraft {
  pickup: string;
  destination: string;
  distance: string;
  duration: string;
  price: number;
  pickupLat?: number;
  pickupLng?: number;
  destLat?: number;
  destLng?: number;
}

const DEFAULT_RIDE: RideDraft = {
  pickup: "حي السواني، طنجة",
  destination: "محطة القطار طنجة المدينة",
  distance: "8.5 كم",
  duration: "18 دقيقة",
  price: 35,
};

const ClientBooking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "wallet">("cash");
  const { drivers: nearbyDrivers } = useNearbyDrivers();

  const ride = ((location.state as { ride?: RideDraft } | null)?.ride) ?? DEFAULT_RIDE;
  const priceLabel = ride.price > 0 ? `${ride.price} DH` : "يُحدد لاحقاً";

  const handleConfirmBooking = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "يجب تسجيل الدخول أولاً", variant: "destructive" });
      navigate("/login?role=client");
      return;
    }

    setLoading(true);
    try {
      const distanceNum = parseFloat(ride.distance) || 0;

      const { data, error } = await supabase.from("ride_requests").insert({
        user_id: user.id,
        pickup: ride.pickup,
        destination: ride.destination,
        pickup_lat: ride.pickupLat ?? null,
        pickup_lng: ride.pickupLng ?? null,
        destination_lat: ride.destLat ?? null,
        destination_lng: ride.destLng ?? null,
        distance: distanceNum,
        price: ride.price || 0,
        status: "pending",
      }).select("id").single();

      if (error) throw error;

      toast({ title: "تم إنشاء الطلب بنجاح ✅" });
      navigate(`/customer/tracking?id=${data.id}`);
    } catch (error: any) {
      toast({ title: "تعذر إتمام الطلب", description: error.message || "حاول مرة أخرى", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-dark" dir="rtl">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate("/customer")}><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
        <span className="font-bold text-foreground">تأكيد الطلب</span>
        <div className="w-5" />
      </div>

      <div className="h-48 relative">
        <LeafletMap zoom={14} showMarker nearbyDrivers={nearbyDrivers} />
      </div>

      <div className="px-4 -mt-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="gradient-card rounded-2xl p-4 border border-border mb-3">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-success" />
                <div className="flex-1"><p className="text-xs text-muted-foreground">نقطة الاستلام</p><p className="text-sm text-foreground">{ride.pickup}</p></div>
              </div>
              <div className="mr-1.5 border-r border-dashed border-border h-4" />
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <div className="flex-1"><p className="text-xs text-muted-foreground">الوجهة</p><p className="text-sm text-foreground">{ride.destination}</p></div>
              </div>
            </div>
          </div>

          <div className="gradient-card rounded-xl p-4 border border-border mb-3">
            <div className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="text-center"><p className="text-xs text-muted-foreground">المسافة</p><p className="text-sm font-bold text-foreground">{ride.distance}</p></div>
                <div className="text-center"><p className="text-xs text-muted-foreground">المدة</p><p className="text-sm font-bold text-foreground">{ride.duration}</p></div>
              </div>
              <div className="text-left"><p className="text-xs text-muted-foreground">السعر</p><p className="text-2xl font-bold text-primary">{priceLabel}</p></div>
            </div>
          </div>

          <div className="gradient-card rounded-xl p-4 border border-border mb-4">
            <p className="text-sm text-foreground font-bold mb-3">طريقة الدفع</p>
            <div className="flex gap-3">
              {([ ["cash", "نقداً", CreditCard], ["wallet", "المحفظة", Wallet]] as const).map(([key, label, Icon]) => (
                <button key={key} onClick={() => setPaymentMethod(key)}
                  className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${paymentMethod === key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                  <Icon className="w-4 h-4" /><span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleConfirmBooking} disabled={loading}
            className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-bold text-lg glow-primary">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Navigation className="w-5 h-5 ml-2" />تأكيد الطلب</>}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default ClientBooking;
