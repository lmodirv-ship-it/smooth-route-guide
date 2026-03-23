import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X, Loader2, MapPin, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validateChatMessage } from "@/lib/inputSecurity";

interface Message {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

interface RideChatProps {
  rideId: string;
  /** "driver" or "customer" — determines bubble alignment */
  role: "driver" | "customer";
}

const RideChat = ({ rideId, role }: RideChatProps) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSeenCount = useRef(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Fetch messages + realtime
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
        if (!open) {
          setUnread((u) => u + 1);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [rideId]);

  // Auto-scroll & mark read
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      lastSeenCount.current = messages.length;
      setUnread(0);
    }
  }, [messages, open]);

  const handleSend = async (msgText?: string) => {
    const content = msgText || text.trim();
    if (!content || !userId || sending) return;
    setSending(true);
    try {
      await supabase.from("ride_messages" as any).insert({
        ride_id: rideId,
        sender_id: userId,
        message: content,
      } as any);
      if (!msgText) setText("");
    } catch (e) {
      console.error("Chat send error:", e);
    } finally {
      setSending(false);
    }
  };

  const handleSendLocation = () => {
    if (!navigator.geolocation || sending) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = `📍 موقعي الحالي\nhttps://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
        handleSend(loc);
      },
      () => {
        console.error("Location permission denied");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const accentColor = role === "driver" ? "emerald" : "blue";

  return (
    <>
      {/* Floating chat button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={`fixed bottom-6 ${role === "driver" ? "left-5" : "right-5"} z-[2000] w-14 h-14 rounded-full bg-${accentColor}-500 hover:bg-${accentColor}-600 text-white flex items-center justify-center shadow-lg transition-transform active:scale-90`}
          style={{ backgroundColor: role === "driver" ? "#10b981" : "#3b82f6" }}
        >
          <MessageCircle className="w-6 h-6" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className={`fixed bottom-4 ${role === "driver" ? "left-4 right-4" : "left-4 right-4"} z-[2000] max-w-md mx-auto flex flex-col rounded-2xl border border-white/10 overflow-hidden shadow-2xl`}
          style={{ height: "min(400px, 55vh)", backgroundColor: "#0d1320" }}
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
            <MessageCircle className="w-4 h-4" style={{ color: role === "driver" ? "#10b981" : "#3b82f6" }} />
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2" dir="rtl">
            {messages.length === 0 && (
              <p className="text-center text-white/30 text-xs py-8">لا توجد رسائل بعد</p>
            )}
            {messages.map((msg) => {
              const isMine = msg.sender_id === userId;
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                      isMine
                        ? "rounded-bl-sm text-white"
                        : "rounded-br-sm bg-white/10 text-white/90"
                    }`}
                    style={isMine ? { backgroundColor: role === "driver" ? "#10b981" : "#3b82f6" } : {}}
                  >
                    {msg.message.includes("google.com/maps") ? (
                      <a href={msg.message.split("\n")[1]} target="_blank" rel="noopener noreferrer" className="block">
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> موقعي الحالي</span>
                        <span className="text-[10px] underline opacity-70">فتح في الخريطة</span>
                      </a>
                    ) : (
                      msg.message
                    )}
                    <span className="block text-[9px] mt-0.5 opacity-50">
                      {new Date(msg.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div className="shrink-0 flex items-center gap-2 p-3 border-t border-white/5 bg-white/[0.02]" dir="rtl">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="اكتب رسالة..."
              className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm h-9 rounded-xl"
            />
            <Button
              size="sm"
              onClick={handleSendLocation}
              disabled={sending}
              variant="outline"
              className="h-9 w-9 p-0 rounded-xl border-white/10 hover:bg-white/5"
            >
              <MapPin className="w-4 h-4 text-white/60" />
            </Button>
            <Button
              size="sm"
              onClick={() => handleSend()}
              disabled={!text.trim() || sending}
              className="h-9 w-9 p-0 rounded-xl"
              style={{ backgroundColor: role === "driver" ? "#10b981" : "#3b82f6" }}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default RideChat;
