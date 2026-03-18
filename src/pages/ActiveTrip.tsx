import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  MessageCircle,
  MapPin,
  X,
  CheckCircle,
  Clock,
  User,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import GoogleMapWrapper from "@/components/GoogleMap";
import { supabase } from "@/lib/firestoreClient";

const ActiveTrip = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchTrip = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: driver } = await supabase.from("drivers").select("id").eq("user_id", user.id).maybeSingle();
    if (!driver?.id) {
      setTrip(null);
      setClient(null);
      setLoading(false);
      return;
    }

    const { data: trips } = await supabase
      .from("trips")
      .select("*")
      .eq("driver_id", driver.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const activeTrip = (trips || []).find((item) => !["completed", "canceled", "cancelled"].includes(item.status));
    setTrip(activeTrip || null);

    if (activeTrip?.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, phone")
        .eq("id", activeTrip.user_id)
        .maybeSingle();
      setClient(profile || null);
    } else {
      setClient(null);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchTrip();
    const channel = supabase
      .channel("active-trip-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, () => {
        void fetchTrip();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTrip]);

  const tripPhase = useMemo<"arriving" | "started" | "completed">(() => {
    if (!trip) return "arriving";
    if (trip.status === "completed") return "completed";
    if (trip.started_at || trip.status === "in_progress") return "started";
    return "arriving";
  }, [trip]);

  const clientInfo = useMemo(() => {
    if (!trip) return null;
    const distanceValue = Number(trip.distance || 0);
    const etaMinutes = distanceValue > 0 ? Math.max(3, Math.round(distanceValue * 2)) : 5;

    return {
      name: client?.name || "العميل",
      rating: 5,
      phone: client?.phone || "",
      pickup: trip.start_location || "غير محدد",
      dropoff: trip.end_location || "غير محدد",
      price: `${Number(trip.fare || 0)} DH`,
      distance: distanceValue > 0 ? `${distanceValue} كم` : "—",
      eta: `${etaMinutes} دقائق`,
    };
  }, [client, trip]);

  const handleStartTrip = async () => {
    if (!trip?.id) return;
    setSubmitting(true);
    await supabase
      .from("trips")
      .update({ status: "in_progress", started_at: trip.started_at || new Date().toISOString() })
      .eq("id", trip.id);
    setTrip((prev: any) => prev ? { ...prev, status: "in_progress", started_at: prev.started_at || new Date().toISOString() } : prev);
    setSubmitting(false);
  };

  const handleCompleteTrip = async () => {
    if (!trip?.id) return;
    setSubmitting(true);
    await supabase
      .from("trips")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", trip.id);
    setTrip((prev: any) => prev ? { ...prev, status: "completed", ended_at: new Date().toISOString() } : prev);
    setSubmitting(false);
  };

  if (loading) {
    return <div className="min-h-screen gradient-dark flex items-center justify-center text-muted-foreground">جاري تحميل الرحلة...</div>;
  }

  if (!trip || !clientInfo) {
    return (
      <div className="min-h-screen gradient-dark flex flex-col items-center justify-center px-6 text-center">
        <Clock className="w-14 h-14 text-muted-foreground/40 mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">لا توجد رحلة نشطة</h1>
        <p className="text-sm text-muted-foreground mb-4">عند قبول رحلة جديدة ستظهر هنا تلقائياً.</p>
        <Button onClick={() => navigate("/driver")} className="gradient-primary text-primary-foreground rounded-xl">
          العودة للرئيسية
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-dark flex flex-col">
      <div className="flex-1 relative min-h-[40vh]">
        <GoogleMapWrapper zoom={15}>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 glass px-4 py-2 rounded-full flex items-center gap-2">
            <span className="text-foreground text-sm font-medium">{clientInfo.eta}</span>
            <Clock className="w-4 h-4 text-primary" />
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 glass px-4 py-2 rounded-full">
            <p className="text-sm text-foreground font-medium">
              {tripPhase === "arriving" ? "في الطريق للعميل" : tripPhase === "started" ? "الرحلة جارية" : "تم الوصول"}
            </p>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full glass flex items-center justify-center"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </GoogleMapWrapper>
      </div>

      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="glass-strong rounded-t-3xl p-5 border-t border-border"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <a href={clientInfo.phone ? `tel:${clientInfo.phone}` : undefined} className="icon-circle-orange w-10 h-10">
              <Phone className="w-5 h-5 text-primary" />
            </a>
            <button className="icon-circle-blue w-10 h-10" disabled>
              <MessageCircle className="w-5 h-5 text-info" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <h3 className="font-bold text-foreground">{clientInfo.name}</h3>
              <div className="flex items-center gap-1 justify-end">
                <span className="text-xs text-warning">{clientInfo.rating.toFixed(1)}</span>
                <Star className="w-3 h-3 text-warning fill-warning" />
              </div>
            </div>
            <div className="icon-circle-blue w-12 h-12">
              <User className="w-6 h-6 text-info" />
            </div>
          </div>
        </div>

        <div className="gradient-card rounded-xl p-4 border border-border mb-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 justify-end">
              <span className="text-sm text-foreground">{clientInfo.pickup}</span>
              <div className="w-3 h-3 rounded-full bg-success border-2 border-success/30" />
            </div>
            <div className="mr-[6px] border-r border-dashed border-muted-foreground/30 h-4" />
            <div className="flex items-center gap-3 justify-end">
              <span className="text-sm text-foreground">{clientInfo.dropoff}</span>
              <div className="w-3 h-3 rounded-full bg-destructive border-2 border-destructive/30" />
            </div>
          </div>
          <div className="flex justify-between mt-3 pt-3 border-t border-border">
            <span className="text-primary font-bold text-lg">{clientInfo.price}</span>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {clientInfo.distance}
            </span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {tripPhase === "arriving" && (
            <motion.div key="arriving" exit={{ opacity: 0 }}>
              <Button
                onClick={handleStartTrip}
                disabled={submitting}
                className="w-full h-14 rounded-xl gradient-primary text-primary-foreground font-bold text-lg glow-primary"
              >
                وصلت - ابدأ الرحلة
              </Button>
            </motion.div>
          )}
          {tripPhase === "started" && (
            <motion.div key="started" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Button
                onClick={handleCompleteTrip}
                disabled={submitting}
                className="w-full h-14 rounded-xl bg-success text-success-foreground font-bold text-lg"
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
              <p className="text-2xl font-bold text-gradient-primary mb-4">{clientInfo.price}</p>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((score) => (
                  <Star key={score} className="w-8 h-8 text-warning fill-warning" />
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
