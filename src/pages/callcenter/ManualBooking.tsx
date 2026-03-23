import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Navigation, Car, User, Send, CheckCircle, Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";

const ManualBooking = () => {
  const [step, setStep] = useState<"form" | "drivers" | "done">("form");
  const [loading, setLoading] = useState(false);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  const [form, setForm] = useState({
    clientName: "",
    clientPhone: "",
    pickup: "",
    destination: "",
    serviceType: "standard",
    notes: "",
  });

  const serviceTypes = [
    { id: "standard", label: "عادي", price: "من 15 DH" },
    { id: "premium", label: "مميز", price: "من 25 DH" },
    { id: "xl", label: "XL", price: "من 35 DH" },
  ];

  const { data: drivers, loading: driversLoading } = useFirestoreCollection<any>({
    table: "drivers",
    filters: [{ field: "status", value: "active" }],
    orderByField: "rating",
    orderDirection: "desc",
    limitCount: 10,
    realtime: true,
    enabled: step === "drivers",
  });

  const availableDrivers = useMemo(() => drivers.map((driver) => ({
    id: driver.id,
    name: driver.fullName || driver.name || "سائق",
    car: [driver.vehicleType, driver.vehiclePlate].filter(Boolean).join(" • ") || "مركبة غير محددة",
    distance: driver.current_lat && driver.current_lng ? "متصل الآن" : "بدون GPS",
    eta: driver.isAvailable === false ? "مشغول" : "متاح",
    rating: Number(driver.rating || 0),
  })), [drivers]);

  const handleSubmit = async () => {
    if (!form.clientPhone || !form.pickup || !form.destination) {
      toast({ title: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    setLoading(true);
    // Get current agent user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "يجب تسجيل الدخول", variant: "destructive" });
      setLoading(false);
      return;
    }

    const price = form.serviceType === "premium" ? 25 : form.serviceType === "xl" ? 35 : 15;

    const { data, error } = await supabase.from("ride_requests").insert({
      user_id: user.id,
      pickup: form.pickup,
      destination: form.destination,
      status: "pending",
      price,
    }).select("id").single();
    setLoading(false);

    if (error) {
      toast({ title: "تعذر إنشاء الطلب", variant: "destructive" });
      return;
    }

    setCreatedRequestId(data?.id || null);
    setStep("drivers");
  };

  const handleAssign = async (driverId: string, driverName: string) => {
    if (!createdRequestId) return;
    setLoading(true);
    const [{ error: reqError }, { error: driverError }] = await Promise.all([
      supabase.from("ride_requests").update({ status: "assigned", driver_id: driverId, driver_name: driverName }).eq("id", createdRequestId),
      supabase.from("drivers").update({ isAvailable: false }).eq("id", driverId),
    ]);
    setLoading(false);

    if (reqError || driverError) {
      toast({ title: "فشل إرسال الطلب للسائق", variant: "destructive" });
      return;
    }

    setStep("done");
    toast({ title: `✅ تم إرسال الطلب إلى ${driverName}` });
  };

  const handleReset = () => {
    setStep("form");
    setCreatedRequestId(null);
    setForm({ clientName: "", clientPhone: "", pickup: "", destination: "", serviceType: "standard", notes: "" });
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-4">حجز رحلة يدوي</h1>

      {step === "form" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
          <div className="gradient-card rounded-2xl p-6 border border-border space-y-4">
            <h2 className="text-foreground font-bold text-sm">معلومات العميل</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1 text-right">اسم العميل</label>
                <div className="relative">
                  <Input value={form.clientName} onChange={e => setForm({...form, clientName: e.target.value})}
                    placeholder="اسم العميل (اختياري)" className="bg-secondary border-border rounded-xl text-right pr-9" />
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1 text-right">رقم الهاتف *</label>
                <div className="relative">
                  <Input value={form.clientPhone} onChange={e => setForm({...form, clientPhone: e.target.value})}
                    placeholder="+212 6XX-XXX-XXX" className="bg-secondary border-border rounded-xl text-right pr-9" />
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            <h2 className="text-foreground font-bold text-sm pt-2">تفاصيل الرحلة</h2>
            <div>
              <label className="text-xs text-muted-foreground block mb-1 text-right">موقع الانطلاق *</label>
              <div className="relative">
                <Input value={form.pickup} onChange={e => setForm({...form, pickup: e.target.value})}
                  placeholder="أدخل عنوان الانطلاق" className="bg-secondary border-border rounded-xl text-right pr-9" />
                <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-success" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1 text-right">الوجهة *</label>
              <div className="relative">
                <Input value={form.destination} onChange={e => setForm({...form, destination: e.target.value})}
                  placeholder="أدخل عنوان الوجهة" className="bg-secondary border-border rounded-xl text-right pr-9" />
                <Navigation className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1 text-right">نوع الخدمة</label>
              <div className="flex gap-2">
                {serviceTypes.map(s => (
                  <button key={s.id} onClick={() => setForm({...form, serviceType: s.id})}
                    className={`flex-1 p-3 rounded-xl border text-center transition-all ${
                      form.serviceType === s.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                    }`}>
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="text-xs mt-0.5">{s.price}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1 text-right">ملاحظات</label>
              <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                placeholder="ملاحظات إضافية..." className="bg-secondary border-border rounded-xl text-right min-h-[60px]" />
            </div>

            <Button onClick={handleSubmit} disabled={loading} className="w-full gradient-primary text-primary-foreground rounded-xl h-11 font-bold">
              {loading ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Send className="w-4 h-4 ml-2" />} البحث عن سائق
            </Button>
          </div>
        </motion.div>
      )}

      {step === "drivers" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
          <div className="gradient-card rounded-xl p-4 border border-border mb-4">
            <div className="flex items-center gap-3 text-sm flex-wrap">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-success" />
                <span className="text-foreground">{form.pickup}</span>
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="flex items-center gap-1.5">
                <Navigation className="w-3 h-3 text-destructive" />
                <span className="text-foreground">{form.destination}</span>
              </div>
            </div>
          </div>

          <h2 className="text-foreground font-bold text-sm mb-3">السائقون المتاحون</h2>
          {driversLoading ? (
            <div className="py-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-2">
              {availableDrivers.length === 0 && <div className="gradient-card rounded-xl p-6 border border-border text-sm text-muted-foreground text-center">لا يوجد سائقون متاحون حالياً</div>}
              {availableDrivers.map((d, i) => (
                <motion.div key={d.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                  className="gradient-card rounded-xl p-4 border border-border flex items-center justify-between">
                  <Button size="sm" onClick={() => handleAssign(d.id, d.name)} disabled={loading}
                    className="gradient-primary text-primary-foreground rounded-lg">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3 h-3 ml-1" /> إرسال</>}
                  </Button>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-foreground font-medium text-sm">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.car}</p>
                      <p className="text-xs text-muted-foreground">{d.distance} • {d.eta} • ⭐ {d.rating.toFixed(1)}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Car className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          <Button variant="outline" onClick={() => setStep("form")} className="w-full mt-3 border-border rounded-xl">
            تعديل الطلب
          </Button>
        </motion.div>
      )}

      {step === "done" && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto">
          <div className="gradient-card rounded-2xl p-8 border border-success/30 text-center">
            <CheckCircle className="w-20 h-20 text-success mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground">تم إرسال الطلب بنجاح!</h2>
            <p className="text-sm text-muted-foreground mt-2">تم إنشاء الطلب وتعيين السائق من بيانات Firebase الحية.</p>
            <Button onClick={handleReset} className="mt-6 gradient-primary text-primary-foreground rounded-xl">
              حجز رحلة جديدة
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ManualBooking;
