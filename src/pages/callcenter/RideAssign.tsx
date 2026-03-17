import { useState } from "react";
import { Car, User, MapPin, Star, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

const RideAssign = () => {
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  const pendingRequests = [
    { id: "R-001", client: "عبدالله أحمد", pickup: "حي المعاريف", dest: "كازا فوياجور", price: "35 DH" },
    { id: "R-002", client: "فاطمة محمد", pickup: "حي الحسني", dest: "عين الشق", price: "28 DH" },
  ];

  const availableDrivers = [
    { id: "D-001", name: "أحمد الفاسي", car: "Toyota Camry", rating: 4.9, distance: "1.2 كم", status: "متاح" },
    { id: "D-002", name: "خالد المنصوري", car: "Hyundai Sonata", rating: 4.7, distance: "2.5 كم", status: "متاح" },
    { id: "D-003", name: "سعيد بنعمر", car: "Kia Optima", rating: 4.8, distance: "3.1 كم", status: "متاح" },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-4">توزيع الرحلات يدوياً</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h2 className="text-foreground font-bold mb-3 text-sm">الطلبات المعلقة</h2>
          <div className="space-y-2">
            {pendingRequests.map(req => (
              <div key={req.id} className="gradient-card rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-primary font-bold">{req.price}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-medium text-sm">{req.client}</span>
                    <span className="text-xs text-muted-foreground">{req.id}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3 text-success" /> {req.pickup} → {req.dest}
                </div>
                {selectedDriver && (
                  <Button size="sm" className="w-full mt-3 gradient-primary text-primary-foreground rounded-lg"
                    onClick={() => { toast({ title: `تم تعيين ${selectedDriver} للطلب ${req.id}` }); setSelectedDriver(null); }}>
                    <Check className="w-4 h-4 ml-1" /> تعيين السائق المختار
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-foreground font-bold mb-3 text-sm">السائقون المتاحون</h2>
          <div className="space-y-2">
            {availableDrivers.map(d => (
              <button key={d.id} onClick={() => setSelectedDriver(d.name)}
                className={`w-full gradient-card rounded-xl p-4 border text-right transition-all ${selectedDriver === d.name ? "border-primary glow-ring-orange" : "border-border hover:border-primary/20"}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <Car className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.car} • {d.distance}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-warning fill-warning" />
                    <span className="text-xs text-warning">{d.rating}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RideAssign;
