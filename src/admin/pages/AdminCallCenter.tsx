import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Headphones, Phone, PhoneOff, Clock, CheckCircle, AlertCircle,
  User, Search, Filter, RefreshCw, MessageSquare, ArrowUpDown,
  PhoneIncoming, PhoneOutgoing, XCircle, Loader2, Hash
} from "lucide-react";
import AgentStaffPanel from "@/admin/components/AgentStaffPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCallCenterCtx } from "@/admin/layouts/CallCenterLayout";

interface Ticket {
  id: string;
  request: string;
  status: string;
  created_at: string;
  user_id: string;
  agent_id: string | null;
  userName: string;
  userPhone: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  open: { label: "مفتوح", icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20" },
  in_progress: { label: "قيد المعالجة", icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
  resolved: { label: "تم الحل", icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
  closed: { label: "مغلق", icon: XCircle, color: "text-muted-foreground", bg: "bg-muted/50 border-border" },
};

const AdminCallCenter = () => {
  const callCenter = useCallCenterCtx();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [activeCall, setActiveCall] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const fetchTickets = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    const { data } = await supabase.from("call_center").select("*").order("created_at", { ascending: false }).limit(200);
    if (!data) { setLoading(false); setRefreshing(false); return; }
    const uids = [...new Set(data.map(t => t.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("id, name, phone").in("id", uids);
    const nameMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    setTickets(data.map(t => ({
      ...t,
      userName: (nameMap.get(t.user_id) as any)?.name || "—",
      userPhone: (nameMap.get(t.user_id) as any)?.phone || "—",
    })));
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchTickets();
    const ch = supabase.channel("admin-callcenter")
      .on("postgres_changes", { event: "*", schema: "public", table: "call_center" }, () => fetchTickets())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter(t => t.status === "open").length,
    inProgress: tickets.filter(t => t.status === "in_progress").length,
    resolved: tickets.filter(t => t.status === "resolved" || t.status === "closed").length,
  }), [tickets]);

  const filtered = useMemo(() => {
    return tickets.filter(t => {
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (search && !t.userName.includes(search) && !t.request.includes(search) && !t.userPhone.includes(search)) return false;
      return true;
    });
  }, [tickets, filterStatus, search]);

  const updateTicketStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("call_center").update({ status }).eq("id", id);
    if (error) { toast({ title: "خطأ في التحديث", variant: "destructive" }); return; }
    toast({ title: `✅ تم تحديث الحالة: ${STATUS_CONFIG[status]?.label || status}` });
    if (selectedTicket?.id === id) setSelectedTicket({ ...selectedTicket, status });
  };

  const formatTime = (date: string) => new Date(date).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  const formatDate = (date: string) => new Date(date).toLocaleDateString("ar-MA", { day: "numeric", month: "short" });
  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 60) return `${mins} د`;
    if (mins < 1440) return `${Math.floor(mins / 60)} س`;
    return `${Math.floor(mins / 1440)} ي`;
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5" dir="rtl">
      {/* Agent Staff Panel */}
      <AgentStaffPanel />
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Headphones className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">مركز الاتصال</h1>
            <p className="text-xs text-muted-foreground">إدارة ومتابعة جميع الطلبات الواردة</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchTickets(true)} disabled={refreshing} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "إجمالي الطلبات", value: stats.total, icon: MessageSquare, color: "text-primary", bg: "bg-primary/10" },
          { label: "مفتوحة", value: stats.open, icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-500/10" },
          { label: "قيد المعالجة", value: stats.inProgress, icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "تم حلها", value: stats.resolved, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        ].map(s => (
          <Card key={s.label} className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم، الهاتف أو الطلب..." className="pr-10" />
        </div>
        <Tabs value={filterStatus} onValueChange={setFilterStatus}>
          <TabsList className="h-10">
            <TabsTrigger value="all" className="text-xs">الكل ({stats.total})</TabsTrigger>
            <TabsTrigger value="open" className="text-xs">مفتوح ({stats.open})</TabsTrigger>
            <TabsTrigger value="in_progress" className="text-xs">قيد المعالجة ({stats.inProgress})</TabsTrigger>
            <TabsTrigger value="resolved" className="text-xs">محلول</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Ticket List */}
        <div className="rounded-xl border border-border overflow-hidden glass-card">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <PhoneIncoming className="w-4 h-4 text-primary" />
              الطلبات ({filtered.length})
            </p>
          </div>
          <div className="divide-y divide-border/50 max-h-[520px] overflow-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">لا توجد طلبات مطابقة</div>
            ) : filtered.map(t => {
              const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.open;
              const StatusIcon = cfg.icon;
              return (
                <button key={t.id} onClick={() => setSelectedTicket(t)}
                  className={`w-full p-3.5 text-right hover:bg-muted/40 transition-all ${selectedTicket?.id === t.id ? "bg-primary/5 border-r-2 border-r-primary" : ""}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <Badge variant="outline" className={`text-[10px] gap-1 ${cfg.bg} ${cfg.color} border`}>
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </Badge>
                    <span className="text-sm font-semibold text-foreground">{t.userName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mb-1.5">{t.request || "لا يوجد وصف"}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground/70">{timeAgo(t.created_at)}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />{formatTime(t.created_at)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedTicket ? (
              <motion.div key={selectedTicket.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="rounded-xl border border-border glass-card overflow-hidden">
                {/* Ticket Header */}
                <div className="p-5 border-b border-border bg-muted/20">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-2">
                      <Button size="sm" 
                        onClick={async () => {
                          if (!callCenter) return;
                          // Start real WebRTC call to this user
                          const { data: profile } = await supabase.from("profiles").select("id, name, phone, avatar_url, user_code").eq("id", selectedTicket.user_id).maybeSingle();
                          if (profile) {
                            await callCenter.startCallToParty({
                              id: profile.id,
                              name: profile.name || "مستخدم",
                              reference: profile.user_code || "A000000",
                              phone: profile.phone || "",
                              avatarUrl: profile.avatar_url,
                              partyType: "client",
                            });
                          }
                        }}
                        disabled={callCenter?.isInCall || callCenter?.busy}
                        className={callCenter?.isInCall ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"}>
                        {callCenter?.isInCall ? <><PhoneOff className="w-4 h-4 ml-1.5" />مكالمة جارية</> : <><Phone className="w-4 h-4 ml-1.5" />اتصال مباشر</>}
                      </Button>
                    </div>
                    <div className="text-right">
                      <h3 className="text-lg font-bold text-foreground flex items-center gap-2 justify-end">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {selectedTicket.userName}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5 font-mono">{selectedTicket.userPhone}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(selectedTicket.created_at)} — {formatTime(selectedTicket.created_at)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Active Call Banner */}
                <AnimatePresence>
                  {callCenter?.isInCall && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden">
                      <div className="bg-primary/10 border-b border-primary/20 px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PhoneOutgoing className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium text-primary">
                            مكالمة WebRTC جارية مع {callCenter.activeCall?.party.name}
                          </span>
                          {callCenter.activeCall?.party.reference && (
                            <span className="text-xs font-mono bg-primary/10 px-2 py-0.5 rounded text-primary">
                              {callCenter.activeCall.party.reference}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          <span className="text-xs text-primary font-mono">نشط</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Request Details */}
                <div className="p-5 space-y-4">
                  <div className="rounded-lg bg-muted/40 p-4 border border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      تفاصيل الطلب
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">{selectedTicket.request || "لا توجد تفاصيل مُقدّمة"}</p>
                  </div>

                  {/* Current Status */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">الحالة الحالية:</span>
                    <Badge variant="outline" className={`${STATUS_CONFIG[selectedTicket.status]?.bg} ${STATUS_CONFIG[selectedTicket.status]?.color}`}>
                      {STATUS_CONFIG[selectedTicket.status]?.label || selectedTicket.status}
                    </Badge>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                    {[
                      { status: "open", label: "إعادة فتح", icon: AlertCircle, hoverColor: "hover:border-orange-500/30 hover:bg-orange-500/5", iconColor: "text-orange-500" },
                      { status: "in_progress", label: "قيد المعالجة", icon: Clock, hoverColor: "hover:border-blue-500/30 hover:bg-blue-500/5", iconColor: "text-blue-500" },
                      { status: "resolved", label: "تم الحل", icon: CheckCircle, hoverColor: "hover:border-emerald-500/30 hover:bg-emerald-500/5", iconColor: "text-emerald-500" },
                      { status: "closed", label: "إغلاق", icon: XCircle, hoverColor: "hover:border-border", iconColor: "text-muted-foreground" },
                    ].map(a => (
                      <button key={a.status} onClick={() => updateTicketStatus(selectedTicket.id, a.status)}
                        disabled={selectedTicket.status === a.status}
                        className={`rounded-xl p-3 border border-border flex flex-col items-center gap-2 transition-all disabled:opacity-30 ${a.hoverColor}`}>
                        <a.icon className={`w-5 h-5 ${a.iconColor}`} />
                        <span className="text-xs text-foreground font-medium">{a.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="rounded-xl border border-border glass-card p-16 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Headphones className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-muted-foreground font-medium">اختر تذكرة لعرض التفاصيل</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">انقر على أي طلب من القائمة</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminCallCenter;
