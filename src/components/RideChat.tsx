import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Loader2, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DRIVER_CANNED_MESSAGES,
  CUSTOMER_CANNED_MESSAGES,
  filterMessageForDisplay,
  validateCannedMessage,
  type MessageContext,
  type CannedMessage,
} from "@/lib/cannedMessages";

interface Message {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

interface RideChatProps {
  rideId: string;
  role: "driver" | "customer";
  /** Optional ride context to show relevant quick replies */
  rideContext?: MessageContext;
}

const RideChat = ({ rideId, role, rideContext }: RideChatProps) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const [showAllMessages, setShowAllMessages] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSeenCount = useRef(0);

  const cannedList = role === "driver" ? DRIVER_CANNED_MESSAGES : CUSTOMER_CANNED_MESSAGES;

  // Get context-relevant messages first, then general
  const contextMessages = getContextMessages(cannedList, rideContext);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  useEffect(() => {
    if (!rideId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("ride_messages" as any)
        .select("*")
        .eq("ride_id", rideId)
        .order("created_at", { ascending: true });
      if (data) {
        setMessages(data as any);
        if (!open) {
          setUnread(Math.max(0, (data as any).length - lastSeenCount.current));
        } else {
          lastSeenCount.current = (data as any).length;
        }
      }
    };
    fetchMessages();

    const channel = supabase
      .channel(`ride-chat-${rideId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "ride_messages",
        filter: `ride_id=eq.${rideId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => [...prev, newMsg]);
        if (!open) setUnread((u) => u + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [rideId]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      lastSeenCount.current = messages.length;
      setUnread(0);
    }
  }, [messages, open]);

  const handleSendCanned = async (msg: CannedMessage) => {
    if (!userId || sending) return;

    // Validate it's a real canned message
    if (!validateCannedMessage(msg.text_ar, role)) {
      setWarning("رسالة غير مسموحة");
      setTimeout(() => setWarning(null), 3000);
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("validate-chat-message", {
        body: { ride_id: rideId, message: msg.text_ar },
      });
      if (error) throw error;
    } catch (e: any) {
      console.error("Chat send error:", e);
    } finally {
      setSending(false);
    }
  };

  const accentBg = role === "driver" ? "#10b981" : "#3b82f6";

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 z-[2000] w-14 h-14 rounded-full text-white flex items-center justify-center shadow-lg transition-transform active:scale-90"
          style={{ backgroundColor: accentBg, [role === "driver" ? "left" : "right"]: 20 }}
        >
          <MessageCircle className="w-6 h-6" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>
      )}

      {open && (
        <div
          className="fixed bottom-4 left-4 right-4 z-[2000] max-w-md mx-auto flex flex-col rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
          style={{ height: "min(480px, 65vh)", backgroundColor: "#0d1320" }}
        >
          {/* Header */}
          <div
            className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/5"
            style={{ backgroundColor: role === "driver" ? "rgba(16,185,129,0.15)" : "rgba(59,130,246,0.15)" }}
          >
            <button onClick={() => setOpen(false)} className="p-1 rounded-full hover:bg-white/10">
              <X className="w-4 h-4 text-white/70" />
            </button>
            <span className="text-white font-bold text-sm">
              {role === "driver" ? "محادثة مع الزبون" : "محادثة مع السائق"}
            </span>
            <MessageCircle className="w-4 h-4" style={{ color: accentBg }} />
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2" dir="rtl">
            {messages.length === 0 && (
              <p className="text-center text-white/30 text-xs py-8">لا توجد رسائل بعد</p>
            )}
            {messages.map((msg) => {
              const isMine = msg.sender_id === userId;
              const displayText = filterMessageForDisplay(msg.message);
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                      isMine ? "rounded-bl-sm text-white" : "rounded-br-sm bg-white/10 text-white/90"
                    }`}
                    style={isMine ? { backgroundColor: accentBg } : {}}
                  >
                    {displayText}
                    <span className="block text-[9px] mt-0.5 opacity-50">
                      {new Date(msg.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Warning */}
          {warning && (
            <div className="shrink-0 flex items-center gap-2 px-3 py-2 bg-destructive/20 text-destructive text-xs font-medium border-t border-destructive/20" dir="rtl">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{warning}</span>
            </div>
          )}

          {/* Quick replies — no free text input */}
          <div className="shrink-0 border-t border-white/5 bg-white/[0.02]" dir="rtl">
            {/* Toggle show all */}
            <button
              onClick={() => setShowAllMessages(!showAllMessages)}
              className="w-full flex items-center justify-center gap-1 py-1.5 text-[10px] text-white/40 hover:text-white/60"
            >
              {showAllMessages ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
              {showAllMessages ? "عرض أقل" : "عرض كل الردود الجاهزة"}
            </button>

            <div className={`px-3 pb-3 flex flex-wrap gap-1.5 ${showAllMessages ? "max-h-48" : "max-h-24"} overflow-y-auto`}>
              {contextMessages.map((msg) => (
                <Button
                  key={msg.id}
                  size="sm"
                  variant="outline"
                  disabled={sending}
                  onClick={() => handleSendCanned(msg)}
                  className="h-auto py-1.5 px-3 text-xs rounded-xl border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white whitespace-nowrap"
                >
                  {sending ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : null}
                  {msg.text_ar}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

function getContextMessages(list: CannedMessage[], context?: MessageContext): CannedMessage[] {
  if (!context) return list;
  // Show context-specific first, then general, then rest
  const contextSpecific = list.filter((m) => m.context.includes(context));
  const general = list.filter((m) => m.context.includes("general") && !m.context.includes(context));
  const rest = list.filter((m) => !contextSpecific.includes(m) && !general.includes(m));
  return [...contextSpecific, ...general, ...rest];
}

export default RideChat;
