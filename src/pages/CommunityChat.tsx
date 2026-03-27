import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, Users, Car, Package, ShoppingCart, Shield, Ban, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name?: string;
}

const CommunityChat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setUserId(user.id);

      // Check admin/agent role
      const { data: roles } = await supabase.from("user_roles" as any).select("role").eq("user_id", user.id);
      if (roles?.some((r: any) => ["admin", "agent", "moderator"].includes(r.role))) setIsAdmin(true);

      // Check mute
      const { data: mute } = await supabase.from("community_mutes" as any).select("id").eq("user_id", user.id).maybeSingle();
      if (mute) setIsMuted(true);

      // Load messages
      const { data: msgs } = await supabase
        .from("community_messages" as any)
        .select("*")
        .order("created_at", { ascending: true })
        .limit(100);

      if (msgs) {
        setMessages(msgs as Message[]);
        // Load profiles for message authors
        const userIds = [...new Set((msgs as Message[]).map(m => m.user_id))];
        if (userIds.length) {
          const { data: profs } = await supabase.from("profiles").select("id, name").in("id", userIds);
          if (profs) {
            const map: Record<string, string> = {};
            profs.forEach(p => { map[p.id] = p.name || "مستخدم"; });
            setProfiles(map);
          }
        }
      }

      setOnlineCount(Math.floor(Math.random() * 20) + 5);
    };
    init();
  }, [navigate]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("community-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages" }, async (payload) => {
        const msg = payload.new as Message;
        setMessages(prev => [...prev, msg]);
        // Load profile if missing
        if (!profiles[msg.user_id]) {
          const { data } = await supabase.from("profiles").select("id, name").eq("id", msg.user_id).maybeSingle();
          if (data) setProfiles(prev => ({ ...prev, [data.id]: data.name || "مستخدم" }));
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "community_messages" }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== (payload.old as any).id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profiles]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !userId || sending) return;
    if (isMuted) { toast({ title: "تم إيقاف حسابك عن الكتابة", variant: "destructive" }); return; }
    setSending(true);
    const { error } = await supabase.from("community_messages" as any).insert({ user_id: userId, content: newMessage.trim() });
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else setNewMessage("");
    setSending(false);
  };

  const handleMuteUser = async (targetUserId: string) => {
    if (!userId) return;
    const { error } = await supabase.from("community_mutes" as any).insert({ user_id: targetUserId, muted_by: userId });
    if (!error) toast({ title: "تم إيقاف المستخدم ✅" });
  };

  const handleDeleteMessage = async (msgId: string) => {
    await supabase.from("community_messages" as any).delete().eq("id", msgId);
  };

  const services = [
    { icon: Car, label: "طلب سائق", path: "/customer", color: "from-blue-500 to-cyan-500" },
    { icon: Package, label: "توصيل طلبات", path: "/delivery", color: "from-orange-500 to-amber-500" },
    { icon: ShoppingCart, label: "تسوق", path: "/delivery/restaurants", color: "from-emerald-500 to-green-500" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0f1a] to-[#111827] flex flex-col" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0a0f1a]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">مجتمع HN</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs">
              <Users className="w-3 h-3 ml-1" />
              {onlineCount} متصل
            </Badge>
          </div>
        </div>

        {/* Quick service buttons */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {services.map((s) => (
            <button
              key={s.path}
              onClick={() => navigate(s.path)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${s.color} text-white text-xs font-medium whitespace-nowrap shrink-0`}
            >
              <s.icon className="w-3.5 h-3.5" />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-white/30 py-20">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>كن أول من يبدأ المحادثة! 🎉</p>
          </div>
        )}
        <AnimatePresence>
          {messages.map((msg) => {
            const isMe = msg.user_id === userId;
            const name = profiles[msg.user_id] || "مستخدم";
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}
              >
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarFallback className={`text-xs ${isMe ? "bg-primary/20 text-primary" : "bg-white/10 text-white/60"}`}>
                    {name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className={`max-w-[75%] ${isMe ? "text-right" : "text-left"}`}>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-[10px] text-white/40">{name}</span>
                    {isAdmin && !isMe && (
                      <div className="flex gap-1">
                        <button onClick={() => handleMuteUser(msg.user_id)} className="text-red-400 hover:text-red-300">
                          <Ban className="w-3 h-3" />
                        </button>
                        <button onClick={() => handleDeleteMessage(msg.id)} className="text-red-400 hover:text-red-300">
                          <Shield className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className={`px-3 py-2 rounded-2xl text-sm ${
                    isMe
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-white/[0.06] text-white/90 rounded-tl-sm"
                  }`}>
                    {msg.content}
                  </div>
                  <span className="text-[9px] text-white/25 mt-0.5 block">
                    {new Date(msg.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-[#0a0f1a]/95 backdrop-blur-xl border-t border-white/5 p-3">
        {isMuted ? (
          <div className="text-center text-red-400 text-sm py-2">
            <Ban className="w-4 h-4 inline ml-1" />
            تم إيقاف خاصية الكتابة لحسابك
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={handleSend}
              disabled={sending || !newMessage.trim()}
              size="icon"
              className="bg-primary hover:bg-primary/90 rounded-full shrink-0"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="اكتب رسالتك..."
              className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 rounded-full"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityChat;
