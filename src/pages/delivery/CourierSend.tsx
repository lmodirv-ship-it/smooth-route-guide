import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Package, FileText, Shirt, ShoppingBag,
  Utensils, Pill, Box, ChevronLeft, Scale, Ruler
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import deliveryLogo from "@/assets/hn-delivery-logo.jpeg";

const packageTypes = [
  { id: "document", icon: FileText, label: "مستندات", labelFr: "Documents", color: "from-sky-500 to-blue-400" },
  { id: "clothing", icon: Shirt, label: "ملابس", labelFr: "Vêtements", color: "from-violet-500 to-purple-400" },
  { id: "food", icon: Utensils, label: "طعام", labelFr: "Nourriture", color: "from-orange-500 to-amber-400" },
  { id: "electronics", icon: Box, label: "إلكترونيات", labelFr: "Électronique", color: "from-emerald-500 to-green-400" },
  { id: "medicine", icon: Pill, label: "أدوية", labelFr: "Médicaments", color: "from-pink-500 to-rose-400" },
  { id: "other", icon: Package, label: "أخرى", labelFr: "Autre", color: "from-amber-500 to-yellow-400" },
];

const sizeOptions = [
  { id: "small", label: "صغير", desc: "يمكن حمله بيد واحدة", icon: "📱", maxWeight: "2 كغ" },
  { id: "medium", label: "متوسط", desc: "حجم حقيبة يد", icon: "👜", maxWeight: "5 كغ" },
  { id: "large", label: "كبير", desc: "حجم صندوق كبير", icon: "📦", maxWeight: "15 كغ" },
  { id: "xlarge", label: "كبير جداً", desc: "يحتاج سيارة", icon: "🚗", maxWeight: "30 كغ" },
];

