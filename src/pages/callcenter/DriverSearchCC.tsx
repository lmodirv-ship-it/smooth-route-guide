import { useState } from "react";
import { Search, Car, Star, MapPin, Phone, Wifi, WifiOff } from "lucide-react";
import { Input } from "@/components/ui/input";

const DriverSearch = () => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  const drivers = [
    { id: 1, name: "أحمد الفاسي", phone: "+212 6XX-D01", car: "Toyota Camry", plate: "أ-12345", rating: 4.9, trips: 342, status: "متصل" },
    { id: 2, name: "خالد المنصوري", phone: "+212 6XX-D02", car: "Hyundai Sonata", plate: "ب-67890", rating: 4.7, trips: 215, status: "في رحلة" },
    { id: 3, name: "سعيد بنعمر", phone: "+212 6XX-D03", car: "Kia Optima", plate: "ج-11223", rating: 4.8, trips: 128, status: "غير متصل" },
  ];

  const filtered = query ? drivers.filter(d => d.name.includes(query) || d.phone.includes(query)) : drivers;

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-4">بحث السائقين</h1>
      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث بالاسم أو الهاتف..." className="bg-secondary border-border rounded-xl pr-9 text-right" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          {filtered.map(d => (
            <button key={d.id} onClick={() => setSelected(d.id)}
              className={`w-full gradient-card rounded-xl p-4 border text-right ${selected === d.id ? "border-primary" : "border-border hover:border-primary/20"}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Car className="w-5 h-5 text-primary" /></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.car} • {d.plate}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${d.status === "متصل" ? "bg-success/10 text-success" : d.status === "في رحلة" ? "bg-info/10 text-info" : "bg-destructive/10 text-destructive"}`}>
                  {d.status}
                </span>
              </div>
            </button>
          ))}
        </div>

        {selected && (() => {
          const d = drivers.find(x => x.id === selected)!;
          return (
            <div className="gradient-card rounded-xl p-6 border border-border">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center"><Car className="w-7 h-7 text-primary" /></div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{d.name}</h3>
                  <div className="flex items-center gap-1"><Star className="w-3 h-3 text-warning fill-warning" /><span className="text-xs text-warning">{d.rating}</span></div>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { icon: Phone, label: "الهاتف", value: d.phone },
                  { icon: Car, label: "السيارة", value: `${d.car} (${d.plate})` },
                  { icon: MapPin, label: "الرحلات", value: `${d.trips} رحلة` },
                  { icon: d.status === "غير متصل" ? WifiOff : Wifi, label: "الحالة", value: d.status },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.value}</span>
                    <div className="flex items-center gap-2"><span className="text-foreground">{item.label}</span><item.icon className="w-4 h-4 text-primary" /></div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default DriverSearch;
