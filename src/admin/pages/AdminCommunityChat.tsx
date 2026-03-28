import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessagesSquare, Send, VolumeX, Trash2, Users, Shield, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

type Msg = {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profile?: { name: string; avatar_url: string | null } | null;
};

const AdminCommunityChat = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<{ id: string; name: string }[]>([]);
  const [mutedUsers, setMutedUsers] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("community_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(200);
    if (data) {
      const userIds = [...new Set(data.map((m) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", userIds);
      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
      setMessages(data.map((m) => ({ ...m, profile: profileMap.get(m.user_id) })));
      setOnlineUsers(
        userIds.map((uid) => ({
          id: uid,
          name: profileMap.get(uid)?.name || "مستخدم",
        }))
      );
    }
  };

  const fetchMuted = async () => {
    const { data } = await supabase.from("community_mutes").select("user_id");
    setMutedUsers(data?.map((m) => m.user_id) || []);
  };

  useEffect(() => {
    fetchMessages();
    fetchMuted();
    const ch = supabase
      .channel("admin-community")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_messages" }, fetchMessages)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !userId) return;
    await supabase.from("community_messages").insert({ user_id: userId, content: input.trim() });
    setInput("");
  };

  const deleteMessage = async (id: string) => {
    await supabase.from("community_messages").delete().eq("id", id);
    toast.success("تم حذف الرسالة");
  };

  const toggleMute = async (uid: string) => {
    if (mutedUsers.includes(uid)) {
      await supabase.from("community_mutes").delete().eq("user_id", uid);
      toast.success("تم إلغاء الكتم");
    } else {
      await supabase.from("community_mutes").insert({ user_id: uid, muted_by: userId! });
      toast.success("تم كتم المستخدم");
    }
    fetchMuted();
  };

  return (
    <div className="h-[calc(100vh-140px)] flex gap-4" dir="rtl">
      {/* Users sidebar */}
      <div className="w-64 hidden lg:flex flex-col glass-card rounded-xl overflow-hidden">
        <div className="p-3 border-b border-border flex items-center gap-2 bg-muted/50">
          <Users className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">المستخدمون ({onlineUsers.length})</span>
        </div>
        <ScrollArea className="flex-1 p-2">
          {onlineUsers.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 group">
              <div className="flex items-center gap-2">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {u.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm truncate max-w-[100px]">{u.name}</span>
                {mutedUsers.includes(u.id) && (
                  <Badge variant="destructive" className="text-[10px] px-1 py-0">محظور</Badge>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="w-6 h-6 opacity-0 group-hover:opacity-100"
                onClick={() => toggleMute(u.id)}
                title={mutedUsers.includes(u.id) ? "إلغاء الكتم" : "كتم"}
              >
                {mutedUsers.includes(u.id) ? (
                  <Shield className="w-3.5 h-3.5 text-success" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-destructive" />
                )}
              </Button>
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col glass-card rounded-xl overflow-hidden">
        <div className="p-3 border-b border-border flex items-center gap-2 bg-muted/50">
          <MessagesSquare className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-foreground">الدردشة المجتمعية</h2>
          <Badge variant="secondary" className="text-xs">{messages.length} رسالة</Badge>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-3">
          {messages.map((msg) => {
            const isMe = msg.user_id === userId;
            const isMuted = mutedUsers.includes(msg.user_id);
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-start" : "justify-end"} group`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                  isMe
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold opacity-80">
                      {msg.profile?.name || "مستخدم"}
                    </span>
                    {isMuted && <ShieldAlert className="w-3 h-3 text-destructive" />}
                  </div>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] opacity-60">
                      {new Date(msg.created_at).toLocaleTimeString("ar-MA", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => deleteMessage(msg.id)} className="p-0.5 hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </button>
                      {!isMe && (
                        <button onClick={() => toggleMute(msg.user_id)} className="p-0.5 hover:text-warning">
                          <VolumeX className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 border-t border-border flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="اكتب رسالة..."
            className="flex-1"
          />
          <Button onClick={sendMessage} size="icon" className="shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminCommunityChat;
