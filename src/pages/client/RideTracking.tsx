import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Phone, MessageCircle, MapPin, User, Star, Car, Clock, Navigation, CheckCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import GoogleMapWrapper from "@/components/GoogleMap";

const RideTracking = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"arriving" | "started" | "completed">("arriving");

  const driver = { name: "أحمد الفاسي", rating: 4.9, car: "Toyota Camry", plate: "أ-12345", color: "أبيض" };

  const phases = [
    { key: "arriving", label: "السائق في الطريق", icon: Car, color: "text-info" },
    { key: "started", label: "الرحلة جارية", icon: Navigation, color: "text-primary" },
    { key: "completed", label: "وصلت!", icon: CheckCircle, color: "text-success" },
  ];

  return (
    <div className="min-h-screen gradient-dark" dir="rtl">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate("/client")}><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
        <span className="font-bold text-foreground">تتبع الرحلة</span>
        <Shield className="w-5 h-5 text-success" />
      </div>

      <div className="h-64 relative">
        <GoogleMapWrapper zoom={15} showMarker />
        <div className="absolute bottom-3 inset-x-3 z-10">
          <div className="glass rounded-xl px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">وقت الوصول: 3 دقائق</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${phase === "arriving" ? "bg-info" : phase === "started" ? "bg-primary" : "bg-success"}`} />
              <span className="text-sm text-foreground font-medium">
                {phases.find(p => p.key === phase)?.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-6">
          {phases.map((p, i) => (
            <div key={p.key} className="flex items-center">
              <button onClick={() => setPhase(p.key as any)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  phases.findIndex(x => x.key === phase) >= i ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}>
                <p.icon className="w-5 h-5" />
              </button>
              {i < phases.length - 1 && (
                <div className={`w-16 h-1 mx-1 rounded-full transition-all ${phases.findIndex(x => x.key === phase) > i ? "gradient-primary" : "bg-secondary"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Driver Card */}
        <div className="gradient-card rounded-2xl p-4 border border-border">
          <div className="flex items-center gap-4">
            <div className="icon-circle-orange w-14 h-14">
              <User className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground">{driver.name}</h3>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-warning fill-warning" />
                <span className="text-xs text-warning">{driver.rating}</span>
              </div>
              <p className="text-xs text-muted-foreground">{driver.car} {driver.color} • {driver.plate}</p>
            </div>
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-info" />
              </button>
              <button className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-success" />
              </button>
            </div>
          </div>
        </div>

        {/* Ride Info */}
        <div className="gradient-card rounded-xl p-4 border border-border mt-3">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-success" />
              <p className="text-sm text-foreground">حي المعاريف، الدار البيضاء</p>
            </div>
            <div className="mr-1.5 border-r border-dashed border-border h-3" />
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <p className="text-sm text-foreground">محطة القطار كازا فوياجور</p>
            </div>
          </div>
          <div className="flex justify-between mt-3 pt-3 border-t border-border">
            <span className="text-primary font-bold text-lg">35 DH</span>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>8.5 كم</span>
              <span>18 دقيقة</span>
            </div>
          </div>
        </div>

        {phase === "completed" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
            <div className="gradient-card rounded-2xl p-6 border border-success/30 text-center">
              <CheckCircle className="w-16 h-16 text-success mx-auto mb-3" />
              <h3 className="text-xl font-bold text-foreground">وصلت بسلام!</h3>
              <p className="text-sm text-muted-foreground mt-1">شكراً لاستخدامك HN Driver</p>
              <div className="flex gap-2 mt-4">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} className="flex-1 h-10 rounded-lg bg-secondary hover:bg-warning/20 transition-colors flex items-center justify-center">
                    <Star className="w-5 h-5 text-warning" />
                  </button>
                ))}
              </div>
              <Button onClick={() => navigate("/client")} className="w-full mt-4 gradient-primary text-primary-foreground rounded-xl">
                العودة للرئيسية
              </Button>
            </div>
          </motion.div>
        )}

        {phase !== "completed" && (
          <Button variant="outline" className="w-full mt-4 border-destructive text-destructive rounded-xl">
            إلغاء الرحلة
          </Button>
        )}
      </div>
    </div>
  );
};

export default RideTracking;
