import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Clock, Filter, Star, MapPin } from "lucide-react";

const DriverHistory = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");

  const trips = [
    { id: 1, from: "حي الملقا", to: "حي العليا", price: "٣٥ ر.س", time: "١٠:٣٠ ص", date: "اليوم", status: "مكتمل", rating: 5, distance: "١٢ كم" },
    { id: 2, from: "المطار", to: "حي الياسمين", price: "٧٥ ر.س", time: "٩:١٥ ص", date: "اليوم", status: "مكتمل", rating: 4, distance: "٢٨ كم" },
    { id: 3, from: "جامعة الملك سعود", to: "حي النخيل", price: "٢٥ ر.س", time: "٨:٠٠ ص", date: "اليوم", status: "ملغي", rating: 0, distance: "٨ كم" },
    { id: 4, from: "حي الورود", to: "طريق الملك فهد", price: "٤٠ ر.س", time: "٤:٣٠ م", date: "أمس", status: "مكتمل", rating: 5, distance: "١٥ كم" },
    { id: 5, from: "حي السليمانية", to: "حي الربوة", price: "٣٠ ر.س", time: "٢:٠٠ م", date: "أمس", status: "مكتمل", rating: 4, distance: "١٠ كم" },
  ];

  const filters = [
    { id: "all", label: "الكل" },
    { id: "completed", label: "مكتمل" },
    { id: "cancelled", label: "ملغي" },
  ];

  const filteredTrips = filter === "all" ? trips : trips.filter(t =>
    filter === "completed" ? t.status === "مكتمل" : t.status === "ملغي"
  );

  return (
    <div className="min-h-screen gradient-dark">
      {/* Header */}
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <div />
        <h1 className="font-bold text-foreground text-lg">سجل الرحلات</h1>
        <button onClick={() => navigate(-1)}>
          <ArrowRight className="w-6 h-6 text-muted-foreground" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 px-4 mt-4">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === f.id
                ? "gradient-primary text-primary-foreground glow-primary"
                : "bg-secondary text-muted-foreground border border-border"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Trip List */}
      <div className="px-4 mt-4 space-y-3 pb-8">
        {filteredTrips.map((trip, i) => (
          <motion.div
            key={trip.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="gradient-card rounded-xl p-4 border border-border"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  trip.status === "مكتمل" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                }`}>{trip.status}</span>
                {trip.rating > 0 && (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: trip.rating }).map((_, j) => (
                      <Star key={j} className="w-3 h-3 text-warning fill-warning" />
                    ))}
                  </div>
                )}
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {trip.date}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-sm text-foreground">{trip.from}</span>
                <div className="w-2.5 h-2.5 rounded-full bg-success border-2 border-success/30" />
              </div>
              <div className="mr-[5px] border-r border-dashed border-muted-foreground/30 h-3" />
              <div className="flex items-center gap-2 justify-end">
                <span className="text-sm text-foreground">{trip.to}</span>
                <div className="w-2.5 h-2.5 rounded-full bg-destructive border-2 border-destructive/30" />
              </div>
            </div>

            <div className="flex justify-between mt-3 pt-3 border-t border-border">
              <span className="text-primary font-bold">{trip.price}</span>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {trip.distance}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {trip.time}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default DriverHistory;
