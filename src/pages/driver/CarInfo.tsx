import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, ArrowRight, Edit2, Palette, Hash, Calendar, Fuel, Settings, Shield, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CarInfo = () => {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);

  const car = {
    brand: "Toyota",
    model: "Camry",
    year: "2024",
    color: "أبيض",
    plate: "أ-12345-78",
    fuel: "بنزين",
    seats: 4,
    insurance: "ساري حتى 12/2026",
    inspection: "ساري حتى 06/2026",
  };

  const specs = [
    { icon: Car, label: "الماركة", value: `${car.brand} ${car.model}` },
    { icon: Calendar, label: "سنة الصنع", value: car.year },
    { icon: Palette, label: "اللون", value: car.color },
    { icon: Hash, label: "لوحة الترقيم", value: car.plate },
    { icon: Fuel, label: "نوع الوقود", value: car.fuel },
    { icon: Settings, label: "المقاعد", value: `${car.seats} مقاعد` },
  ];

  const docs = [
    { label: "التأمين", value: car.insurance, valid: true },
    { label: "المراقبة التقنية", value: car.inspection, valid: true },
  ];

  return (
    <div className="min-h-screen gradient-dark pb-6" dir="rtl">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)}><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
        <span className="font-bold text-foreground">معلومات السيارة</span>
        <button onClick={() => setEditing(!editing)}><Edit2 className="w-5 h-5 text-primary" /></button>
      </div>

      <div className="px-4 mt-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="gradient-card rounded-2xl p-6 border border-border text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
          <div className="relative z-10">
            <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-3 glow-primary">
              <Car className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{car.brand} {car.model}</h2>
            <p className="text-primary text-sm font-medium">{car.plate}</p>
          </div>
        </motion.div>

        <h3 className="text-foreground font-bold mt-6 mb-3">المواصفات</h3>
        <div className="gradient-card rounded-xl border border-border divide-y divide-border">
          {specs.map((s, i) => (
            <div key={i} className="flex items-center justify-between p-4">
              {editing ? <Input defaultValue={s.value} className="w-40 h-8 bg-secondary border-border text-sm" /> : <span className="text-sm text-muted-foreground">{s.value}</span>}
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">{s.label}</span>
                <s.icon className="w-4 h-4 text-primary" />
              </div>
            </div>
          ))}
        </div>

        {editing && (
          <Button className="w-full gradient-primary text-primary-foreground rounded-xl h-11 mt-4" onClick={() => setEditing(false)}>
            حفظ التغييرات
          </Button>
        )}

        <h3 className="text-foreground font-bold mt-6 mb-3">الوثائق</h3>
        <div className="space-y-3">
          {docs.map((d, i) => (
            <div key={i} className="gradient-card rounded-xl p-4 border border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-xs text-success">{d.value}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">{d.label}</span>
                <Shield className="w-4 h-4 text-info" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CarInfo;
