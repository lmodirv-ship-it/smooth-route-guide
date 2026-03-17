import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Navigation, Loader2, ChevronLeft, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import deliveryLogo from "@/assets/hn-delivery-logo.jpeg";

const CourierAddress = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const packageType = searchParams.get("type") || "";
  const packageSize = searchParams.get("size") || "";
  const packageWeight = searchParams.get("weight") || "0";
  const packageDesc = searchParams.get("description") || "";
  const packageFragile = searchParams.get("fragile") === "1";

  const [step, setStep] = useState<"pickup" | "delivery" | "contact" | "confirm">("pickup");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const estimatedPrice = (() => {
    if (!pickupLat || !deliveryLat) return 0;
    const R = 6371;
    const dLat = ((deliveryLat - pickupLat) * Math.PI) / 180;
    const dLon = ((deliveryLng! - pickupLng!) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos((pickupLat * Math.PI) / 180) * Math.cos((deliveryLat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const base = 5; // 5 DH base
    const perKm = 3; // 3 DH per km (Tangier pricing)
    const sizeMultiplier = packageSize === "xlarge" ? 2 : packageSize === "large" ? 1.5 : packageSize === "medium" ? 1.2 : 1;
    const fragileExtra = packageFragile ? 5 : 0;
    return Math.round((base + dist * perKm) * sizeMultiplier + fragileExtra);
  })();

  const useCurrentLocation = async () => {
    setGpsLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
      );
      setPickupLat(pos.coords.latitude);
      setPickupLng(pos.coords.longitude);
      setPickupAddress("موقعي الحالي (GPS)");
      toast({ title: "تم تحديد موقعك ✅" });
    } catch {
      toast({ title: "تعذر تحديد الموقع", variant: "destructive" });
    } finally {
      setGpsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!recipientName.trim() || !recipientPhone.trim()) {
      toast({ title: "يرجى إدخال بيانات المستلم", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "يرجى تسجيل الدخول", variant: "destructive" });
        navigate("/login?role=delivery");
        return;
      }

      const { error } = await supabase.from("delivery_orders").insert({
        user_id: user.id,
        category: "courier",
        store_name: `طرد: ${packageType}`,
        items: JSON.parse(JSON.stringify([{
          type: packageType,
          size: packageSize,
          weight: Number(packageWeight),
          description: packageDesc,
          fragile: packageFragile,
          recipient_name: recipientName,
          recipient_phone: recipientPhone,
        }])),
        pickup_address: pickupAddress,
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        delivery_address: deliveryAddress,
        delivery_lat: deliveryLat,
        delivery_lng: deliveryLng,
        estimated_price: estimatedPrice,
        status: "pending",
      });

      if (error) throw error;
      toast({ title: "تم إنشاء طلب التوصيل بنجاح ✅" });
      navigate("/delivery/courier/track");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = {
    pickup: "نقطة الاستلام",
    delivery: "نقطة التسليم",
    contact: "بيانات المستلم",
    confirm: "تأكيد الطلب",
  };
  const stepOrder: typeof step[] = ["pickup", "delivery", "contact", "confirm"];
  const currentIndex = stepOrder.indexOf(step);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/80 via-accent/60 to-primary/50 pt-6 pb-8 px-5 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4 relative z-10">
          <button
            onClick={() => currentIndex > 0 ? setStep(stepOrder[currentIndex - 1]) : navigate(-1)}
            className="p-2 rounded-xl bg-white/10 backdrop-blur-sm"
          >
            <ArrowRight className="w-5 h-5 text-primary-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <img src={deliveryLogo} alt="" className="w-8 h-8 rounded-full border border-white/30" />
            <h1 className="text-lg font-bold text-primary-foreground">{stepLabels[step]}</h1>
          </div>
          <div className="w-9" />
        </div>

        {/* Progress */}
        <div className="flex gap-1.5 relative z-10">
          {stepOrder.map((s, i) => (
            <div key={s} className={`flex-1 h-1 rounded-full transition-all ${
              i <= currentIndex ? "bg-white" : "bg-white/20"
            }`} />
          ))}
        </div>
      </div>

      <div className="px-5 mt-6 pb-32">
        {step === "pickup" && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-success" />
                </div>
                <h2 className="font-bold text-foreground">من أين يتم الاستلام؟</h2>
              </div>
              <PlacesAutocomplete
                value={pickupAddress}
                onChange={setPickupAddress}
                onPlaceSelected={(addr, lat, lng) => {
                  setPickupAddress(addr);
                  setPickupLat(lat);
                  setPickupLng(lng);
                }}
                placeholder="أدخل عنوان الاستلام..."
              />
            </div>

            <Button
              variant="outline"
              onClick={useCurrentLocation}
              disabled={gpsLoading}
              className="w-full h-12 rounded-xl border-border gap-2"
            >
              {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4 text-info" />}
              استخدام موقعي الحالي
            </Button>

            {pickupLat && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-success/5 border border-success/20 rounded-xl p-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-success" />
                <p className="text-xs text-success font-medium">تم تحديد الموقع بنجاح</p>
              </motion.div>
            )}
          </motion.div>
        )}

        {step === "delivery" && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-destructive" />
                </div>
                <h2 className="font-bold text-foreground">أين يتم التسليم؟</h2>
              </div>
              <PlacesAutocomplete
                value={deliveryAddress}
                onChange={setDeliveryAddress}
                onPlaceSelected={(addr, lat, lng) => {
                  setDeliveryAddress(addr);
                  setDeliveryLat(lat);
                  setDeliveryLng(lng);
                }}
                placeholder="أدخل عنوان التسليم..."
              />
            </div>

            {deliveryLat && pickupLat && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-2xl border border-primary/20 p-4">
                <p className="text-xs text-muted-foreground mb-1">التكلفة التقديرية</p>
                <p className="text-2xl font-bold text-primary">{estimatedPrice} د.ج</p>
              </motion.div>
            )}
          </motion.div>
        )}

        {step === "contact" && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <h2 className="font-bold text-foreground">بيانات المستلم</h2>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground block">اسم المستلم</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="الاسم الكامل"
                    maxLength={100}
                    className="bg-secondary/50 border-border h-12 rounded-xl pr-10 text-right"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground block">رقم الهاتف</label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    type="tel"
                    maxLength={15}
                    className="bg-secondary/50 border-border h-12 rounded-xl pr-10 text-right"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === "confirm" && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
              <h2 className="font-bold text-foreground text-center">ملخص الطلب</h2>
              <div className="h-px bg-border" />
              <Row label="نوع الطرد" value={packageType} />
              <Row label="الحجم" value={packageSize} />
              {Number(packageWeight) > 0 && <Row label="الوزن" value={`${packageWeight} كغ`} />}
              {packageFragile && <Row label="قابل للكسر" value="⚠️ نعم" />}
              <div className="h-px bg-border" />
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">من</p>
                  <p className="text-xs text-foreground">{pickupAddress || "غير محدد"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">إلى</p>
                  <p className="text-xs text-foreground">{deliveryAddress || "غير محدد"}</p>
                </div>
              </div>
              <div className="h-px bg-border" />
              <Row label="المستلم" value={recipientName} />
              <Row label="الهاتف" value={recipientPhone} />
              <div className="h-px bg-border" />
              <div className="flex justify-between items-center">
                <p className="text-xl font-bold text-primary">{estimatedPrice} د.ج</p>
                <p className="text-sm text-muted-foreground">التكلفة التقديرية</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-background via-background to-transparent">
        {step === "confirm" ? (
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-13 rounded-2xl gradient-primary text-primary-foreground font-bold text-base gap-2 shadow-xl shadow-primary/20"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "تأكيد وإرسال الطلب ✅"}
          </Button>
        ) : (
          <Button
            onClick={() => setStep(stepOrder[currentIndex + 1])}
            disabled={
              (step === "pickup" && !pickupLat) ||
              (step === "delivery" && !deliveryLat) ||
              (step === "contact" && (!recipientName.trim() || !recipientPhone.trim()))
            }
            className="w-full h-13 rounded-2xl gradient-primary text-primary-foreground font-bold text-base gap-2 shadow-xl shadow-primary/20 disabled:opacity-40"
          >
            التالي
            <ChevronLeft className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between text-xs">
    <span className="text-foreground">{value}</span>
    <span className="text-muted-foreground">{label}</span>
  </div>
);

export default CourierAddress;
