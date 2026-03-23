import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, User, Phone, Mail, Car, Wallet, Star, AlertTriangle, Shield, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const formatJoinedDate = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ar-MA", { month: "long", year: "numeric" });
};

const CustomerSearch = () => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100);
    const ids = (profiles || []).map((profile: any) => profile.id);

    if (ids.length === 0) {
      setCustomers([]);
      setSelected(null);
      setLoading(false);
      return;
    }

    const [tripsRes, walletsRes, complaintsRes, ratingsRes] = await Promise.all([
      supabase.from("trips").select("*").in("user_id", ids).order("created_at", { ascending: false }),
      supabase.from("wallet").select("user_id, balance").in("user_id", ids),
      supabase.from("complaints").select("*").in("user_id", ids).order("created_at", { ascending: false }),
      supabase.from("ratings").select("user_id, score").in("user_id", ids),
    ]);

    const tripMap = new Map<string, any[]>();
    (tripsRes.data || []).forEach((trip: any) => {
      if (!tripMap.has(trip.user_id)) tripMap.set(trip.user_id, []);
      tripMap.get(trip.user_id)!.push(trip);
    });

    const walletMap = new Map<string, number>((walletsRes.data || []).map((wallet: any) => [wallet.user_id, Number(wallet.balance || 0)]));

    const complaintsMap = new Map<string, any[]>();
    (complaintsRes.data || []).forEach((complaint: any) => {
      if (!complaintsMap.has(complaint.user_id)) complaintsMap.set(complaint.user_id, []);
      complaintsMap.get(complaint.user_id)!.push(complaint);
    });

    const ratingsMap = new Map<string, number[]>();
    (ratingsRes.data || []).forEach((rating: any) => {
      if (!ratingsMap.has(rating.user_id)) ratingsMap.set(rating.user_id, []);
      ratingsMap.get(rating.user_id)!.push(Number(rating.score || 0));
    });

    const nextCustomers = (profiles || []).map((profile: any) => {
      const customerTrips = tripMap.get(profile.id) || [];
      const customerComplaints = complaintsMap.get(profile.id) || [];
      const customerRatings = ratingsMap.get(profile.id) || [];
      const averageRating = customerRatings.length
        ? customerRatings.reduce((sum, score) => sum + score, 0) / customerRatings.length
        : 5;

      return {
        id: profile.id,
        name: profile.name || profile.fullName || "عميل",
        phone: profile.phone || "—",
        email: profile.email || "—",
        trips: customerTrips.length,
        wallet: `${Number(walletMap.get(profile.id) || 0).toFixed(2)} DH`,
        rating: averageRating,
        status: profile.status === "blocked" ? "محظور" : "نشط",
        joined: formatJoinedDate(profile.created_at),
        complaints: customerComplaints.map((complaint: any) => ({
          id: complaint.id,
          desc: complaint.description,
          date: complaint.created_at ? new Date(complaint.created_at).toLocaleDateString("ar-MA") : "—",
          status: complaint.status === "closed" ? "محلول" : complaint.status === "open" ? "مفتوح" : complaint.status,
        })),
        recentTrips: customerTrips.slice(0, 5).map((trip: any) => ({
          from: trip.start_location || "—",
          to: trip.end_location || "—",
          date: trip.created_at ? new Date(trip.created_at).toLocaleDateString("ar-MA") : "—",
          price: `${Number(trip.fare || 0)} DH`,
        })),
      };
    });

    setCustomers(nextCustomers);
    setSelected((current) => (current && nextCustomers.some((customer) => customer.id === current) ? current : nextCustomers[0]?.id || null));
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchCustomers();
    const channel = supabase
      .channel("customer-search-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchCustomers)
      .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, fetchCustomers)
      .on("postgres_changes", { event: "*", schema: "public", table: "wallet" }, fetchCustomers)
      .on("postgres_changes", { event: "*", schema: "public", table: "complaints" }, fetchCustomers)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCustomers]);

  const filtered = useMemo(() => {
    if (!query.trim()) return customers;
    const normalized = query.toLowerCase();
    return customers.filter((customer) =>
      [customer.name, customer.phone, customer.email].some((value) => String(value || "").toLowerCase().includes(normalized))
    );
  }, [customers, query]);

  const selectedCustomer = customers.find((customer) => customer.id === selected) || null;

  const handleToggleStatus = async () => {
    if (!selectedCustomer) return;
    // profiles table doesn't have status column - this is a no-op placeholder
    toast({ title: "هذه الميزة غير متوفرة حالياً" });
    return;
    toast({ title: selectedCustomer.status === "نشط" ? "تم حظر العميل" : "تم تفعيل العميل" });
    await fetchCustomers();
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-4">بحث العملاء</h1>
      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث بالاسم أو رقم الهاتف أو البريد..."
          className="bg-secondary border-border rounded-xl pr-9 text-right"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          {filtered.map((customer) => (
            <button key={customer.id} onClick={() => setSelected(customer.id)}
              className={`w-full gradient-card rounded-xl p-4 border text-right transition-all ${
                selected === customer.id ? "border-primary glow-ring-orange" : "border-border hover:border-primary/20"
              }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-info" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${customer.status === "نشط" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{customer.status}</span>
                    <p className="text-sm font-medium text-foreground">{customer.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{customer.phone}</p>
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">لا توجد نتائج</div>}
        </div>

        {selectedCustomer ? (
          <div className="lg:col-span-2 space-y-4">
            <div className="gradient-card rounded-xl p-5 border border-border">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-info/10 flex items-center justify-center">
                  <User className="w-8 h-8 text-info" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground">{selectedCustomer.name}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${selectedCustomer.status === "نشط" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{selectedCustomer.status}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Star className="w-3 h-3 text-warning fill-warning" /> {selectedCustomer.rating.toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">عضو منذ {selectedCustomer.joined}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="border-border rounded-lg text-xs" onClick={() => void handleToggleStatus()}>
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
                ].map((item, index) => (
                  <div key={index} className="bg-secondary/30 rounded-lg p-3 text-center">
                    <item.icon className="w-4 h-4 text-primary mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="gradient-card rounded-xl p-4 border border-border">
              <h3 className="text-foreground font-bold text-sm mb-3 flex items-center gap-2">
                <Car className="w-4 h-4 text-primary" /> سجل الرحلات
              </h3>
              {selectedCustomer.recentTrips.length > 0 ? (
                <div className="space-y-2">
                  {selectedCustomer.recentTrips.map((trip: any, index: number) => (
                    <div key={`${selectedCustomer.id}-${index}`} className="flex items-center justify-between text-sm bg-secondary/30 rounded-lg p-3">
                      <span className="text-primary font-bold">{trip.price}</span>
                      <div className="text-right">
                        <span className="text-foreground">{trip.from} → {trip.to}</span>
                        <p className="text-xs text-muted-foreground">{trip.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-3">لا توجد رحلات</p>
              )}
            </div>

            <div className="gradient-card rounded-xl p-4 border border-border">
              <h3 className="text-foreground font-bold text-sm mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" /> الشكاوى ({selectedCustomer.complaints.length})
              </h3>
              {selectedCustomer.complaints.length > 0 ? (
                <div className="space-y-2">
                  {selectedCustomer.complaints.map((complaint: any) => (
                    <div key={complaint.id} className="flex items-center justify-between text-sm bg-secondary/30 rounded-lg p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        complaint.status === "محلول" ? "bg-success/10 text-success" : complaint.status === "مفتوح" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                      }`}>{complaint.status}</span>
                      <div className="text-right">
                        <span className="text-foreground">{complaint.desc}</span>
                        <p className="text-xs text-muted-foreground">{complaint.date} • {complaint.id.slice(0, 6)}</p>
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