const CourierSend = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [weight, setWeight] = useState("");
  const [description, setDescription] = useState("");
  const [fragile, setFragile] = useState(false);

  const canProceed = step === 1
    ? !!selectedType
    : step === 2
    ? !!selectedSize
    : !!description.trim();

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Navigate to address page with package info
      const params = new URLSearchParams({
        type: selectedType,
        size: selectedSize,
        weight: weight || "0",
        description,
        fragile: fragile ? "1" : "0",
      });
      navigate(`/delivery/courier/address?${params.toString()}`);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/80 via-accent/60 to-primary/50 pt-6 pb-10 px-5 rounded-b-3xl relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-8 left-12 w-2 h-2 rounded-full bg-white/15 animate-pulse" />
          <div className="absolute bottom-6 right-16 w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" style={{ animationDelay: "0.7s" }} />
        </div>
        <div className="flex items-center justify-between mb-5 relative z-10">
          <button onClick={() => step > 1 ? setStep(step - 1) : navigate("/delivery")} className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
            <ArrowRight className="w-5 h-5 text-primary-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <img src={deliveryLogo} alt="HN Delivery" className="w-9 h-9 rounded-full border-2 border-white/30" />
            <div className="text-center">
              <h1 className="text-lg font-bold text-primary-foreground">إرسال طرد</h1>
              <p className="text-xs text-primary-foreground/60">Service Coursier</p>
            </div>
          </div>
          <div className="w-9" />
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 justify-center relative z-10">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                s === step
                  ? "bg-white text-primary shadow-lg"
                  : s < step
                  ? "bg-white/30 text-white"
                  : "bg-white/10 text-white/40"
              }`}>
                {s < step ? "✓" : s}
              </div>
              {s < 3 && <div className={`w-8 h-0.5 rounded ${s < step ? "bg-white/40" : "bg-white/10"}`} />}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-6 mt-2 relative z-10">
          <span className={`text-[10px] ${step >= 1 ? "text-white/80" : "text-white/30"}`}>نوع الطرد</span>
          <span className={`text-[10px] ${step >= 2 ? "text-white/80" : "text-white/30"}`}>الحجم</span>
          <span className={`text-[10px] ${step >= 3 ? "text-white/80" : "text-white/30"}`}>التفاصيل</span>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 -mt-5 relative z-10 pb-32">
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-base font-bold text-foreground mb-4 mt-2">اختر نوع الطرد</h2>
            <div className="grid grid-cols-3 gap-3">
              {packageTypes.map((type, i) => (
                <motion.button
                  key={type.id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.06 }}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => setSelectedType(type.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                    selectedType === type.id
                      ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${type.color} flex items-center justify-center`}>
                    <div className="absolute inset-0" />
                    <type.icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-xs font-bold text-foreground">{type.label}</p>
                  <p className="text-[10px] text-muted-foreground">{type.labelFr}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-base font-bold text-foreground mb-4 mt-2">اختر حجم الطرد</h2>
            <div className="space-y-3">
              {sizeOptions.map((size, i) => (
                <motion.button
                  key={size.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedSize(size.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-right ${
                    selectedSize === size.id
                      ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <span className="text-3xl">{size.icon}</span>
                  <div className="flex-1">
                    <p className="font-bold text-foreground">{size.label}</p>
                    <p className="text-xs text-muted-foreground">{size.desc}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-muted-foreground">الحد الأقصى</p>
                    <p className="text-sm font-bold text-primary">{size.maxWeight}</p>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Weight input */}
            <div className="mt-5 space-y-2">
              <label className="text-sm text-muted-foreground block">الوزن التقريبي (كغ) - اختياري</label>
              <div className="relative">
                <Scale className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="مثال: 3"
                  className="bg-card border-border h-12 rounded-xl pr-10 text-right"
                />
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-base font-bold text-foreground mb-4 mt-2">تفاصيل الطرد</h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground block">وصف المحتوى</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="صف محتوى الطرد بإيجاز... مثال: كتب دراسية، ملابس شتوية"
                  className="bg-card border-border rounded-xl min-h-[100px] text-right resize-none"
                  maxLength={500}
                />
                <p className="text-[10px] text-muted-foreground text-left">{description.length}/500</p>
              </div>

              {/* Fragile toggle */}
              <button
                onClick={() => setFragile(!fragile)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                  fragile ? "border-destructive bg-destructive/5" : "border-border bg-card"
                }`}
              >
                <span className="text-2xl">⚠️</span>
                <div className="flex-1 text-right">
                  <p className="font-bold text-foreground">طرد قابل للكسر</p>
                  <p className="text-xs text-muted-foreground">يتطلب عناية خاصة أثناء النقل</p>
                </div>
                <div className={`w-12 h-7 rounded-full transition-all flex items-center px-1 ${
                  fragile ? "bg-destructive" : "bg-secondary"
                }`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    fragile ? "-translate-x-5" : ""
                  }`} />
                </div>
              </button>

              {/* Summary */}
              <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
                <h3 className="text-sm font-bold text-foreground">ملخص الطرد</h3>
                <div className="flex justify-between text-xs">
                  <span className="text-foreground">{packageTypes.find(t => t.id === selectedType)?.label}</span>
                  <span className="text-muted-foreground">النوع</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-foreground">{sizeOptions.find(s => s.id === selectedSize)?.label}</span>
                  <span className="text-muted-foreground">الحجم</span>
                </div>
                {weight && (
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground">{weight} كغ</span>
                    <span className="text-muted-foreground">الوزن</span>
                  </div>
                )}
                {fragile && (
                  <div className="flex justify-between text-xs">
                    <span className="text-destructive font-bold">⚠️ نعم</span>
                    <span className="text-muted-foreground">قابل للكسر</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-background via-background to-transparent">
        <Button
          onClick={handleNext}
          disabled={!canProceed}
          className="w-full h-13 rounded-2xl gradient-primary text-primary-foreground font-bold text-base gap-2 shadow-xl shadow-primary/20 disabled:opacity-40"
        >
          {step < 3 ? (
            <>
              التالي
              <ChevronLeft className="w-5 h-5" />
            </>
          ) : (
            <>
              تحديد العنوان
              <ChevronLeft className="w-5 h-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default CourierSend;
