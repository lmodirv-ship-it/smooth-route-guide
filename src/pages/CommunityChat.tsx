import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, Users, Car, Package, ShoppingCart, Shield, Ban, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

const CommunityChat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, { name: string; avatar_url: string | null }>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setUserId(user.id);

      const { data: roles } = await supabase.from("user_roles" as any).select("role").eq("user_id", user.id);
      if (roles?.some((r: any) => ["admin", "agent", "moderator"].includes(r.role))) setIsAdmin(true);

      const { data: mute } = await supabase.from("community_mutes" as any).select("id").eq("user_id", user.id).maybeSingle();
      if (mute) setIsMuted(true);

      await fetchMessages();
    };
    init();
  }, [navigate]);

  const fetchMessages = async () => {
    const { data: msgs } = await supabase
      .from("community_messages" as any)
      .select("*")
      .order("created_at", { ascending: true })
      .limit(200) as any;

    if (msgs) {
      setMessages(msgs as Message[]);
      const userIds = [...new Set((msgs as any[]).map((m: any) => m.user_id))];
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, name, avatar_url").in("id", userIds);
        if (profs) {
          const map: Record<string, { name: string; avatar_url: string | null }> = {};
          profs.forEach(p => { map[p.id] = { name: p.name || "مستخدم", avatar_url: p.avatar_url }; });
          setProfiles(map);
        }
      }
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel("community-chat")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_messages" }, fetchMessages)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

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
    await supabase.from("community_mutes" as any).insert({ user_id: targetUserId, muted_by: userId });
    toast({ title: "تم إيقاف المستخدم ✅" });
  };

  const handleDeleteMessage = async (msgId: string) => {
    await supabase.from("community_messages" as any).delete().eq("id", msgId);
  };

  const uniqueUsers = [...new Set(messages.map(m => m.user_id))];

  const services = [
    { icon: Car, label: "طلب سائق", path: "/customer", color: "from-blue-500 to-cyan-500" },
    { icon: Package, label: "توصيل طلبات", path: "/delivery", color: "from-orange-500 to-amber-500" },
    { icon: ShoppingCart, label: "تسوق", path: "/delivery/restaurants", color: "from-emerald-500 to-green-500" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">مجتمع HN</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/30 text-primary text-xs">
              <Users className="w-3 h-3 ml-1" />
              {uniqueUsers.length} مشارك
            </Badge>
            {services.map((s) => (
              <button
                key={s.path}
                onClick={() => navigate(s.path)}
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${s.color} text-white text-xs font-medium`}
              >
                <s.icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Users sidebar */}
        <aside className="w-56 hidden lg:flex flex-col border-l border-border bg-card/50">
          <div className="p-3 border-b border-border flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm text-foreground">المتصلون ({uniqueUsers.length})</span>
          </div>
          <ScrollArea className="flex-1 p-2">
            {uniqueUsers.map((uid) => {
              const p = profiles[uid];
              return (
                <div key={uid} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 group">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {(p?.name || "م").charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-card" />
                    </div>
                    <span className="text-sm truncate max-w-[90px] text-foreground">{p?.name || "مستخدم"}</span>
                  </div>
                  {isAdmin && uid !== userId && (
                    <button
                      onClick={() => handleMuteUser(uid)}
                      className="p-1 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 rounded"
                      title="كتم المستخدم"
                    >
                      <Ban className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </ScrollArea>
        </aside>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-20">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>كن أول من يبدأ المحادثة! 🎉</p>
              </div>
            )}
            <AnimatePresence>
              {messages.map((msg) => {
                const isMe = msg.user_id === userId;
                const name = profiles[msg.user_id]?.name || "مستخدم";
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex gap-2 group ${isMe ? "flex-row-reverse" : ""}`}
                  >
                    <Avatar className="w-8 h-8 shrink-0 mt-1">
                      <AvatarFallback className={`text-xs ${isMe ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`max-w-[75%] ${isMe ? "text-right" : "text-left"}`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[11px] font-medium text-muted-foreground">{name}</span>
                        <span className="text-[9px] text-muted-foreground/50">
                          {new Date(msg.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="relative">
                        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMe
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-muted text-foreground rounded-tl-sm"
                        }`}>
                          {msg.content}
                        </div>
                        {isAdmin && !isMe && (
                          <div className="absolute top-1 left-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleDeleteMessage(msg.id)} className="p-1 bg-destructive/80 rounded-full text-white hover:bg-destructive">
                              <Trash2 className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleMuteUser(msg.user_id)} className="p-1 bg-destructive/80 rounded-full text-white hover:bg-destructive">
                              <Ban className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Input bar at bottom */}
          <div className="border-t border-border bg-card/80 backdrop-blur-sm p-3">
            {isMuted ? (
              <div className="text-center text-destructive text-sm py-2 flex items-center justify-center gap-1">
                <Ban className="w-4 h-4" />
                تم إيقاف خاصية الكتابة لحسابك
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="اكتب رسالتك هنا..."
                  className="flex-1 rounded-full bg-muted/50 border-border"
                />
                <Button
                  onClick={handleSend}
                  disabled={sending || !newMessage.trim()}
                  size="icon"
                  className="rounded-full shrink-0 w-10 h-10"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityChat;
