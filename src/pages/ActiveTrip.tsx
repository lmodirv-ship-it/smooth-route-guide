import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, MessageCircle, Navigation, MapPin, X, CheckCircle,
  Clock, User, Star, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import GoogleMapWrapper from "@/components/GoogleMap";

const ActiveTrip = () => {
  const navigate = useNavigate();
  const [tripPhase, setTripPhase] = useState<"arriving" | "started" | "completed">("arriving");

  const client = {
    name: "عبدالله أحمد",
    rating: 4.8,
    phone: "+966501234567",
    pickup: "حي الملقا، شارع أنس بن مالك",
    dropoff: "حي العليا، طريق الملك فهد",
    price: "٣٥ ر.س",
    distance: "١٢ كم",
    eta: "٨ دقائق",
  };

  return (
    <div className="min-h-screen gradient-dark flex flex-col">
      {/* Map Area */}
      <div className="flex-1 relative min-h-[40vh]">
        <GoogleMapWrapper zoom={15}>
          {/* ETA Badge */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 glass px-4 py-2 rounded-full flex items-center gap-2">
            <span className="text-foreground text-sm font-medium">{client.eta}</span>
            <Clock className="w-4 h-4 text-primary" />
          </div>

          {/* Status */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 glass px-4 py-2 rounded-full">
            <p className="text-sm text-foreground font-medium">
              {tripPhase === "arriving" ? "في الطريق للعميل" : tripPhase === "started" ? "الرحلة جارية" : "تم الوصول"}
            </p>
          </div>

          {/* Cancel */}
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full glass flex items-center justify-center"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </GoogleMapWrapper>
      </div>

      {/* Bottom Sheet */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="glass-strong rounded-t-3xl p-5 border-t border-border"
      >
        {/* Client Info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button className="icon-circle-blue w-10 h-10">
              <MessageCircle className="w-5 h-5 text-info" />
            </button>
            <button className="icon-circle-orange w-10 h-10">
              <Phone className="w-5 h-5 text-primary" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <h3 className="font-bold text-foreground">{client.name}</h3>
              <div className="flex items-center gap-1 justify-end">
                <span className="text-xs text-warning">{client.rating}</span>
                <Star className="w-3 h-3 text-warning fill-warning" />
              </div>
            </div>
            <div className="icon-circle-blue w-12 h-12">
              <User className="w-6 h-6 text-info" />
            </div>
          </div>
        </div>

        {/* Route */}
        <div className="gradient-card rounded-xl p-4 border border-border mb-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 justify-end">
              <span className="text-sm text-foreground">{client.pickup}</span>
              <div className="w-3 h-3 rounded-full bg-success border-2 border-success/30" />
            </div>
            <div className="mr-[6px] border-r border-dashed border-muted-foreground/30 h-4" />
            <div className="flex items-center gap-3 justify-end">
              <span className="text-sm text-foreground">{client.dropoff}</span>
              <div className="w-3 h-3 rounded-full bg-destructive border-2 border-destructive/30" />
            </div>
          </div>
          <div className="flex justify-between mt-3 pt-3 border-t border-border">
            <span className="text-primary font-bold text-lg">{client.price}</span>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {client.distance}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <AnimatePresence mode="wait">
          {tripPhase === "arriving" && (
            <motion.div key="arriving" exit={{ opacity: 0 }}>
              <Button
                onClick={() => setTripPhase("started")}
                className="w-full h-14 rounded-xl gradient-primary text-primary-foreground font-bold text-lg glow-primary"
              >
                وصلت - ابدأ الرحلة
              </Button>
            </motion.div>
          )}
          {tripPhase === "started" && (
            <motion.div key="started" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Button
                onClick={() => setTripPhase("completed")}
                className="w-full h-14 rounded-xl bg-success text-destructive-foreground font-bold text-lg"
              >
                <CheckCircle className="w-5 h-5 ml-2" />
                إنهاء الرحلة
              </Button>
            </motion.div>
          )}
          {tripPhase === "completed" && (
            <motion.div key="completed" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <CheckCircle className="w-16 h-16 text-success mx-auto mb-3" />
              <h3 className="text-xl font-bold text-foreground mb-1">تمت الرحلة بنجاح!</h3>
              <p className="text-2xl font-bold text-gradient-primary mb-4">{client.price}</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-8 h-8 text-warning fill-warning" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2 mb-4">قيّم العميل</p>
              <Button
                onClick={() => navigate("/driver")}
                className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-bold glow-primary"
              >
                العودة للرئيسية
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ActiveTrip;
