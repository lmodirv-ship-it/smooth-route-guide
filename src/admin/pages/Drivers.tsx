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
import DriversLiveMapCard from "@/admin/components/DriversLiveMapCard";
import DriverRequestsTable from "@/admin/components/DriverRequestsTable";

interface Driver {
  id: string; user_id: string; license_no: string; rating: number | null;
  status: string; created_at: string; car_id: string | null; driver_type?: string;
  name?: string; vehicle?: { brand: string; model: string; plate_no: string; color: string | null } | null;
}

const AdminDrivers = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "ride" | "delivery" | "both">("all");
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
    if (typeFilter !== "all" && d.driver_type !== typeFilter) return false;
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
          <div className="w-px h-6 bg-border" />
          {(["all", "ride", "delivery", "both"] as const).map(f => (
            <button key={f} onClick={() => setTypeFilter(f)}
              className={`text-xs px-3 py-2 rounded-lg transition-colors ${typeFilter === f ? "bg-info/20 text-info border border-info/30" : "bg-secondary text-muted-foreground"}`}>
              {f === "all" ? "كل الأنواع" : f === "ride" ? "🚗 ركاب" : f === "delivery" ? "🏍️ توصيل" : "الكل"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">إدارة السائقين</h1>
          <Car className="w-6 h-6 text-primary" />
        </div>
      </div>

      <DriversLiveMapCard />

      <DriverRequestsTable />

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="border-b transition-colors">
              <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">الرمز</th>
              <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">الاسم</th>
              <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">الرخصة</th>
              <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">التقييم</th>
              <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">السيارة</th>
              <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">النوع</th>
              <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">الحالة</th>
              <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">إجراءات</th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">لا يوجد سائقون</td></tr>
            ) : filtered.map((driver) => (
              <tr key={driver.id} className="border-b transition-colors hover:bg-muted/50">
                <td className="p-4 align-middle font-mono text-sm font-bold">{(driver as any).driver_code || "—"}</td>
                <td className="p-4 align-middle font-medium">{driver.name}</td>
                <td className="p-4 align-middle text-muted-foreground text-sm">{driver.license_no || "—"}</td>
                <td className="p-4 align-middle text-warning">★ {driver.rating || "—"}</td>
                <td className="p-4 align-middle text-muted-foreground text-sm">{driver.vehicle ? `${driver.vehicle.brand} ${driver.vehicle.model} - ${driver.vehicle.plate_no}` : "—"}</td>
                <td className="p-4 align-middle text-center">
                  <Badge variant="outline" className={driver.driver_type === "delivery" ? "text-info border-info/30" : "text-primary border-primary/30"}>
                    {driver.driver_type === "delivery" ? "طلبيات" : driver.driver_type === "both" ? "الكل" : "ركاب"}
                  </Badge>
                </td>
                <td className="p-4 align-middle text-center">
                  <Badge variant="outline" className={driver.status === "active" ? "text-success border-success/30" : "text-muted-foreground border-border"}>
                    {driver.status === "active" ? "متصل" : "غير متصل"}
                  </Badge>
                </td>
                <td className="p-4 align-middle text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => openDetail(driver)} className="text-xs h-7 text-info border-info/30">
                      <Eye className="w-3 h-3 ml-1" />عرض
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleStatus(driver)}
                      className={`text-xs h-7 ${driver.status === "active" ? "text-destructive border-destructive/30" : "text-success border-success/30"}`}>
                      {driver.status === "active" ? <><PowerOff className="w-3 h-3 ml-1" />تعطيل</> : <><Power className="w-3 h-3 ml-1" />تفعيل</>}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selectedDriver} onOpenChange={() => setSelectedDriver(null)}>
        <DialogContent className="glass-card border-border max-w-lg" dir="rtl">
          <DialogHeader><DialogTitle className="text-foreground">تفاصيل السائق</DialogTitle></DialogHeader>
          {selectedDriver && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center"><Car className="w-8 h-8 text-primary" /></div>
                <div>
                  <p className="text-lg font-bold text-foreground">{selectedDriver.name}</p>
                  <p className="text-sm font-mono text-primary font-bold">{(selectedDriver as any).driver_code || "—"}</p>
                  <p className="text-sm text-muted-foreground">رخصة: {selectedDriver.license_no || "—"}</p>
                  <p className="text-sm text-warning">★ {selectedDriver.rating || "—"}</p>
                </div>
              </div>

              {/* Driver Type Selector */}
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-2">نوع السائق</p>
                <Select
                  value={selectedDriver.driver_type || "ride"}
                  onValueChange={async (val) => {
                    const { error } = await supabase.from("drivers").update({ driver_type: val }).eq("id", selectedDriver.id);
                    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
                    toast({ title: "تم تحديث نوع السائق ✅" });
                    setSelectedDriver({ ...selectedDriver, driver_type: val });
                    fetchDrivers();
                  }}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ride">🚗 توصيل زبائن</SelectItem>
                    <SelectItem value="delivery">📦 خدمة طلبيات</SelectItem>
                    <SelectItem value="both">🔄 الكل (زبائن + طلبيات)</SelectItem>
                  </SelectContent>
                </Select>
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
