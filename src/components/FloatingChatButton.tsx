import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessagesSquare, PhoneCall, X, Search, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/utils";
import { useInAppCall } from "@/hooks/useInAppCall";
import InAppCallDialog from "@/components/calls/InAppCallDialog";

interface Contact {
  id: string;
  name: string;
  phone: string | null;
  avatar_url: string | null;
  role?: string;
}

const FloatingChatButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { dir } = useI18n();
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const inAppCall = useInAppCall();

  useEffect(() => {
    if (!open) return;

    const fetchContacts = async () => {
      setLoading(true);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, phone, avatar_url")
        .order("name");

      if (profiles) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id, role");

        const roleMap = new Map<string, string>();
        roles?.forEach((r: any) => roleMap.set(r.user_id, r.role));

        setContacts(
          profiles.map((p) => ({
            ...p,
            role: roleMap.get(p.id) || "user",
          }))
        );
      }

      setLoading(false);
    };

    fetchContacts();
  }, [open]);

  if (location.pathname === "/community") return null;

  const filtered = useMemo(
    () =>
      contacts.filter(
        (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search),
      ),
    [contacts, search],
  );

  const roleLabel = (role: string) => {
    const map: Record<string, string> = {
      admin: "مدير",
      agent: "وكيل",
      driver: "سائق",
      delivery: "توصيل",
      moderator: "مشرف",
      user: "عميل",
      store_owner: "صاحب محل",
    };
    return map[role] || role;
  };

  const roleColor = (role: string) => {
    const map: Record<string, string> = {
      admin: "bg-destructive/20 text-destructive",
      agent: "bg-info/20 text-info",
      driver: "bg-warning/20 text-warning",
      delivery: "bg-success/20 text-success",
      moderator: "bg-primary/20 text-primary",
      user: "bg-muted text-muted-foreground",
      store_owner: "bg-accent text-accent-foreground",
    };
    return map[role] || "bg-muted text-muted-foreground";
  };

  const startInternalCall = async (contact: Contact) => {
    await inAppCall.startCall({
      id: contact.id,
      name: contact.name || "بدون اسم",
      avatarUrl: contact.avatar_url,
    });
  };

  return (
    <>
      <InAppCallDialog
        incomingCall={inAppCall.incomingCall}
        activeCall={inAppCall.activeCall}
        remoteStream={inAppCall.remoteStream}
        isMuted={inAppCall.isMuted}
        busy={inAppCall.busy}
        onAccept={inAppCall.acceptCall}
        onEnd={inAppCall.endCall}
        onToggleMute={inAppCall.toggleMute}
      />

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-36 right-4 z-50 flex max-h-[70vh] w-80 flex-col overflow-hidden rounded-[1.6rem] glass-card"
            dir={dir}
          >
            <div className="p-3 border-b border-border flex items-center justify-between">
              <button onClick={() => setOpen(false)} className="glass-icon-button h-8 w-8">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">جهات الاتصال</span>
                <Users className="w-4 h-4 text-primary" />
              </div>
            </div>

            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث عن شخص..."
                  className="bg-secondary/60 border-border h-9 rounded-lg pr-9 text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto p-2 space-y-1">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">جارٍ التحميل...</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">لا توجد نتائج</div>
              ) : (
                filtered.map((contact) => (
                  <div
                    key={contact.id}
                    className="glass-nav-tile flex items-center gap-3 p-2.5"
                    data-active="false"
                  >
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={contact.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {contact.name?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{contact.name || "بدون اسم"}</p>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${roleColor(contact.role || "user")}`}>
                          {roleLabel(contact.role || "user")}
                        </Badge>
                        {contact.phone && (
                          <span className="text-[10px] text-muted-foreground truncate">{contact.phone}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          navigate("/community");
                          setOpen(false);
                        }}
                        className="glass-icon-button h-8 w-8 text-primary"
                        title="دردشة"
                      >
                        <MessagesSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => startInternalCall(contact)}
                        className={cn("glass-icon-button h-8 w-8 text-info", (inAppCall.isInCall || inAppCall.busy || inAppCall.userId === contact.id) && "opacity-50")}
                        title="اتصال داخلي"
                        disabled={inAppCall.isInCall || inAppCall.busy || inAppCall.userId === contact.id}
                      >
                        <PhoneCall className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-2 border-t border-border">
              <button
                onClick={() => { navigate("/community"); setOpen(false); }}
                className="glass-nav-tile w-full flex items-center justify-center gap-2 py-2 text-sm font-medium"
                data-active="false"
              >
                <MessagesSquare className="w-4 h-4" />
                الدردشة المجتمعية
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(!open)}
        className="glass-button fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full"
        title="جهات الاتصال والدردشة"
        data-active={open}
      >
        {open ? <X className="w-5 h-5" /> : <MessagesSquare className="w-5 h-5" />}
      </motion.button>
    </>
  );
};

export default FloatingChatButton;
