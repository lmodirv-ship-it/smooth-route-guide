import { useState } from "react";
import { motion } from "framer-motion";
import { Car, MapPin, Star, Check, ArrowLeftRight, User, Clock, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const RideAssign = () => {
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  const pendingRequests = [
    { id: "R-001", client: "عبدالله أحمد", phone: "+212 661-XXX-001", pickup: "حي المعاريف", dest: "كازا فوياجور", price: "35 DH", time: "منذ 3 دقائق", service: "عادي" },
    { id: "R-002", client: "فاطمة محمد", phone: "+212 662-XXX-002", pickup: "حي الحسني", dest: "عين الشق", price: "28 DH", time: "منذ 5 دقائق", service: "عادي" },
    { id: "R-003", client: "خالد العمري", phone: "+212 663-XXX-003", pickup: "محطة القطار", dest: "المطار", price: "52 DH", time: "منذ 1 دقيقة", service: "مميز" },
  ];

  const availableDrivers = [
    { id: "D-001", name: "أحمد الفاسي", car: "Toyota Camry أبيض", plate: "أ-12345", rating: 4.9, distance: "1.2 كم", eta: "3 دقائق", trips: 342, status: "متاح" },
    { id: "D-002", name: "خالد المنصوري", car: "Hyundai Sonata فضي", plate: "ب-67890", rating: 4.7, distance: "2.5 كم", eta: "5 دقائق", trips: 215, status: "متاح" },
    { id: "D-003", name: "سعيد بنعمر", car: "Kia Optima أسود", plate: "ج-11223", rating: 4.8, distance: "3.1 كم", eta: "7 دقائق", trips: 128, status: "متاح" },
    { id: "D-004", name: "يوسف العربي", car: "Dacia Logan أبيض", plate: "د-44556", rating: 4.5, distance: "4.0 كم", eta: "9 دقائق", trips: 89, status: "متاح" },
  ];

  const handleAssign = () => {
    if (!selectedRequest || !selectedDriver) {
      toast({ title: "اختر الطلب والسائق أولاً", variant: "destructive" });
      return;
    }
    const driver = availableDrivers.find(d => d.id === selectedDriver);
    const request = pendingRequests.find(r => r.id === selectedRequest);
    toast({ title: `✅ تم تعيين ${driver?.name} للطلب ${request?.id} (${request?.client})` });
    setSelectedRequest(null);
    setSelectedDriver(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        {selectedRequest && selectedDriver && (
          <Button onClick={handleAssign} className="gradient-primary text-primary-foreground rounded-xl">
            <Check className="w-4 h-4 ml-2" /> تأكيد التعيين
          </Button>
        )}
        <h1 className="text-xl font-bold text-foreground">تعيين السائقين</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pending Requests */}
        <div>
          <h2 className="text-foreground font-bold text-sm mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-warning" />
            الطلبات المعلقة ({pendingRequests.length})
          </h2>
          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <motion.button key={req.id}
                onClick={() => setSelectedRequest(req.id)}
                className={`w-full gradient-card rounded-xl p-4 border text-right transition-all ${
                  selectedRequest === req.id ? "border-primary glow-ring-orange" : "border-border hover:border-primary/20"
                }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-bold">{req.price}</span>
                    <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{req.service}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div>
                      <span className="text-foreground font-medium text-sm">{req.client}</span>
                      <p className="text-xs text-muted-foreground">{req.phone}</p>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">{req.id}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-warning">{req.time}</span>
                  <span>•</span>
                  <MapPin className="w-3 h-3 text-success" /> {req.pickup}
                  <Navigation className="w-3 h-3 text-destructive" /> {req.dest}
                </div>
                {selectedRequest === req.id && (
                  <div className="mt-2 pt-2 border-t border-border flex gap-2">
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30 rounded-lg text-xs flex-1">رفض</Button>
                    <Button size="sm" variant="outline" className="text-warning border-warning/30 rounded-lg text-xs flex-1">
                      <ArrowLeftRight className="w-3 h-3 ml-1" /> إعادة تعيين
                    </Button>
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Available Drivers */}
        <div>
          <h2 className="text-foreground font-bold text-sm mb-3 flex items-center gap-2">
            <Car className="w-4 h-4 text-success" />
            السائقون المتاحون ({availableDrivers.length})
          </h2>
          <div className="space-y-2">
            {availableDrivers.map((d) => (
              <motion.button key={d.id}
                onClick={() => setSelectedDriver(d.id)}
                className={`w-full gradient-card rounded-xl p-4 border text-right transition-all ${
                  selectedDriver === d.id ? "border-primary glow-ring-orange" : "border-border hover:border-primary/20"
                }`}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Car className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-warning fill-warning" />
                        <span className="text-xs text-warning">{d.rating}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground">{d.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{d.car} • {d.plate}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="text-info">{d.distance}</span>
                      <span>وصول: {d.eta}</span>
                      <span>{d.trips} رحلة</span>
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RideAssign;
