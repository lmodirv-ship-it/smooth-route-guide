import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Bell, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/context";
import { rideStudioT } from "@/i18n/rideStudio";

interface CustomerNotification {
  id: string;
  message: string;
  type: string;
  created_at: string;
  read_at: string | null;
}

const ClientNotifications = () => {
  const navigate = useNavigate();
  const { locale, dir } = useI18n();
  const s = rideStudioT(locale);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !alive) {
        if (alive) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("notifications")
        .select("id, message, type, created_at, read_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (alive) {
        setNotifications(data ?? []);
        setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, []);

  const markRead = async (notification: CustomerNotification) => {
    if (notification.read_at) return;
    const readAt = new Date().toISOString();
    const { error } = await supabase.from("notifications").update({ read_at: readAt }).eq("id", notification.id);
    if (!error) setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, read_at: readAt } : item));
  };

  if (loading) {
    return <div className="min-h-[calc(100dvh-2.75rem)] gradient-dark flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;
  }

  return (
    <main className="min-h-[calc(100dvh-2.75rem)] gradient-dark pb-8" dir={dir}>
      <header className="sticky top-0 z-40 glass-strong border-b border-border px-4 py-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label={s.back}>
          <ArrowRight className="w-5 h-5 rtl:rotate-0 ltr:rotate-180" />
        </Button>
        <h1 className="font-bold text-foreground">{s.notificationsTitle}</h1>
        <span className="w-10" />
      </header>

      <section className="px-4 py-4 space-y-3">
        {notifications.length === 0 && (
          <div className="py-16 text-center">
            <Bell className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">{s.noNotifications}</p>
          </div>
        )}
        {notifications.map((notification) => (
          <Button
            key={notification.id}
            variant="ghost"
            onClick={() => markRead(notification)}
            className={`w-full h-auto justify-start whitespace-normal text-start p-4 glass-card border ${notification.read_at ? "border-border/60" : "border-primary/35"}`}
          >
            <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notification.read_at ? "bg-secondary" : "bg-primary/15"}`}>
              {notification.read_at ? <CheckCircle className="w-5 h-5 text-success" /> : <Bell className="w-5 h-5 text-primary" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-foreground">{notification.message}</span>
              <span className="block text-[11px] text-muted-foreground mt-1">
                {new Date(notification.created_at).toLocaleString(locale)}
              </span>
            </span>
          </Button>
        ))}
      </section>
    </main>
  );
};

export default ClientNotifications;