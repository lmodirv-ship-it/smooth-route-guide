import { useState, useEffect, useCallback } from "react";
import { Clock, Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, User, Search, Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const CallHistory = () => {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newCall, setNewCall] = useState({ callerName: "", callerPhone: "", reason: "", callType: "incoming" });

  const fetchCalls = useCallback(async () => {
    const { data } = await supabase.from("call_logs").select("*").order("created_at", { ascending: false }).limit(100);
    setCalls(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCalls();
    const ch = supabase.channel("cc-calls-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "call_logs" }, fetchCalls)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchCalls]);

  const filtered = calls.filter(c => {
    if (filter === "answered" && c.status !== "answered" && c.status !== "completed") return false;
    if (filter === "missed" && c.status !== "missed") return false;
    if (filter === "outgoing" && c.call_type !== "outgoing") return false;
    if (query && !c.caller_name?.includes(query) && !c.caller_phone?.includes(query) && !c.reason?.includes(query)) return false;
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
    });
    if (error) { toast({ title: "خطأ", variant: "destructive" }); return; }
    toast({ title: "تم تسجيل المكالمة ✅" });
    setShowNew(false);
    setNewCall({ callerName: "", callerPhone: "", reason: "", callType: "incoming" });
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
            placeholder="بحث بالاسم أو الرقم..." className="glass-card border-border rounded-xl pr-9 text-right h-10" />
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
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-xs">
              <td className="p-3">السبب</td>
              <td className="p-3">المدة</td>
              <td className="p-3">الحالة</td>
              <td className="p-3">النوع</td>
              <td className="p-3">الوقت</td>
              <td className="p-3">الهاتف</td>
              <td className="p-3 text-right">المتصل</td>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">لا توجد مكالمات</td></tr>}
            {filtered.map(c => {
              const sl = getStatusLabel(c.status);
              return (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="p-3 text-muted-foreground text-xs max-w-[200px] truncate">{c.reason || "—"}</td>
                  <td className="p-3 text-muted-foreground text-xs">{c.duration ? `${Math.floor(c.duration / 60)}:${(c.duration % 60).toString().padStart(2, "0")}` : "—"}</td>
                  <td className="p-3"><span className={`text-xs ${sl.color}`}>{sl.label}</span></td>
                  <td className="p-3">{getIcon(c.call_type, c.status)}</td>
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

      {/* New Call Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader><DialogTitle>تسجيل مكالمة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={newCall.callerName} onChange={e => setNewCall(f => ({ ...f, callerName: e.target.value }))}
              placeholder="اسم المتصل" className="glass-card border-border text-right" />
            <Input value={newCall.callerPhone} onChange={e => setNewCall(f => ({ ...f, callerPhone: e.target.value }))}
              placeholder="رقم الهاتف" type="tel" className="glass-card border-border text-right" />
            <Input value={newCall.reason} onChange={e => setNewCall(f => ({ ...f, reason: e.target.value }))}
              placeholder="السبب" className="glass-card border-border text-right" />
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
    </div>
  );
};

export default CallHistory;
