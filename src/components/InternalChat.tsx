import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, MessageSquare, Users, Circle, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/context";
import { format } from "date-fns";

interface Chat {
  id: string;
  last_message_text: string;
  last_message_at: string;
  members: { user_id: string; role: string; unread_count: number; profile?: { name: string; email: string; user_code: string | null } }[];
}

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
  sender_name?: string;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  user_code: string | null;
  roles: string[];
  online?: boolean;
}

const roleBadge: Record<string, { label: string; color: string }> = {
  admin: { label: "مدير", color: "bg-red-500/20 text-red-400" },
  agent: { label: "وكيل", color: "bg-blue-500/20 text-blue-400" },
  moderator: { label: "مشرف", color: "bg-amber-500/20 text-amber-400" },
  driver: { label: "سائق", color: "bg-green-500/20 text-green-400" },
  delivery: { label: "توصيل", color: "bg-purple-500/20 text-purple-400" },
  user: { label: "عميل", color: "bg-gray-500/20 text-gray-400" },
};

const InternalChat = () => {
  const { dir } = useI18n();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchContact, setSearchContact] = useState("");
  const [showContacts, setShowContacts] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  // Load chats
  const loadChats = useCallback(async () => {
    if (!currentUserId) return;
    const { data: memberships } = await supabase
      .from("internal_chat_members" as any)
      .select("chat_id, unread_count")
      .eq("user_id", currentUserId);
    
    if (!memberships?.length) { setChats([]); setLoading(false); return; }

    const chatIds = memberships.map((m: any) => m.chat_id);
    const { data: chatRows } = await supabase
      .from("internal_chats" as any)
      .select("*")
      .in("id", chatIds)
      .order("last_message_at", { ascending: false });

    // Get all members for these chats
    const { data: allMembers } = await supabase
      .from("internal_chat_members" as any)
      .select("chat_id, user_id, role, unread_count")
      .in("chat_id", chatIds);

    // Get profiles
    const memberUserIds = [...new Set((allMembers || []).map((m: any) => m.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email, user_code")
      .in("id", memberUserIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    const enriched = (chatRows || []).map((chat: any) => ({
      ...chat,
      members: (allMembers || [])
        .filter((m: any) => m.chat_id === chat.id)
        .map((m: any) => ({ ...m, profile: profileMap.get(m.user_id) })),
    }));

    setChats(enriched);
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => { loadChats(); }, [loadChats]);

  // Load messages for active chat
  useEffect(() => {
    if (!activeChat) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from("internal_messages" as any)
        .select("*")
        .eq("chat_id", activeChat)
        .order("created_at", { ascending: true })
        .limit(200);

      if (!data) return;

      // Get sender references
      const senderIds = [...new Set(data.map((m: any) => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, user_code")
        .in("id", senderIds);
      const refMap = new Map((profiles || []).map(p => [p.id, p.user_code || p.name || "مجهول"]));

      setMessages(data.map((m: any) => ({ ...m, sender_name: refMap.get(m.sender_id) || "مجهول" })));

      // Mark as read
      await supabase
        .from("internal_chat_members" as any)
        .update({ unread_count: 0 } as any)
        .eq("chat_id", activeChat)
        .eq("user_id", currentUserId);
    };

    loadMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`internal-chat-${activeChat}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "internal_messages",
        filter: `chat_id=eq.${activeChat}`,
      }, async (payload: any) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, user_code")
          .eq("id", payload.new.sender_id)
          .maybeSingle();
        
        setMessages(prev => [...prev, { ...payload.new, sender_name: profile?.user_code || profile?.name || "مجهول" }]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeChat, currentUserId]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime for chat list updates
  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel("internal-chats-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "internal_chat_members" }, () => {
        loadChats();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, loadChats]);

  // Load contacts
  const loadContacts = async () => {
    setShowContacts(true);
    const { data: allRoles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "agent", "moderator", "driver", "delivery"]);

    if (!allRoles) return;
    const userIds = [...new Set(allRoles.map(r => r.user_id))].filter(id => id !== currentUserId);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email, user_code")
      .in("id", userIds);

    const roleMap = new Map<string, string[]>();
    allRoles.forEach(r => {
      const arr = roleMap.get(r.user_id) || [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    });

    setContacts(
      (profiles || []).map(p => ({
        id: p.id,
        name: p.name || p.email || "بدون اسم",
        email: p.email || "",
        user_code: p.user_code,
        roles: roleMap.get(p.id) || [],
      }))
    );
  };

  // Start chat with a contact
  const startChat = async (contactId: string) => {
    if (!currentUserId) return;

    // Check if chat already exists between these two
    const { data: myChats } = await supabase
      .from("internal_chat_members" as any)
      .select("chat_id")
      .eq("user_id", currentUserId);

    if (myChats?.length) {
      const { data: theirChats } = await supabase
        .from("internal_chat_members" as any)
        .select("chat_id")
        .eq("user_id", contactId)
        .in("chat_id", myChats.map((c: any) => c.chat_id));

      if (theirChats?.length) {
        setActiveChat((theirChats[0] as any).chat_id);
        setShowContacts(false);
        return;
      }
    }

    // Create new chat
    const { data: chat } = await supabase
      .from("internal_chats" as any)
      .insert({} as any)
      .select()
      .single();

    if (!chat) return;

    await supabase.from("internal_chat_members" as any).insert([
      { chat_id: (chat as any).id, user_id: currentUserId, role: "member" },
      { chat_id: (chat as any).id, user_id: contactId, role: "member" },
    ] as any);

    setActiveChat((chat as any).id);
    setShowContacts(false);
    loadChats();
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat || !currentUserId) return;

    const content = newMessage.trim();
    setNewMessage("");

    await supabase.from("internal_messages" as any).insert({
      chat_id: activeChat,
      sender_id: currentUserId,
      content,
      message_type: "text",
    } as any);

    // Update chat last message
    await supabase
      .from("internal_chats" as any)
      .update({ last_message_text: content, last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any)
      .eq("id", activeChat);

    // Increment unread for other members
    const { data: members } = await supabase
      .from("internal_chat_members" as any)
      .select("id, user_id, unread_count")
      .eq("chat_id", activeChat)
      .neq("user_id", currentUserId);

    for (const m of (members || [])) {
      await supabase
        .from("internal_chat_members" as any)
        .update({ unread_count: ((m as any).unread_count || 0) + 1 } as any)
        .eq("id", (m as any).id);
    }
  };

  const getOtherMember = (chat: Chat) => {
    const other = chat.members.find(m => m.user_id !== currentUserId);
    return other?.profile?.user_code || other?.profile?.name || "محادثة";
  };

  const getTotalUnread = (chat: Chat) => {
    const me = chat.members.find(m => m.user_id === currentUserId);
    return me?.unread_count || 0;
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchContact.toLowerCase()) ||
    c.email.toLowerCase().includes(searchContact.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-12rem)] rounded-xl border border-border overflow-hidden glass-strong" dir={dir}>
      {/* Chat List / Contacts Panel */}
      <div className="w-80 border-l border-border flex flex-col bg-background/50">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <Button size="sm" variant="outline" onClick={loadContacts} className="gap-1.5">
            <Users className="w-3.5 h-3.5" />
            محادثة جديدة
          </Button>
          <h3 className="font-bold text-sm">المحادثات</h3>
        </div>

        {showContacts ? (
          <div className="flex-1 flex flex-col">
            <div className="p-2 border-b border-border">
              <Input
                placeholder="بحث عن جهة اتصال..."
                value={searchContact}
                onChange={e => setSearchContact(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="p-1 border-b border-border">
              <Button size="sm" variant="ghost" onClick={() => setShowContacts(false)} className="text-xs w-full">
                ← العودة للمحادثات
              </Button>
            </div>
            <ScrollArea className="flex-1">
              {filteredContacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => startChat(contact.id)}
                  className="w-full p-3 text-right hover:bg-secondary/60 transition-colors border-b border-border/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    <div className="flex-1 text-right">
                      <p className="text-sm font-medium font-mono">{contact.user_code || contact.name}</p>
                      <div className="flex gap-1 justify-end mt-1 flex-wrap">
                        {contact.roles.map(r => (
                          <span key={r} className={`text-[10px] px-1.5 py-0.5 rounded-full ${roleBadge[r]?.color || "bg-gray-500/20 text-gray-400"}`}>
                            {roleBadge[r]?.label || r}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {(contact.user_code || contact.name).charAt(0)}
                    </div>
                  </div>
                </button>
              ))}
            </ScrollArea>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            {chats.length === 0 && !loading && (
              <div className="p-6 text-center text-muted-foreground text-sm">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                لا توجد محادثات بعد
              </div>
            )}
            {chats.map(chat => {
              const unread = getTotalUnread(chat);
              return (
                <button
                  key={chat.id}
                  onClick={() => setActiveChat(chat.id)}
                  className={`w-full p-3 text-right transition-colors border-b border-border/50 ${
                    activeChat === chat.id ? "bg-primary/10" : "hover:bg-secondary/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    {unread > 0 && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 min-w-[20px] h-5">
                        {unread}
                      </Badge>
                    )}
                    <div className="flex-1 text-right">
                      <p className="text-sm font-medium">{getOtherMember(chat)}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {chat.last_message_text || "بدون رسائل"}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-info/20 flex items-center justify-center">
                      <MessageSquare className="w-3.5 h-3.5 text-info" />
                    </div>
                  </div>
                </button>
              );
            })}
          </ScrollArea>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="p-3 border-b border-border flex items-center justify-between bg-background/50">
              <div className="flex items-center gap-1.5">
                <Circle className="w-2 h-2 fill-success text-success" />
                <span className="text-xs text-success">متصل</span>
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-sm font-bold text-right">
                    {chats.find(c => c.id === activeChat) ? getOtherMember(chats.find(c => c.id === activeChat)!) : "محادثة"}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-primary" />
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map(msg => {
                  const isMine = msg.sender_id === currentUserId;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                        isMine
                          ? "bg-primary text-primary-foreground rounded-bl-md"
                          : "bg-secondary text-foreground rounded-br-md"
                      }`}>
                        {!isMine && (
                          <p className="text-[10px] font-semibold mb-0.5 opacity-70">{msg.sender_name}</p>
                        )}
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {format(new Date(msg.created_at), "HH:mm")}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t border-border bg-background/50">
              <form
                onSubmit={e => { e.preventDefault(); sendMessage(); }}
                className="flex items-center gap-2"
              >
                <Button type="submit" size="icon" className="gradient-primary rounded-full w-9 h-9 flex-shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
                <Input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="اكتب رسالة..."
                  className="flex-1 bg-secondary/60 border-border rounded-full text-sm"
                />
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">اختر محادثة أو ابدأ محادثة جديدة</p>
              <p className="text-sm mt-1">تواصل مع السائقين، المشرفين، أو المدير</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InternalChat;
