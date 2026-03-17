import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Clock, Star, Car } from "lucide-react";

const ClientHistory = () => {
  const navigate = useNavigate();

  const trips = [
    { id: 1, from: "حي المعاريف", to: "كازا فوياجور", price: "35 DH", date: "اليوم 14:30", driver: "أحمد الفاسي", rating: 5, status: "مكتمل" },
    { id: 2, from: "حي الحسني", to: "عين الشق", price: "28 DH", date: "أمس 10:15", driver: "خالد المنصوري", rating: 4, status: "مكتمل" },
    { id: 3, from: "محطة القطار", to: "المطار", price: "52 DH", date: "14/03 18:00", driver: "سعيد بنعمر", rating: 5, status: "مكتمل" },
    { id: 4, from: "حي السلام", to: "المدينة القديمة", price: "22 DH", date: "13/03 09:30", driver: "يوسف العربي", rating: 0, status: "ملغي" },
    { id: 5, from: "جامعة الحسن الثاني", to: "حي النخيل", price: "18 DH", date: "12/03 16:00", driver: "محمد البكري", rating: 4, status: "مكتمل" },
  ];

  return (
    <div className="min-h-screen gradient-dark pb-24" dir="rtl">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)}><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
        <span className="font-bold text-foreground">سجل الرحلات</span>
        <div className="w-5" />
      </div>

      <div className="px-4 mt-4 space-y-3">
        {trips.map((trip, i) => (
          <motion.div key={trip.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="gradient-card rounded-xl p-4 border border-border">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${trip.status === "مكتمل" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                  {trip.status}
                </span>
                <span className="text-primary font-bold">{trip.price}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" /> {trip.date}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="text-sm text-foreground">{trip.from}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                <span className="text-sm text-foreground">{trip.to}</span>
              </div>
            </div>
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
              {trip.rating > 0 && (
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`w-3 h-3 ${s <= trip.rating ? "text-warning fill-warning" : "text-muted-foreground"}`} />
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">{trip.driver}</span>
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
