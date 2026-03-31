import { useState, useEffect, useCallback } from "react";
import { Clock, Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, User, Search, Loader2, Plus, Hash, StickyNote } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCallCenterCtx } from "@/admin/layouts/CallCenterLayout";

const PARTY_LABELS: Record<string, string> = {
  client: "عميل", driver: "سائق", delivery: "توصيل", restaurant: "مطعم", store: "متجر",
};

const CallHistory = () => {
  const callCenter = useCallCenterCtx();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [calls, setCalls] = useState<any[]>([]);
  const [callNotes, setCallNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [showNotes, setShowNotes] = useState<string | null>(null);
  const [newCall, setNewCall] = useState({ callerName: "", callerPhone: "", reason: "", callType: "incoming", partyType: "client", partyReference: "" });
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const fetchCalls = useCallback(async () => {
    const { data } = await supabase.from("call_logs").select("*").order("created_at", { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    setCalls(data || []);
    setLoading(false);
  }, [page]);

  const fetchNotesForCall = useCallback(async (callId: string) => {
    const { data } = await supabase.from("call_notes" as any).select("*").or(`call_log_id.eq.${callId},call_session_id.eq.${callId}`).order("created_at", { ascending: false });
    setCallNotes((data as any[]) || []);
  }, []);

  useEffect(() => {
    fetchCalls();
    const ch = supabase.channel(`cc-calls-rt-${Math.random().toString(36).slice(2,8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "call_logs" }, fetchCalls)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchCalls]);

  const filtered = calls.filter(c => {
    if (filter === "answered" && c.status !== "answered" && c.status !== "completed") return false;
    if (filter === "missed" && c.status !== "missed") return false;
    if (filter === "outgoing" && c.call_type !== "outgoing") return false;
    if (query && !c.caller_name?.includes(query) && !c.caller_phone?.includes(query) && !c.reason?.includes(query) && !c.call_reference?.includes(query) && !c.party_reference?.includes(query)) return false;
    return true;
  });

  const getIcon = (type: string, status: string) => {
    if (status === "missed") return <PhoneMissed className="w-4 h-4 text-destructive" />;
    if (type === "outgoing") return <PhoneOutgoing className="w-4 h-4 text-info" />;
    if (type === "system") return <Clock className="w-4 h-4 text-muted-foreground" />;
    return <PhoneIncoming className="w-4 h-4 text-success" />;
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      answered: { label: "تم الرد", color: "text-success" },
      completed: { label: "مكتمل", color: "text-success" },
      missed: { label: "فائتة", color: "text-destructive" },
      pending: { label: "معلّقة", color: "text-amber-400" },
    };
    return map[status] || { label: status, color: "text-muted-foreground" };
  };

  const addCall = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("call_logs").insert({
      caller_name: newCall.callerName,
      caller_phone: newCall.callerPhone,
      reason: newCall.reason,
      call_type: newCall.callType,
      status: "answered",
      user_id: user.id,
      party_type: newCall.partyType,
      party_reference: newCall.partyReference || null,
    });
    if (error) { toast({ title: "خطأ", variant: "destructive" }); return; }
    toast({ title: "تم تسجيل المكالمة ✅" });
    setShowNew(false);
    setNewCall({ callerName: "", callerPhone: "", reason: "", callType: "incoming", partyType: "client", partyReference: "" });
  };

  // Redial via reference
  const handleRedial = async (ref: string) => {
    if (!callCenter || !ref) return;
    await callCenter.startCallByReference(ref);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button size="sm" onClick={() => setShowNew(true)} className="rounded-lg gap-1">
          <Plus className="w-4 h-4" /> تسجيل مكالمة
        </Button>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Phone className="w-5 h-5 text-info" />
          سجل المكالمات
        </h1>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="بحث بالاسم، الرقم، أو المرجع..." className="glass-card border-border rounded-xl pr-9 text-right h-10" />
        </div>
        <div className="flex gap-2">
          {([["all", "الكل"], ["answered", "تم الرد"], ["missed", "فائتة"], ["outgoing", "صادرة"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                filter === key ? "gradient-primary text-primary-foreground" : "glass-card text-muted-foreground"
              }`}>{label}</button>
          ))}
        </div>
      </div>

      <div className="glass rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-xs">
              <td className="p-3">إجراء</td>
              <td className="p-3">ملاحظات</td>
              <td className="p-3">السبب</td>
              <td className="p-3">المدة</td>
              <td className="p-3">الحالة</td>
              <td className="p-3">النوع</td>
              <td className="p-3">الطرف</td>
              <td className="p-3">المرجع</td>
              <td className="p-3">الوقت</td>
              <td className="p-3">الهاتف</td>
              <td className="p-3 text-right">المتصل</td>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={11} className="p-8 text-center text-muted-foreground">لا توجد مكالمات</td></tr>}
            {filtered.map(c => {
              const sl = getStatusLabel(c.status);
              return (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="p-3">
                    <div className="flex gap-1">
                      {c.party_reference && (
                        <button onClick={() => handleRedial(c.party_reference)} title="إعادة الاتصال"
                          className="p-1 hover:bg-primary/10 rounded text-primary" disabled={callCenter?.busy}>
                          <Phone className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => { setShowNotes(c.id); fetchNotesForCall(c.call_session_id || c.id); }} title="ملاحظات"
                        className="p-1 hover:bg-warning/10 rounded text-warning">
                        <StickyNote className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground text-xs max-w-[120px] truncate">{c.notes || "—"}</td>
                  <td className="p-3 text-muted-foreground text-xs max-w-[150px] truncate">{c.reason || "—"}</td>
                  <td className="p-3 text-muted-foreground text-xs">{c.duration ? `${Math.floor(c.duration / 60)}:${(c.duration % 60).toString().padStart(2, "0")}` : "—"}</td>
                  <td className="p-3"><span className={`text-xs ${sl.color}`}>{sl.label}</span></td>
                  <td className="p-3">{getIcon(c.call_type, c.status)}</td>
                  <td className="p-3 text-xs text-muted-foreground">{PARTY_LABELS[c.party_type] || "—"}</td>
                  <td className="p-3">
                    <div className="flex flex-col gap-0.5">
                      {c.call_reference && <span className="font-mono text-[10px] text-primary">{c.call_reference}</span>}
                      {c.party_reference && <span className="font-mono text-[10px] text-muted-foreground">{c.party_reference}</span>}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground text-[10px]">
                    {new Date(c.created_at).toLocaleDateString("ar-SA")} {new Date(c.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="p-3 text-muted-foreground text-xs font-mono">{c.caller_phone || "—"}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-foreground text-xs font-medium">{c.caller_name || "—"}</span>
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>السابق</Button>
        <span className="text-xs text-muted-foreground">صفحة {page + 1}</span>
        <Button size="sm" variant="outline" onClick={() => setPage(p => p + 1)} disabled={filtered.length < PAGE_SIZE}>التالي</Button>
      </div>

      {/* New Call Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader><DialogTitle>تسجيل مكالمة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={newCall.callerName} onChange={e => setNewCall(f => ({ ...f, callerName: e.target.value }))}
              placeholder="اسم المتصل" className="glass-card border-border text-right" />
            <Input value={newCall.callerPhone} onChange={e => setNewCall(f => ({ ...f, callerPhone: e.target.value }))}
              placeholder="رقم الهاتف" type="tel" className="glass-card border-border text-right" />
            <Input value={newCall.partyReference} onChange={e => setNewCall(f => ({ ...f, partyReference: e.target.value }))}
              placeholder="المرجع (مثال: A123456)" className="glass-card border-border text-right font-mono" />
            <Input value={newCall.reason} onChange={e => setNewCall(f => ({ ...f, reason: e.target.value }))}
              placeholder="السبب" className="glass-card border-border text-right" />
            <Select value={newCall.partyType} onValueChange={v => setNewCall(f => ({ ...f, partyType: v }))}>
              <SelectTrigger className="glass-card border-border"><SelectValue placeholder="نوع الطرف" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="client">عميل</SelectItem>
                <SelectItem value="driver">سائق</SelectItem>
                <SelectItem value="delivery">توصيل</SelectItem>
                <SelectItem value="restaurant">مطعم</SelectItem>
                <SelectItem value="store">متجر</SelectItem>
              </SelectContent>
            </Select>
            <Select value={newCall.callType} onValueChange={v => setNewCall(f => ({ ...f, callType: v }))}>
              <SelectTrigger className="glass-card border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="incoming">واردة</SelectItem>
                <SelectItem value="outgoing">صادرة</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={addCall} className="w-full rounded-xl">تسجيل</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Call Notes Dialog */}
      <Dialog open={!!showNotes} onOpenChange={() => setShowNotes(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle>ملاحظات المكالمة</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[300px] overflow-auto">
            {callNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد ملاحظات</p>
            ) : callNotes.map((note: any) => (
              <div key={note.id} className="glass-card rounded-lg p-3 text-sm">
                <p className="text-foreground">{note.content}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(note.created_at).toLocaleString("ar-SA")}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CallHistory;
