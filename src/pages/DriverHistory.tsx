import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Clock, Star, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DriverHistory = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: driver } = await supabase.from("drivers").select("id").eq("user_id", user.id).maybeSingle();
      if (!driver) { setLoading(false); return; }

      const { data } = await supabase.from("trips")
        .select("*").eq("driver_id", driver.id)
        .order("created_at", { ascending: false }).limit(50);
      setTrips(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const filteredTrips = filter === "all" ? trips :
    filter === "completed" ? trips.filter(t => t.status === "completed") :
    trips.filter(t => t.status === "cancelled");

  if (loading) return <div className="min-h-screen gradient-dark flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen gradient-dark">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <div />
        <h1 className="font-bold text-foreground text-lg">سجل الرحلات</h1>
        <button onClick={() => navigate(-1)}><ArrowRight className="w-6 h-6 text-muted-foreground" /></button>
      </div>

      <div className="flex gap-2 px-4 mt-4">
        {[{ id: "all", label: "الكل" }, { id: "completed", label: "مكتمل" }, { id: "cancelled", label: "ملغي" }].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === f.id ? "gradient-primary text-primary-foreground glow-primary" : "bg-secondary text-muted-foreground border border-border"}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="px-4 mt-4 space-y-3 pb-8">
        {filteredTrips.length === 0 && <p className="text-center text-muted-foreground py-12">لا توجد رحلات</p>}
        {filteredTrips.map((trip, i) => (
          <motion.div key={trip.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="gradient-card rounded-xl p-4 border border-border">
            <div className="flex justify-between items-start mb-3">
              <span className={`text-xs px-2 py-0.5 rounded-full ${trip.status === "completed" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                {trip.status === "completed" ? "مكتمل" : "ملغي"}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {new Date(trip.created_at).toLocaleDateString("ar-SA")}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-sm text-foreground">{trip.start_location || "—"}</span>
                <div className="w-2.5 h-2.5 rounded-full bg-success border-2 border-success/30" />
              </div>
              <div className="mr-[5px] border-r border-dashed border-muted-foreground/30 h-3" />
              <div className="flex items-center gap-2 justify-end">
                <span className="text-sm text-foreground">{trip.end_location || "—"}</span>
                <div className="w-2.5 h-2.5 rounded-full bg-destructive border-2 border-destructive/30" />
              </div>
            </div>
            <div className="flex justify-between mt-3 pt-3 border-t border-border">
              <span className="text-primary font-bold">{trip.fare || 0} DH</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> {new Date(trip.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default DriverHistory;
