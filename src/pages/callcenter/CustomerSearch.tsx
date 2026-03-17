import { useState } from "react";
import { Search, User, Phone, Mail, MapPin, Car, Clock, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";

const CustomerSearch = () => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  const customers = [
    { id: 1, name: "عبدالله أحمد", phone: "+212 6XX-001", email: "abd@hn.ma", trips: 24, wallet: "350 DH", status: "نشط" },
    { id: 2, name: "فاطمة محمد", phone: "+212 6XX-002", email: "fat@hn.ma", trips: 12, wallet: "120 DH", status: "نشط" },
    { id: 3, name: "خالد العمري", phone: "+212 6XX-003", email: "kh@hn.ma", trips: 45, wallet: "0 DH", status: "محظور" },
    { id: 4, name: "نورة السعيد", phone: "+212 6XX-004", email: "nr@hn.ma", trips: 8, wallet: "500 DH", status: "نشط" },
  ];

  const filtered = query ? customers.filter(c => c.name.includes(query) || c.phone.includes(query)) : customers;

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-4">بحث العملاء</h1>
      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث بالاسم أو رقم الهاتف..." className="bg-secondary border-border rounded-xl pr-9 text-right" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          {filtered.map(c => (
            <button key={c.id} onClick={() => setSelected(c.id)}
              className={`w-full gradient-card rounded-xl p-4 border text-right ${selected === c.id ? "border-primary" : "border-border hover:border-primary/20"}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center"><User className="w-5 h-5 text-info" /></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.phone}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === "نشط" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{c.status}</span>
              </div>
            </button>
          ))}
        </div>

        {selected && (() => {
          const c = customers.find(x => x.id === selected)!;
          return (
            <div className="gradient-card rounded-xl p-6 border border-border">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-info/10 flex items-center justify-center"><User className="w-7 h-7 text-info" /></div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{c.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === "نشط" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{c.status}</span>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { icon: Phone, label: "الهاتف", value: c.phone },
                  { icon: Mail, label: "البريد", value: c.email },
                  { icon: Car, label: "الرحلات", value: `${c.trips} رحلة` },
                  { icon: Wallet, label: "الرصيد", value: c.wallet },
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

export default CustomerSearch;
