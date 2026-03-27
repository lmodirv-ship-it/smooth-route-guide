import { useState, useEffect, useCallback } from "react";
import { Search, Car, Star, Phone, MessageCircle, Bike, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    ? drivers.filter(d => d.name.includes(query) || d.phone.includes(query) || d.license_no?.includes(query) || d.driver_code?.includes(query))
    : drivers;

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      active: { label: "متصل", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
      inactive: { label: "غير متصل", color: "bg-muted text-muted-foreground border-border" },
      busy: { label: "في مهمة", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    };
    return map[status] || { label: status, color: "bg-muted text-muted-foreground border-border" };
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs">{drivers.length} سائق • {drivers.filter(d => d.status === "active").length} متاح</Badge>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Car className="w-5 h-5 text-primary" />
          السائقون
        </h1>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="بحث بالاسم، الهاتف أو الكود..."
          className="pr-10" />
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right text-sm font-bold">الكود</TableHead>
              <TableHead className="text-right text-sm font-bold">الاسم</TableHead>
              <TableHead className="text-right text-sm font-bold">الهاتف</TableHead>
              <TableHead className="text-right text-sm font-bold">الرخصة</TableHead>
              <TableHead className="text-center text-sm font-bold">الحالة</TableHead>
              <TableHead className="text-center text-sm font-bold">التقييم</TableHead>
              <TableHead className="text-center text-sm font-bold">طلبات نشطة</TableHead>
              <TableHead className="text-center text-sm font-bold">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">لا توجد نتائج</TableCell>
              </TableRow>
            ) : filtered.map(d => {
              const sb = getStatusBadge(d.status);
              return (
                <TableRow key={d.id} className={`cursor-pointer transition-colors ${selected === d.id ? "bg-primary/5" : ""}`} onClick={() => setSelected(selected === d.id ? null : d.id)}>
                  <TableCell className="font-mono text-sm font-bold text-primary">{d.driver_code || "—"}</TableCell>
                  <TableCell className="font-medium text-sm">{d.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.phone || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.license_no || "—"}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={`${sb.color} text-xs`}>{sb.label}</Badge>
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {d.rating ? <span className="text-amber-400 flex items-center justify-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400" />{Number(d.rating).toFixed(1)}</span> : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {d.activeOrders.length > 0 ? (
                      <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs">{d.activeOrders.length}</Badge>
                    ) : <span className="text-muted-foreground text-sm">0</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {d.phone && (
                        <>
                          <a href={`tel:${d.phone}`} onClick={e => e.stopPropagation()}>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
                              <Phone className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                          <a href={`https://wa.me/${d.phone.replace(/[^0-9]/g, "")}`} target="_blank" onClick={e => e.stopPropagation()}>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
                              <MessageCircle className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Detail panel for selected driver */}
      {selected && (() => {
        const d = drivers.find(dr => dr.id === selected);
        if (!d) return null;
        return (
          <div className="rounded-xl border border-border p-5 bg-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {d.phone && (
                  <>
                    <a href={`tel:${d.phone}`}>
                      <Button size="sm" variant="outline" className="h-8 gap-1 text-blue-400 border-blue-400/30 text-xs">
                        <Phone className="w-3.5 h-3.5" />اتصال
                      </Button>
                    </a>
                    <a href={`https://wa.me/${d.phone.replace(/[^0-9]/g, "")}`} target="_blank">
                      <Button size="sm" variant="outline" className="h-8 gap-1 text-emerald-400 border-emerald-400/30 text-xs">
                        <MessageCircle className="w-3.5 h-3.5" />واتساب
                      </Button>
                    </a>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{d.name}</h3>
                  <p className="text-xs text-muted-foreground">{d.driver_code || "—"} • {d.phone}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bike className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              {[
                { label: "GPS", value: d.current_lat ? `${Number(d.current_lat).toFixed(4)}, ${Number(d.current_lng).toFixed(4)}` : "غير متاح" },
                { label: "آخر تحديث", value: d.location_updated_at ? new Date(d.location_updated_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) : "—" },
                { label: "النوع", value: d.driver_type === "delivery" ? "توصيل" : "نقل" },
                { label: "التقييم", value: d.rating ? `⭐ ${Number(d.rating).toFixed(1)}` : "—" },
              ].map((item, i) => (
                <div key={i} className="bg-secondary/20 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>

            {d.activeOrders.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-foreground mb-2">الطلبات النشطة</h4>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right text-xs">الطلب</TableHead>
                        <TableHead className="text-right text-xs">المتجر</TableHead>
                        <TableHead className="text-center text-xs">الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {d.activeOrders.map((o: any) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-mono text-xs">#{o.id.slice(0, 6)}</TableCell>
                          <TableCell className="text-xs">{o.store_name || "طلب"}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="text-[10px]">{o.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};

export default DriverSearchCC;
