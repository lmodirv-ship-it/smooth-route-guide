import { useState } from "react";
import { Search, Car, Star, MapPin, Phone, Wifi, WifiOff, FileCheck, Shield, Clock, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const DriverSearchCC = () => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  const drivers = [
    { id: 1, name: "أحمد الفاسي", phone: "+212 661-D01", car: "Toyota Camry", plate: "أ-12345", color: "أبيض", rating: 4.9, trips: 342, status: "متصل", location: "حي المعاريف",
      docs: [{ type: "رخصة القيادة", status: "ساري" }, { type: "التأمين", status: "ساري" }, { type: "المراقبة التقنية", status: "ساري" }],
      recentTrips: [
        { from: "المعاريف", to: "كازا فوياجور", date: "اليوم 14:30", price: "35 DH" },
        { from: "الحسني", to: "عين الشق", date: "اليوم 12:15", price: "28 DH" },
      ]
    },
    { id: 2, name: "خالد المنصوري", phone: "+212 662-D02", car: "Hyundai Sonata", plate: "ب-67890", color: "فضي", rating: 4.7, trips: 215, status: "في رحلة", location: "طريق المطار",
      docs: [{ type: "رخصة القيادة", status: "ساري" }, { type: "التأمين", status: "منتهي" }],
      recentTrips: [{ from: "محطة القطار", to: "المطار", date: "اليوم 11:00", price: "52 DH" }]
    },
    { id: 3, name: "سعيد بنعمر", phone: "+212 663-D03", car: "Kia Optima", plate: "ج-11223", color: "أسود", rating: 4.8, trips: 128, status: "غير متصل", location: "آخر موقع: حي الشرف",
      docs: [{ type: "رخصة القيادة", status: "ساري" }, { type: "التأمين", status: "ساري" }, { type: "المراقبة التقنية", status: "قريب الانتهاء" }],
      recentTrips: [{ from: "حي الشرف", to: "مركز المدينة", date: "أمس 18:00", price: "25 DH" }]
    },
  ];

  const filtered = query ? drivers.filter(d => d.name.includes(query) || d.phone.includes(query) || d.plate.includes(query)) : drivers;
  const selectedDriver = drivers.find(d => d.id === selected);

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-4">بحث السائقين</h1>
      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="ابحث بالاسم أو الهاتف أو رقم اللوحة..."
          className="bg-secondary border-border rounded-xl pr-9 text-right" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          {filtered.map(d => (
            <button key={d.id} onClick={() => setSelected(d.id)}
              className={`w-full gradient-card rounded-xl p-4 border text-right transition-all ${
                selected === d.id ? "border-primary glow-ring-orange" : "border-border hover:border-primary/20"
              }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Car className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      d.status === "متصل" ? "bg-success/10 text-success" :
                      d.status === "في رحلة" ? "bg-info/10 text-info" :
                      "bg-destructive/10 text-destructive"
                    }`}>{d.status}</span>
                    <p className="text-sm font-medium text-foreground">{d.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{d.car} • {d.plate}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {selectedDriver ? (
          <div className="lg:col-span-2 space-y-4">
            <div className="gradient-card rounded-xl p-5 border border-border">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Car className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground">{selectedDriver.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      selectedDriver.status === "متصل" ? "bg-success/10 text-success" :
                      selectedDriver.status === "في رحلة" ? "bg-info/10 text-info" :
                      "bg-destructive/10 text-destructive"
                    }`}>{selectedDriver.status}</span>
                    <span className="text-xs text-warning flex items-center gap-1"><Star className="w-3 h-3 fill-warning" /> {selectedDriver.rating}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: Phone, label: "الهاتف", value: selectedDriver.phone },
                  { icon: Car, label: "السيارة", value: `${selectedDriver.car} ${selectedDriver.color}` },
                  { icon: Shield, label: "اللوحة", value: selectedDriver.plate },
                  { icon: MapPin, label: "الموقع", value: selectedDriver.location },
                ].map((item, i) => (
                  <div key={i} className="bg-secondary/30 rounded-lg p-3 text-center">
                    <item.icon className="w-4 h-4 text-primary mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-xs font-medium text-foreground mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents */}
            <div className="gradient-card rounded-xl p-4 border border-border">
              <h3 className="text-foreground font-bold text-sm mb-3 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-info" /> الوثائق
              </h3>
              <div className="space-y-2">
                {selectedDriver.docs.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between bg-secondary/30 rounded-lg p-3 text-sm">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      doc.status === "ساري" ? "bg-success/10 text-success" :
                      doc.status === "منتهي" ? "bg-destructive/10 text-destructive" :
                      "bg-warning/10 text-warning"
                    }`}>{doc.status}</span>
                    <span className="text-foreground">{doc.type}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Trips */}
            <div className="gradient-card rounded-xl p-4 border border-border">
              <h3 className="text-foreground font-bold text-sm mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> سجل الرحلات
              </h3>
              <div className="space-y-2">
                {selectedDriver.recentTrips.map((t, i) => (
                  <div key={i} className="flex items-center justify-between bg-secondary/30 rounded-lg p-3 text-sm">
                    <span className="text-primary font-bold">{t.price}</span>
                    <div className="text-right">
                      <span className="text-foreground">{t.from} → {t.to}</span>
                      <p className="text-xs text-muted-foreground">{t.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 gradient-card rounded-2xl p-12 border border-border text-center">
            <Car className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-foreground font-bold">اختر سائقاً لعرض التفاصيل</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverSearchCC;
