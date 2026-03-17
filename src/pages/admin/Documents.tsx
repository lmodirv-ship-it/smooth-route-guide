import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileCheck, CheckCircle, XCircle, Clock, Eye, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/firestoreClient";

interface Doc {
  id: string; driver_id: string; type: string; status: string;
  file_url: string; created_at: string; driverName?: string;
}

const AdminDocuments = () => {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const fetchDocs = async () => {
    let q = supabase.from("documents").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    if (!data) return;
    const driverIds = [...new Set(data.map(d => d.driver_id))];
    const { data: drivers } = await supabase.from("drivers").select("id, user_id").in("id", driverIds) as any;
    const uids = drivers?.map((d: any) => d.user_id) || [];
    const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", uids);
    const driverUserMap = new Map<string, string>(drivers?.map((d: any) => [d.id, d.user_id]) || []);
    const nameMap = new Map(profiles?.map(p => [p.id, p.name]) || []);
    setDocs(data.map(d => ({ ...d, driverName: nameMap.get(driverUserMap.get(d.driver_id) || "") || "سائق" })));
  };

  useEffect(() => { fetchDocs(); }, [filter]);

  const updateStatus = async (docId: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("documents").update({ status }).eq("id", docId);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    toast({ title: status === "approved" ? "تمت الموافقة" : "تم الرفض" });
    fetchDocs();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-2">
          {(["all", "pending", "approved", "rejected"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-4 py-2 rounded-lg transition-colors ${filter === f ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {f === "all" ? "الكل" : f === "pending" ? "قيد المراجعة" : f === "approved" ? "موافق عليها" : "مرفوضة"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">إدارة الوثائق</h1>
          <FileCheck className="w-6 h-6 text-primary" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {docs.length === 0 && <div className="col-span-full gradient-card rounded-xl p-12 border border-border text-center text-muted-foreground">لا توجد وثائق</div>}
        {docs.map((doc, i) => (
          <motion.div key={doc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="gradient-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="outline" className={
                doc.status === "approved" ? "text-success border-success/30" :
                doc.status === "rejected" ? "text-destructive border-destructive/30" :
                "text-warning border-warning/30"
              }>
                {doc.status === "approved" ? "موافق" : doc.status === "rejected" ? "مرفوض" : "قيد المراجعة"}
              </Badge>
              <div className="flex items-center gap-2 text-right">
                <div>
                  <p className="text-sm font-semibold text-foreground">{doc.driverName}</p>
                  <p className="text-xs text-muted-foreground">{doc.type}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"><Car className="w-4 h-4 text-primary" /></div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{new Date(doc.created_at).toLocaleDateString("ar-SA")}</p>
            <div className="flex gap-2">
              {doc.file_url && (
                <Button size="sm" variant="outline" asChild className="text-xs h-7 text-info border-info/30">
                  <a href={doc.file_url} target="_blank" rel="noreferrer"><Eye className="w-3 h-3 ml-1" />عرض</a>
                </Button>
              )}
              {doc.status === "pending" && (
                <>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(doc.id, "approved")}
                    className="text-xs h-7 text-success border-success/30 hover:bg-success/10">
                    <CheckCircle className="w-3 h-3 ml-1" />موافقة
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(doc.id, "rejected")}
                    className="text-xs h-7 text-destructive border-destructive/30 hover:bg-destructive/10">
                    <XCircle className="w-3 h-3 ml-1" />رفض
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AdminDocuments;
