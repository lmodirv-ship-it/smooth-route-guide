import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Headphones, Phone, PhoneOff, MessageCircle, Clock, CheckCircle, AlertCircle, User, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/firestoreClient";

const AdminCallCenter = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [activeCall, setActiveCall] = useState(false);

  const fetchTickets = async () => {
    const { data } = await supabase.from("call_center").select("*").order("created_at", { ascending: false }).limit(50);
    if (!data) return;
    const uids = [...new Set(data.map(t => t.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("id, name, phone").in("id", uids);
    const nameMap = new Map(profiles?.map(p => [p.id, p]) || []);
    setTickets(data.map(t => ({ ...t, userName: nameMap.get(t.user_id)?.name || "—", userPhone: nameMap.get(t.user_id)?.phone || "—" })));
  };

  useEffect(() => {
    fetchTickets();
    const ch = supabase.channel("admin-callcenter")
      .on("postgres_changes", { event: "*", schema: "public", table: "call_center" }, fetchTickets)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const updateTicketStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("call_center").update({ status }).eq("id", id);
    if (error) { toast({ title: "خطأ", variant: "destructive" }); return; }
    toast({ title: `تم تحديث الحالة إلى: ${status}` });
    fetchTickets();
    if (selectedTicket?.id === id) setSelectedTicket({ ...selectedTicket, status });
  };

  const statusColor = (s: string) => s === "open" ? "text-warning" : s === "in_progress" ? "text-info" : "text-success";
  const statusLabel = (s: string) => s === "open" ? "مفتوح" : s === "in_progress" ? "قيد المعالجة" : "مغلق";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-info border-info/30">{tickets.filter(t => t.status === "open").length} تذاكر مفتوحة</Badge>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">مركز الاتصال</h1>
          <Headphones className="w-6 h-6 text-primary" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="gradient-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="بحث..." className="bg-secondary/60 border-border h-9 rounded-lg pr-9 text-sm" />
            </div>
          </div>
          <div className="divide-y divide-border/50 max-h-[500px] overflow-auto">
            {tickets.map(t => (
              <button key={t.id} onClick={() => setSelectedTicket(t)}
                className={`w-full p-3 text-right hover:bg-secondary/30 transition-colors ${selectedTicket?.id === t.id ? "bg-secondary/50" : ""}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full bg-secondary ${statusColor(t.status)}`}>{statusLabel(t.status)}</span>
                  <span className="text-sm font-medium text-foreground">{t.userName}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{t.request || "—"}</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 justify-end">
                  <Clock className="w-3 h-3" />{new Date(t.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="gradient-card rounded-xl border border-border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setActiveCall(!activeCall)}
                    className={activeCall ? "bg-destructive" : "gradient-primary text-primary-foreground"}>
                    {activeCall ? <><PhoneOff className="w-4 h-4 ml-1" />إنهاء</> : <><Phone className="w-4 h-4 ml-1" />اتصال</>}
                  </Button>
                </div>
                <div className="text-right">
                  <h3 className="text-xl font-bold text-foreground">{selectedTicket.userName}</h3>
                  <p className="text-sm text-muted-foreground">{selectedTicket.userPhone}</p>
                </div>
              </div>

              {activeCall && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="gradient-primary rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary-foreground animate-pulse" />
                    <span className="text-primary-foreground text-sm font-medium">مكالمة جارية</span>
                  </div>
                </motion.div>
              )}

              <div className="bg-secondary/50 rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">تفاصيل الطلب</p>
                <p className="text-sm text-foreground">{selectedTicket.request || "لا توجد تفاصيل"}</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => updateTicketStatus(selectedTicket.id, "resolved")}
                  className="gradient-card rounded-xl p-4 border border-border flex flex-col items-center gap-2 hover:border-success/30 transition-colors">
                  <CheckCircle className="w-6 h-6 text-success" /><span className="text-sm text-foreground">حل</span>
                </button>
                <button onClick={() => updateTicketStatus(selectedTicket.id, "in_progress")}
                  className="gradient-card rounded-xl p-4 border border-border flex flex-col items-center gap-2 hover:border-warning/30 transition-colors">
                  <AlertCircle className="w-6 h-6 text-warning" /><span className="text-sm text-foreground">قيد المعالجة</span>
                </button>
                <button className="gradient-card rounded-xl p-4 border border-border flex flex-col items-center gap-2 hover:border-info/30 transition-colors">
                  <User className="w-6 h-6 text-info" /><span className="text-sm text-foreground">بيانات العميل</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="gradient-card rounded-xl border border-border p-12 flex items-center justify-center">
              <div className="text-center">
                <Headphones className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">اختر تذكرة لعرض التفاصيل</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCallCenter;
