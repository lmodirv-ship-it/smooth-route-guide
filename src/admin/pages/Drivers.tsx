import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Car, Star, FileCheck, Power, PowerOff, Search, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Driver {
  id: string; user_id: string; license_no: string; rating: number | null;
  status: string; created_at: string; car_id: string | null; driver_type?: string;
  name?: string; vehicle?: { brand: string; model: string; plate_no: string; color: string | null } | null;
}

const AdminDrivers = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [search, setSearch] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [docs, setDocs] = useState<any[]>([]);

  const fetchDrivers = async () => {
    const { data } = await supabase.from("drivers").select("*").order("created_at", { ascending: false }) as any;
    if (!data) return;
    const uids = data.map((d: any) => d.user_id);
    const carIds = data.filter((d: any) => d.car_id).map((d: any) => d.car_id);
    const [profilesRes, vehiclesRes] = await Promise.all([
      supabase.from("profiles").select("id, name").in("id", uids),
      carIds.length ? supabase.from("vehicles").select("id, brand, model, plate_no, color").in("id", carIds) : { data: [] },
    ]);
    const nameMap = new Map(profilesRes.data?.map(p => [p.id, p.name]) || []);
    const carMap = new Map((vehiclesRes.data || []).map((v: any) => [v.id, v]));
    setDrivers(data.map((d: any) => ({ ...d, name: nameMap.get(d.user_id) || "سائق", vehicle: d.car_id ? carMap.get(d.car_id) : null })));
  };

  useEffect(() => { fetchDrivers(); }, []);

  const toggleStatus = async (driver: Driver) => {
    const newStatus = driver.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("drivers").update({ status: newStatus }).eq("id", driver.id);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    toast({ title: newStatus === "active" ? "تم تفعيل السائق" : "تم تعطيل السائق" });
    fetchDrivers();
  };

  const openDetail = async (driver: Driver) => {
    setSelectedDriver(driver);
    const { data } = await supabase.from("documents").select("*").eq("driver_id", driver.id);
    setDocs(data || []);
  };

  const filtered = drivers.filter(d => {
    if (filter === "active" && d.status !== "active") return false;
    if (filter === "inactive" && d.status !== "inactive") return false;
    if (search && !d.name?.includes(search) && !d.license_no.includes(search)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-2 items-center">
          <div className="relative w-56">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث بالاسم أو الرخصة..." value={search} onChange={e => setSearch(e.target.value)}
              className="bg-secondary/60 border-border h-9 rounded-lg pr-9 text-sm" />
          </div>
          {(["all", "active", "inactive"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-4 py-2 rounded-lg transition-colors ${filter === f ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {f === "all" ? "الكل" : f === "active" ? "نشط" : "غير نشط"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">إدارة السائقين</h1>
          <Car className="w-6 h-6 text-primary" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((driver) => (
          <motion.div key={driver.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="gradient-card rounded-xl border border-border p-4 hover:border-primary/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openDetail(driver)} className="text-xs h-7 text-info border-info/30">
                  <Eye className="w-3 h-3 ml-1" />عرض
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggleStatus(driver)}
                  className={`text-xs h-7 ${driver.status === "active" ? "text-destructive border-destructive/30" : "text-success border-success/30"}`}>
                  {driver.status === "active" ? <><PowerOff className="w-3 h-3 ml-1" />تعطيل</> : <><Power className="w-3 h-3 ml-1" />تفعيل</>}
                </Button>
              </div>
              <div className="flex items-center gap-3 text-right">
                <div>
                  <p className="text-sm font-semibold text-foreground">{driver.name}</p>
                  <p className="text-xs text-muted-foreground">{driver.license_no || "—"}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <Car className="w-5 h-5 text-primary" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <Badge variant="outline" className={driver.status === "active" ? "text-success border-success/30" : "text-muted-foreground border-border"}>
                {driver.status === "active" ? "متصل" : "غير متصل"}
              </Badge>
              <Badge variant="outline" className={driver.driver_type === "delivery" ? "text-info border-info/30" : "text-primary border-primary/30"}>
                {driver.driver_type === "delivery" ? "خدمة طلبيات" : driver.driver_type === "both" ? "الكل" : "توصيل زبائن"}
              </Badge>
              <div className="flex items-center gap-3">
                {driver.vehicle && <span className="text-muted-foreground">{driver.vehicle.brand} {driver.vehicle.model} - {driver.vehicle.plate_no}</span>}
                <span className="text-warning flex items-center gap-1"><Star className="w-3 h-3" /> {driver.rating || "—"}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <Dialog open={!!selectedDriver} onOpenChange={() => setSelectedDriver(null)}>
        <DialogContent className="gradient-card border-border max-w-lg" dir="rtl">
          <DialogHeader><DialogTitle className="text-foreground">تفاصيل السائق</DialogTitle></DialogHeader>
          {selectedDriver && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center"><Car className="w-8 h-8 text-primary" /></div>
                <div>
                  <p className="text-lg font-bold text-foreground">{selectedDriver.name}</p>
                  <p className="text-sm text-muted-foreground">رخصة: {selectedDriver.license_no || "—"}</p>
                  <p className="text-sm text-warning">★ {selectedDriver.rating || "—"}</p>
                </div>
              </div>
              {selectedDriver.vehicle && (
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground mb-1">السيارة</p>
                  <p className="text-sm text-foreground">{selectedDriver.vehicle.brand} {selectedDriver.vehicle.model} — {selectedDriver.vehicle.plate_no} {selectedDriver.vehicle.color ? `(${selectedDriver.vehicle.color})` : ""}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">الوثائق ({docs.length})</p>
                {docs.length === 0 ? <p className="text-xs text-muted-foreground">لا توجد وثائق</p> : (
                  <div className="space-y-2">
                    {docs.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                        <Badge variant="outline" className={doc.status === "approved" ? "text-success border-success/30" : doc.status === "rejected" ? "text-destructive border-destructive/30" : "text-warning border-warning/30"}>
                          {doc.status === "approved" ? "موافق" : doc.status === "rejected" ? "مرفوض" : "قيد المراجعة"}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-foreground">{doc.type}</span>
                          <FileCheck className="w-4 h-4 text-info" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDrivers;
