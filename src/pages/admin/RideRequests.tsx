import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { FileText, MapPin, Car, Loader2, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/firestoreClient";

interface RideRequest {
  id: string; pickup: string; destination: string; price: number | null;
  status: string; created_at: string; user_id: string;
}

const AdminRideRequests = () => {
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [filter, setFilter] = useState<"pending" | "accepted" | "rejected" | "all">("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningRequest, setAssigningRequest] = useState<RideRequest | null>(null);
  const [availableDrivers, setAvailableDrivers] = useState<{ id: string; name: string; rating: number | null }[]>([]);

  const fetchRequests = useCallback(async () => {
    let q = supabase.from("ride_requests").select("*").order("created_at", { ascending: false }).limit(50);
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    if (data) setRequests(data);
  }, [filter]);

  useEffect(() => {
    fetchRequests();
    const ch = supabase.channel("admin-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_requests" }, fetchRequests)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchRequests]);

  const handleAccept = async (req: RideRequest) => {
    setProcessingId(req.id);
    try {
      const { data: drivers } = await supabase.from("drivers").select("id, user_id, rating").eq("status", "active").limit(1) as any;
      if (!drivers?.length) { toast({ title: "لا يوجد سائقين متاحين", variant: "destructive" }); return; }
      await supabase.from("ride_requests").update({ status: "accepted" }).eq("id", req.id);
      await supabase.from("trips").insert({
        user_id: req.user_id, driver_id: drivers[0].id, start_location: req.pickup,
        end_location: req.destination, fare: req.price || 0, status: "in_progress",
      });
      toast({ title: "تم قبول الطلب وتعيين سائق" });
      fetchRequests();
    } catch (e: any) { toast({ title: "خطأ", description: e.message, variant: "destructive" }); }
    finally { setProcessingId(null); }
  };

  const handleCancel = async (req: RideRequest) => {
    setProcessingId(req.id);
    try {
      await supabase.from("ride_requests").update({ status: "rejected" }).eq("id", req.id);
      toast({ title: "تم إلغاء الطلب" });
      fetchRequests();
    } catch (e: any) { toast({ title: "خطأ", description: e.message, variant: "destructive" }); }
    finally { setProcessingId(null); }
  };

  const handleOpenAssign = async (req: RideRequest) => {
    setAssigningRequest(req);
    setAssignDialogOpen(true);
    const { data: driversData } = await supabase.from("drivers").select("id, user_id, rating").eq("status", "active") as any;
    if (driversData?.length) {
      const uids = driversData.map((d: any) => d.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", uids);
      const nameMap = new Map(profiles?.map(p => [p.id, p.name]) || []);
      setAvailableDrivers(driversData.map((d: any) => ({ id: d.id, name: nameMap.get(d.user_id) || "سائق", rating: d.rating })));
    } else setAvailableDrivers([]);
  };

  const handleAssignDriver = async (driverId: string) => {
    if (!assigningRequest) return;
    setProcessingId(assigningRequest.id);
    try {
      await supabase.from("ride_requests").update({ status: "accepted" }).eq("id", assigningRequest.id);
      await supabase.from("trips").insert({
        user_id: assigningRequest.user_id, driver_id: driverId,
        start_location: assigningRequest.pickup, end_location: assigningRequest.destination,
        fare: assigningRequest.price || 0, status: "in_progress",
      });
      toast({ title: "تم تعيين السائق بنجاح" });
      setAssignDialogOpen(false);
      fetchRequests();
    } catch (e: any) { toast({ title: "خطأ", description: e.message, variant: "destructive" }); }
    finally { setProcessingId(null); }
  };

  const statusColor = (s: string) => s === "pending" ? "text-warning" : s === "accepted" ? "text-success" : "text-destructive";
  const statusLabel = (s: string) => s === "pending" ? "معلق" : s === "accepted" ? "مقبول" : "مرفوض";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["all", "pending", "accepted", "rejected"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-4 py-2 rounded-lg transition-colors ${filter === f ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              {f === "all" ? "الكل" : f === "pending" ? "معلقة" : f === "accepted" ? "مقبولة" : "مرفوضة"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">طلبات الرحلات</h1>
          <FileText className="w-6 h-6 text-primary" />
        </div>
      </div>

      <div className="gradient-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right">
                <th className="p-4 text-muted-foreground font-medium">إجراءات</th>
                <th className="p-4 text-muted-foreground font-medium">الحالة</th>
                <th className="p-4 text-muted-foreground font-medium">السعر</th>
                <th className="p-4 text-muted-foreground font-medium">الوقت</th>
                <th className="p-4 text-muted-foreground font-medium">الوجهة</th>
                <th className="p-4 text-muted-foreground font-medium">نقطة الانطلاق</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">لا توجد طلبات</td></tr>
              )}
              {requests.map((req) => (
                <motion.tr key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="p-4">
                    {req.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={processingId === req.id} onClick={() => handleAccept(req)}
                          className="text-xs h-7 text-success border-success/30 hover:bg-success/10">
                          {processingId === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><CheckCircle className="w-3 h-3 ml-1" />قبول</>}
                        </Button>
                        <Button size="sm" variant="outline" disabled={processingId === req.id} onClick={() => handleOpenAssign(req)}
                          className="text-xs h-7 text-info border-info/30 hover:bg-info/10">تعيين</Button>
                        <Button size="sm" variant="outline" disabled={processingId === req.id} onClick={() => handleCancel(req)}
                          className="text-xs h-7 text-destructive border-destructive/30 hover:bg-destructive/10">
                          <XCircle className="w-3 h-3 ml-1" />إلغاء
                        </Button>
                      </div>
                    )}
                  </td>
                  <td className="p-4"><span className={`text-xs px-2 py-1 rounded-full ${statusColor(req.status)} bg-secondary`}>{statusLabel(req.status)}</span></td>
                  <td className="p-4 text-primary font-semibold">{req.price || 0} ر.س</td>
                  <td className="p-4 text-muted-foreground text-xs">{new Date(req.created_at).toLocaleString("ar-SA", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}</td>
                  <td className="p-4 text-foreground truncate max-w-[200px]">{req.destination || "—"}</td>
                  <td className="p-4 text-foreground truncate max-w-[200px]">{req.pickup || "—"}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="gradient-card border-border" dir="rtl">
          <DialogHeader><DialogTitle className="text-foreground">تعيين سائق للطلب</DialogTitle></DialogHeader>
          {assigningRequest && (
            <div className="mb-3 p-3 rounded-lg bg-secondary/50 text-sm">
              <p className="text-foreground font-medium">{assigningRequest.pickup}</p>
              <p className="text-muted-foreground text-xs">← {assigningRequest.destination}</p>
              <p className="text-primary font-semibold mt-1">{assigningRequest.price || 0} ر.س</p>
            </div>
          )}
          {availableDrivers.length === 0
            ? <p className="text-center text-muted-foreground py-4">لا يوجد سائقين متاحين</p>
            : <div className="space-y-2 max-h-64 overflow-auto">
                {availableDrivers.map(d => (
                  <button key={d.id} disabled={processingId !== null} onClick={() => handleAssignDriver(d.id)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                    <Button size="sm" variant="outline" className="text-xs text-primary border-primary/30">
                      {processingId ? <Loader2 className="w-3 h-3 animate-spin" /> : "تعيين"}
                    </Button>
                    <div className="flex items-center gap-3">
                      <div><p className="text-sm text-foreground font-medium">{d.name}</p><p className="text-xs text-warning">★ {d.rating || "—"}</p></div>
                      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"><Car className="w-4 h-4 text-primary" /></div>
                    </div>
                  </button>
                ))}
              </div>
          }
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRideRequests;
