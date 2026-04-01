import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, Check, X, MessageSquare, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface RechargeRequest {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  handled_by: string | null;
  handler_role: string | null;
  notes: string | null;
  created_at: string;
  user_name?: string;
  user_code?: string;
}

interface ChatMsg {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
}

const WalletRechargeRequests = () => {
  const [requests, setRequests] = useState<RechargeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RechargeRequest | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null));
    loadRequests();

    const channel = supabase
      .channel("recharge-requests-staff")
      .on("postgres_changes", { event: "*", schema: "public", table: "wallet_recharge_requests" }, () => loadRequests())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!selectedRequest) return;
    loadChat(selectedRequest.id);
    const channel = supabase
      .channel(`recharge-chat-${selectedRequest.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "recharge_chat_messages", filter: `request_id=eq.${selectedRequest.id}` }, () => loadChat(selectedRequest.id))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedRequest?.id]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const loadRequests = async () => {
    const { data } = await supabase
      .from("wallet_recharge_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (!data) { setLoading(false); return; }

    const userIds = [...new Set(data.map(r => r.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("id, name, user_code").in("id", userIds);
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

    setRequests(data.map(r => ({
      ...r,
      user_name: profileMap[r.user_id]?.name || "—",
      user_code: profileMap[r.user_id]?.user_code || "—",
    })));
    setLoading(false);
  };

  const loadChat = async (requestId: string) => {
    const { data } = await supabase
      .from("recharge_chat_messages")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });
    if (!data) return;

    const senderIds = [...new Set(data.map(m => m.sender_id))];
    const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", senderIds);
    const pMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

    setChatMessages(data.map(m => ({ ...m, sender_name: pMap[m.sender_id]?.name || "—" })));
  };

  const handleApprove = async (req: RechargeRequest) => {
    if (!currentUserId) return;
    // Update request status
    await supabase.from("wallet_recharge_requests").update({ status: "approved", handled_by: currentUserId, handler_role: "agent" }).eq("id", req.id);
    // Add balance to wallet
    const { data: wallet } = await supabase.from("wallet").select("balance").eq("user_id", req.user_id).maybeSingle();
    const newBalance = (wallet?.balance || 0) + req.amount;
    await supabase.from("wallet").update({ balance: newBalance }).eq("user_id", req.user_id);
    toast.success(`تمت الموافقة وإضافة ${req.amount} DH`);
    loadRequests();
  };

  const handleReject = async (req: RechargeRequest) => {
    if (!currentUserId) return;
    await supabase.from("wallet_recharge_requests").update({ status: "rejected", handled_by: currentUserId, handler_role: "agent" }).eq("id", req.id);
    toast.info("تم رفض الطلب");
    loadRequests();
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedRequest || !currentUserId) return;
    await supabase.from("recharge_chat_messages").insert({ request_id: selectedRequest.id, sender_id: currentUserId, content: newMsg.trim() });
    setNewMsg("");
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { pending: "bg-yellow-500/20 text-yellow-400", approved: "bg-green-500/20 text-green-400", rejected: "bg-red-500/20 text-red-400" };
    const labels: Record<string, string> = { pending: "قيد الانتظار", approved: "مقبول", rejected: "مرفوض" };
    return <span className={`text-xs px-2 py-1 rounded-full ${map[s] || ""}`}>{labels[s] || s}</span>;
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-2 justify-end">
        <h1 className="text-xl font-bold text-foreground">طلبات شحن المحفظة</h1>
        <Wallet className="w-5 h-5 text-primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Requests list */}
        <div className="space-y-2">
          {requests.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد طلبات شحن</p>}
          {requests.map(req => (
            <motion.div key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`glass-card rounded-xl p-4 cursor-pointer transition-all border ${selectedRequest?.id === req.id ? "border-primary" : "border-transparent"}`}
              onClick={() => setSelectedRequest(req)}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {statusBadge(req.status)}
                  <span className="text-lg font-bold text-foreground">{req.amount} DH</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{req.user_name}</span>
                  <span className="mx-1">•</span>
                  <span>{req.user_code}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {new Date(req.created_at).toLocaleString("ar", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                </div>
                {req.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="text-green-400 hover:bg-green-500/10" onClick={(e) => { e.stopPropagation(); handleApprove(req); }}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10" onClick={(e) => { e.stopPropagation(); handleReject(req); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Chat panel */}
        <AnimatePresence>
          {selectedRequest && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="glass-card rounded-xl flex flex-col h-[500px]">
              <div className="p-3 border-b border-border flex items-center gap-2 justify-end">
                <span className="text-sm font-bold text-foreground">دردشة الشحن — {selectedRequest.user_name}</span>
                <MessageSquare className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {chatMessages.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">ابدأ المحادثة</p>}
                {chatMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_id === currentUserId ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${msg.sender_id === currentUserId ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                      <p className="text-[10px] opacity-70 mb-0.5">{msg.sender_name}</p>
                      <p>{msg.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 border-t border-border flex gap-2">
                <Button size="icon" onClick={sendMessage} className="rounded-full"><Send className="w-4 h-4" /></Button>
                <Input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()}
                  placeholder="اكتب رسالة..." className="rounded-xl bg-secondary border-border text-right" dir="rtl" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WalletRechargeRequests;
