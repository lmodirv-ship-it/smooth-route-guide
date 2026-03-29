import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, Users, Car, Package, ShoppingCart, Ban, Loader2, Trash2, Bell, LogOut } from "lucide-react";
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

interface PresenceUser {
  user_id: string;
  name: string;
  inChat: boolean;
}

const CommunityChat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, { name: string; avatar_url: string | null; user_code: string | null }>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const presenceChannelRef = useRef<any>(null);

  // Fetch profile for a user id
  const fetchProfile = useCallback(async (uid: string) => {
    if (profiles[uid]) return profiles[uid];
    const { data } = await supabase.from("profiles").select("id, name, avatar_url, user_code").eq("id", uid).maybeSingle();
    if (data) {
      setProfiles(prev => ({ ...prev, [data.id]: { name: data.name || "مستخدم", avatar_url: data.avatar_url, user_code: data.user_code } }));
      return { name: data.name || "مستخدم", avatar_url: data.avatar_url, user_code: data.user_code };
    }
    return { name: "مستخدم", avatar_url: null, user_code: null };
  }, [profiles]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setUserId(user.id);

      const { data: roles } = await supabase.from("user_roles" as any).select("role").eq("user_id", user.id);
      if (roles?.some((r: any) => ["admin", "agent", "moderator"].includes(r.role))) setIsAdmin(true);

      const { data: mute } = await supabase.from("community_mutes" as any).select("id").eq("user_id", user.id).maybeSingle();
      if (mute) setIsMuted(true);

      // Get profile name for presence
      const { data: myProfile } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
      const myName = myProfile?.name || "مستخدم";

      // Setup presence channel
      const presenceChannel = supabase.channel("community-presence", {
        config: { presence: { key: user.id } }
      });

      presenceChannel
        .on("presence", { event: "sync" }, () => {
          const state = presenceChannel.presenceState();
          const users: PresenceUser[] = [];
          Object.entries(state).forEach(([key, presences]: [string, any[]]) => {
            if (presences.length > 0) {
              users.push({
                user_id: key,
                name: presences[0].name || "مستخدم",
                inChat: presences[0].inChat ?? true,
              });
            }
          });
          setOnlineUsers(users);
        })
        .on("broadcast", { event: "invite-to-chat" }, (payload: any) => {
          if (payload.payload?.target_user_id === user.id) {
            toast({
              title: "📢 دعوة للدردشة",
              description: `${payload.payload.inviter_name} يدعوك للانضمام إلى الدردشة المجتمعية`,
            });
          }
        })
        .subscribe(async (status: string) => {
          if (status === "SUBSCRIBED") {
            await presenceChannel.track({ name: myName, inChat: true });
          }
        });

      presenceChannelRef.current = presenceChannel;

      await fetchMessages();
    };
    init();

    return () => {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
      }
    };
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
        const { data: profs } = await supabase.from("profiles").select("id, name, avatar_url, user_code").in("id", userIds);
        if (profs) {
          const map: Record<string, { name: string; avatar_url: string | null; user_code: string | null }> = {};
          profs.forEach(p => { map[p.id] = { name: p.name || "مستخدم", avatar_url: p.avatar_url, user_code: p.user_code }; });
          setProfiles(prev => ({ ...prev, ...map }));
        }
      }
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel("community-chat-changes")
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

  const handleInviteUser = async (targetUserId: string, targetName: string) => {
    if (!presenceChannelRef.current || !userId) return;
    const myName = profiles[userId]?.name || "المدير";
    await presenceChannelRef.current.send({
      type: "broadcast",
      event: "invite-to-chat",
      payload: { target_user_id: targetUserId, inviter_name: myName },
    });
    toast({ title: `تم إرسال دعوة لـ ${targetName} ✅` });
  };

  const inChatUsers = onlineUsers.filter(u => u.inChat);
  const notInChatUsers = onlineUsers.filter(u => !u.inChat);

  const services = [
    { icon: Car, label: "طلب سائق", path: "/customer", color: "from-blue-500 to-cyan-500" },
    { icon: Package, label: "توصيل طلبات", path: "/delivery", color: "from-orange-500 to-amber-500" },
    { icon: ShoppingCart, label: "تسوق", path: "/delivery/restaurants", color: "from-emerald-500 to-green-500" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-50 glass-card backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">مجتمع HN</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="border-destructive/40 text-destructive hover:bg-destructive/10 gap-1 text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              خروج
            </Button>
            <Badge variant="outline" className="border-primary/30 text-primary text-xs">
              <Users className="w-3 h-3 ml-1" />
              {onlineUsers.length} متصل
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {inChatUsers.length} في الدردشة
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
            <span className="font-semibold text-sm text-foreground">في الدردشة ({inChatUsers.length})</span>
          </div>
          <ScrollArea className="flex-1 p-2">
            {/* Users in chat */}
            {inChatUsers.map((u) => {
              const p = profiles[u.user_id];
              return (
                <div key={u.user_id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 group">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {(u.name || "م").charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-card" />
                    </div>
                    <span className="text-sm truncate max-w-[90px] text-foreground font-mono">{profiles[u.user_id]?.user_code || u.name}</span>
                  </div>
                  {isAdmin && u.user_id !== userId && (
                    <button
                      onClick={() => handleMuteUser(u.user_id)}
                      className="p-1 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 rounded"
                      title="كتم المستخدم"
                    >
                      <Ban className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Separator for not-in-chat users */}
            {notInChatUsers.length > 0 && (
              <>
                <div className="px-2 py-2 mt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground font-medium">متصلون ({notInChatUsers.length})</span>
                </div>
                {notInChatUsers.map((u) => (
                  <div key={u.user_id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 group">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                            {(u.name || "م").charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-yellow-500 border-2 border-card" />
                      </div>
                      <span className="text-sm truncate max-w-[70px] text-muted-foreground">{u.name}</span>
                    </div>
                    {isAdmin && u.user_id !== userId && (
                      <button
                        onClick={() => handleInviteUser(u.user_id, u.name)}
                        className="p-1 opacity-0 group-hover:opacity-100 text-primary hover:bg-primary/10 rounded"
                        title="دعوة للدردشة"
                      >
                        <Bell className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}
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
                const ref = profiles[msg.user_id]?.user_code || profiles[msg.user_id]?.name || "مستخدم";
                const isOnline = onlineUsers.some(u => u.user_id === msg.user_id);
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex gap-2 group ${isMe ? "flex-row-reverse" : ""}`}
                  >
                    <div className="relative shrink-0 mt-1">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className={`text-xs ${isMe ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                          {ref.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {isOnline && (
                        <div className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-card" />
                      )}
                    </div>
                    <div className={`max-w-[75%] ${isMe ? "text-right" : "text-left"}`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[11px] font-medium text-muted-foreground font-mono">{ref}</span>
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
