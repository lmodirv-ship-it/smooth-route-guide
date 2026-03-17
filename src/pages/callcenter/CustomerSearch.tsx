import { useState } from "react";
import { Search, User, Phone, Mail, MapPin, Car, Clock, Wallet, Star, AlertTriangle, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const CustomerSearch = () => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  const customers = [
    { id: 1, name: "عبدالله أحمد", phone: "+212 661-XXX-001", email: "abd@hn.ma", trips: 24, wallet: "350 DH", rating: 4.8, status: "نشط", joined: "يناير 2025",
      complaints: [{ id: "C-1", desc: "تأخر السائق", date: "12/03", status: "محلول" }],
      recentTrips: [
        { from: "المعاريف", to: "كازا فوياجور", date: "اليوم", price: "35 DH" },
        { from: "الحسني", to: "عين الشق", date: "أمس", price: "28 DH" },
      ]
    },
    { id: 2, name: "فاطمة محمد", phone: "+212 662-XXX-002", email: "fat@hn.ma", trips: 12, wallet: "120 DH", rating: 4.9, status: "نشط", joined: "فبراير 2025",
      complaints: [],
      recentTrips: [
        { from: "محطة القطار", to: "المطار", date: "أمس", price: "52 DH" },
      ]
    },
    { id: 3, name: "خالد العمري", phone: "+212 663-XXX-003", email: "kh@hn.ma", trips: 45, wallet: "0 DH", rating: 3.2, status: "محظور", joined: "ديسمبر 2024",
      complaints: [
        { id: "C-2", desc: "سلوك غير لائق", date: "10/03", status: "مفتوح" },
        { id: "C-3", desc: "عدم الدفع", date: "08/03", status: "مصعّد" },
      ],
      recentTrips: []
    },
    { id: 4, name: "نورة السعيد", phone: "+212 664-XXX-004", email: "nr@hn.ma", trips: 8, wallet: "500 DH", rating: 5.0, status: "نشط", joined: "مارس 2025",
      complaints: [],
      recentTrips: [
        { from: "حي السلام", to: "المدينة القديمة", date: "13/03", price: "22 DH" },
      ]
    },
  ];

  const filtered = query
    ? customers.filter(c => c.name.includes(query) || c.phone.includes(query) || c.email.includes(query))
    : customers;

  const selectedCustomer = customers.find(c => c.id === selected);

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-4">بحث العملاء</h1>
      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="ابحث بالاسم أو رقم الهاتف أو البريد..."
          className="bg-secondary border-border rounded-xl pr-9 text-right"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Customer List */}
        <div className="space-y-2">
          {filtered.map(c => (
            <button key={c.id} onClick={() => setSelected(c.id)}
              className={`w-full gradient-card rounded-xl p-4 border text-right transition-all ${
                selected === c.id ? "border-primary glow-ring-orange" : "border-border hover:border-primary/20"
              }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-info" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      c.status === "نشط" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}>{c.status}</span>
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.phone}</p>
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">لا توجد نتائج</div>
          )}
        </div>

        {/* Customer Details */}
        {selectedCustomer ? (
          <div className="lg:col-span-2 space-y-4">
            {/* Profile Card */}
            <div className="gradient-card rounded-xl p-5 border border-border">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-info/10 flex items-center justify-center">
                  <User className="w-8 h-8 text-info" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground">{selectedCustomer.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      selectedCustomer.status === "نشط" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}>{selectedCustomer.status}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Star className="w-3 h-3 text-warning fill-warning" /> {selectedCustomer.rating}
                    </span>
                    <span className="text-xs text-muted-foreground">عضو منذ {selectedCustomer.joined}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="border-border rounded-lg text-xs">
                    {selectedCustomer.status === "نشط" ? "حظر" : "تفعيل"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: Phone, label: "الهاتف", value: selectedCustomer.phone },
                  { icon: Mail, label: "البريد", value: selectedCustomer.email },
                  { icon: Car, label: "الرحلات", value: `${selectedCustomer.trips} رحلة` },
                  { icon: Wallet, label: "الرصيد", value: selectedCustomer.wallet },
                ].map((item, i) => (
                  <div key={i} className="bg-secondary/30 rounded-lg p-3 text-center">
                    <item.icon className="w-4 h-4 text-primary mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Trips */}
            <div className="gradient-card rounded-xl p-4 border border-border">
              <h3 className="text-foreground font-bold text-sm mb-3 flex items-center gap-2">
                <Car className="w-4 h-4 text-primary" /> سجل الرحلات
              </h3>
              {selectedCustomer.recentTrips.length > 0 ? (
                <div className="space-y-2">
                  {selectedCustomer.recentTrips.map((t, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-secondary/30 rounded-lg p-3">
                      <span className="text-primary font-bold">{t.price}</span>
                      <div className="text-right">
                        <span className="text-foreground">{t.from} → {t.to}</span>
                        <p className="text-xs text-muted-foreground">{t.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-3">لا توجد رحلات</p>
              )}
            </div>

            {/* Complaints */}
            <div className="gradient-card rounded-xl p-4 border border-border">
              <h3 className="text-foreground font-bold text-sm mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" /> الشكاوى ({selectedCustomer.complaints.length})
              </h3>
              {selectedCustomer.complaints.length > 0 ? (
                <div className="space-y-2">
                  {selectedCustomer.complaints.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm bg-secondary/30 rounded-lg p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        c.status === "محلول" ? "bg-success/10 text-success" : c.status === "مفتوح" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                      }`}>{c.status}</span>
                      <div className="text-right">
                        <span className="text-foreground">{c.desc}</span>
                        <p className="text-xs text-muted-foreground">{c.date} • {c.id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-3 flex items-center justify-center gap-2 text-success text-sm">
                  <Shield className="w-4 h-4" /> لا توجد شكاوى
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 gradient-card rounded-2xl p-12 border border-border text-center">
            <User className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-foreground font-bold">اختر عميلاً لعرض التفاصيل</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerSearch;
