import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Star, Car, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/context";

const ClientHistory = () => {
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("trips")
        .select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(50);
      if (!data) { setLoading(false); return; }
      const driverIds = [...new Set(data.filter(t => t.driver_id).map(t => t.driver_id))];
      let driverNames = new Map<string, string>();
      if (driverIds.length > 0) {
        const { data: drivers } = await supabase.from("drivers").select("id, user_id").in("id", driverIds) as any;
        if (drivers?.length) {
          const uids = drivers.map((d: any) => d.user_id);
          const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", uids);
          const dMap = new Map<string, string>(drivers.map((d: any) => [d.id, d.user_id]));
          const pMap = new Map<string, string>(profiles?.map(p => [p.id, p.name]) || []);
          driverIds.forEach(did => driverNames.set(did as string, pMap.get(dMap.get(did as string) || "") || t.customer.driverName));
        }
      }
      setTrips(data.map(trip => ({ ...trip, driverName: driverNames.get(trip.driver_id) || "—" })));
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <div className="min-h-screen gradient-dark flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen gradient-dark pb-24" dir={dir}>
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)}><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
        <span className="font-bold text-foreground">{t.customer.tripHistoryTitle}</span>
        <div className="w-5" />
      </div>

      <div className="px-4 mt-4 space-y-3">
        {trips.length === 0 && <p className="text-center text-muted-foreground py-12">{t.customer.noPreviousTrips}</p>}
        {trips.map((trip, i) => (
          <motion.div key={trip.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass-card rounded-xl p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${trip.status === "completed" ? "bg-success/10 text-success" : trip.status === "in_progress" ? "bg-info/10 text-info" : "bg-destructive/10 text-destructive"}`}>
                  {trip.status === "completed" ? t.customer.completedStatus : trip.status === "in_progress" ? t.customer.inProgressStatus : t.customer.cancelledStatus}
                </span>
                <span className="text-primary font-bold">{trip.fare || 0} DH</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {new Date(trip.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-success" /><span className="text-sm text-foreground">{trip.start_location || "—"}</span></div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-destructive" /><span className="text-sm text-foreground">{trip.end_location || "—"}</span></div>
            </div>
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">{trip.driverName}</span>
                <Car className="w-3 h-3 text-muted-foreground" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ClientHistory;
