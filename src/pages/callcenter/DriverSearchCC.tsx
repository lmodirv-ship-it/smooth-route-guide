import { useState, useEffect, useCallback } from "react";
import { Search, Car, Star, MapPin, Phone, MessageCircle, Clock, User, Bike, Navigation, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const DriverSearchCC = () => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDrivers = useCallback(async () => {
    const { data: driverRows } = await supabase.from("drivers").select("*").order("created_at", { ascending: false });
    if (driverRows) {
      const uids = driverRows.map(d => d.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, name, phone, email").in("id", uids);
      const pMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Get current orders for each driver
      const driverIds = driverRows.map(d => d.id);
      const { data: activeOrders } = await supabase.from("delivery_orders")
        .select("id, driver_id, status, store_name")
        .in("driver_id", driverIds)
        .not("status", "in", "(delivered,cancelled)");
      const orderMap = new Map<string, any[]>();
      activeOrders?.forEach(o => {
        if (!orderMap.has(o.driver_id!)) orderMap.set(o.driver_id!, []);
        orderMap.get(o.driver_id!)!.push(o);
      });

      setDrivers(driverRows.map(d => ({
        ...d,
        name: (pMap.get(d.user_id) as any)?.name || "سائق",
        phone: (pMap.get(d.user_id) as any)?.phone || "",
        email: (pMap.get(d.user_id) as any)?.email || "",
        activeOrders: orderMap.get(d.id) || [],
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDrivers();
    const ch = supabase.channel("cc-drivers-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, fetchDrivers)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchDrivers]);

  const filtered = query
    ? drivers.filter(d => d.name.includes(query) || d.phone.includes(query) || d.license_no?.includes(query))
    : drivers;

  const selectedDriver = drivers.find(d => d.id === selected);

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      active: { label: "متصل", color: "text-success", bg: "bg-success/10" },
      inactive: { label: "غير متصل", color: "text-destructive", bg: "bg-destructive/10" },
      busy: { label: "في مهمة", color: "text-info", bg: "bg-info/10" },
    };
    return map[status] || { label: status, color: "text-muted-foreground", bg: "bg-secondary" };
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{drivers.length} سائق مسجل • {drivers.filter(d => d.status === "active").length} متاح</span>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Car className="w-5 h-5 text-primary" />
          السائقون
        </h1>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="بحث بالاسم أو الهاتف..."
          className="bg-card border-border rounded-xl pr-9 text-right h-10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-2 max-h-[70vh] overflow-auto">
          {filtered.map(d => {
            const sb = getStatusBadge(d.status);
            return (
              <button key={d.id} onClick={() => setSelected(d.id)}
                className={`w-full glass rounded-xl p-4 border text-right transition-all ${
                  selected === d.id ? "border-primary glow-ring-orange" : "border-border hover:border-primary/30"
                }`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bike className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${sb.bg} ${sb.color}`}>{sb.label}</span>
                      <p className="text-sm font-bold text-foreground truncate">{d.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{d.phone}</p>
                    {d.activeOrders.length > 0 && (
                      <p className="text-[10px] text-amber-400 mt-0.5">{d.activeOrders.length} طلب نشط</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">لا توجد نتائج</p>}
        </div>

        {selectedDriver ? (
          <div className="lg:col-span-2 space-y-4">
            <div className="glass rounded-xl p-5 border border-border">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Bike className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground">{selectedDriver.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {(() => { const sb = getStatusBadge(selectedDriver.status); return (
                      <span className={`text-xs px-2.5 py-0.5 rounded-full ${sb.bg} ${sb.color}`}>{sb.label}</span>
                    ); })()}
                    {selectedDriver.rating > 0 && (
                      <span className="text-xs text-amber-400 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400" /> {selectedDriver.rating}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedDriver.phone && (
                    <>
                      <a href={`tel:${selectedDriver.phone}`}>
                        <Button size="sm" variant="outline" className="h-8 rounded-lg gap-1 text-info border-info/30">
                          <Phone className="w-3.5 h-3.5" />اتصال
                        </Button>
                      </a>
                      <a href={`https://wa.me/${selectedDriver.phone.replace(/[^0-9]/g, "")}`} target="_blank">
                        <Button size="sm" variant="outline" className="h-8 rounded-lg gap-1 text-emerald-400 border-emerald-400/30">
                          <MessageCircle className="w-3.5 h-3.5" />واتساب
                        </Button>
                      </a>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: Phone, label: "الهاتف", value: selectedDriver.phone || "—" },
                  { icon: Car, label: "الرخصة", value: selectedDriver.license_no || "—" },
                  { icon: MapPin, label: "GPS", value: selectedDriver.current_lat ? `${Number(selectedDriver.current_lat).toFixed(4)}, ${Number(selectedDriver.current_lng).toFixed(4)}` : "غير متاح" },
                  { icon: Clock, label: "آخر تحديث", value: selectedDriver.location_updated_at ? new Date(selectedDriver.location_updated_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) : "—" },
                ].map((item, i) => (
                  <div key={i} className="bg-secondary/20 rounded-xl p-3 text-center">
                    <item.icon className="w-4 h-4 text-primary mx-auto mb-1" />
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                    <p className="text-xs font-bold text-foreground mt-0.5 truncate">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Orders */}
            {selectedDriver.activeOrders.length > 0 && (
              <div className="glass rounded-xl p-4 border border-border">
                <h3 className="text-foreground font-bold text-sm mb-3 flex items-center gap-2">
                  <Bike className="w-4 h-4 text-info" /> الطلبات النشطة
                </h3>
                <div className="space-y-2">
                  {selectedDriver.activeOrders.map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between bg-secondary/20 rounded-lg p-3">
                      <span className="text-xs text-primary font-bold">{o.status}</span>
                      <span className="text-xs text-foreground">{o.store_name || "طلب"} • #{o.id.slice(0, 6)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-2 glass rounded-2xl p-12 border border-border text-center">
            <Car className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-foreground font-bold">اختر سائقاً لعرض التفاصيل</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverSearchCC;
