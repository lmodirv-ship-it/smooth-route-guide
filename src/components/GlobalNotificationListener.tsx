import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { notifyNewOrder, unlockAudio } from "@/lib/notificationSound";

/**
 * Global realtime notification listener.
 * Subscribes to the `notifications` table and plays sound + toast
 * whenever a new notification row is inserted for the current user.
 * Also listens to ride_requests, delivery_orders for relevant events.
 *
 * Mount once in App.tsx — it self-guards when no session exists.
 */
const GlobalNotificationListener = () => {
  const userIdRef = useRef<string | null>(null);
  const audioUnlockedRef = useRef(false);

  // Unlock audio on first user interaction
  useEffect(() => {
    const handler = () => {
      if (!audioUnlockedRef.current) {
        unlockAudio();
        audioUnlockedRef.current = true;
      }
    };
    window.addEventListener("click", handler, { once: false, passive: true });
    window.addEventListener("touchstart", handler, { once: false, passive: true });
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let setupVersion = 0;
    let channels: ReturnType<typeof supabase.channel>[] = [];

    const removeChannels = async (targetChannels: ReturnType<typeof supabase.channel>[] = channels) => {
      const uniqueChannels = Array.from(new Set(targetChannels));
      await Promise.all(uniqueChannels.map((channel) => supabase.removeChannel(channel)));
      if (targetChannels === channels) {
        channels = [];
      }
    };

    const buildChannels = async (userId: string, userRoles: string[], version: number) => {
      const suffix = `${userId}-${version}-${Date.now()}`;
      const nextChannels: ReturnType<typeof supabase.channel>[] = [];

      const notifChannel = supabase
        .channel(`global-notifications-${suffix}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications" },
          (payload) => {
            const row = payload.new as any;
            if (row.user_id === userIdRef.current) {
              notifyNewOrder();
              toast({
                title: getNotifTitle(row.type),
                description: row.message,
              });
            }
          }
        )
        .subscribe();
      nextChannels.push(notifChannel);

      if (userRoles.includes("driver")) {
        const rideChannel = supabase
          .channel(`global-ride-notif-${suffix}`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "ride_requests", filter: "status=eq.pending" },
            () => {
              notifyNewOrder();
              toast({ title: "🚗 طلب رحلة جديد", description: "هناك طلب رحلة جديد في منطقتك" });
            }
          )
          .subscribe();
        nextChannels.push(rideChannel);
      }

      if (userRoles.includes("user")) {
        const clientRideChannel = supabase
          .channel(`global-client-ride-${suffix}`)
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "ride_requests" },
            (payload) => {
              const row = payload.new as any;
              if (row.user_id === userIdRef.current) {
                const statusMsg = getRideStatusMessage(row.status);
                if (statusMsg) {
                  notifyNewOrder();
                  toast({ title: statusMsg.title, description: statusMsg.desc });
                }
              }
            }
          )
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "delivery_orders" },
            (payload) => {
              const row = payload.new as any;
              if (row.user_id === userIdRef.current) {
                const statusMsg = getDeliveryStatusMessage(row.status);
                if (statusMsg) {
                  notifyNewOrder();
                  toast({ title: statusMsg.title, description: statusMsg.desc });
                }
              }
            }
          )
          .subscribe();
        nextChannels.push(clientRideChannel);
      }

      if (userRoles.includes("admin") || userRoles.includes("agent")) {
        const adminChannel = supabase
          .channel(`global-admin-notif-${suffix}`)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "complaints" }, () => {
            notifyNewOrder();
            toast({ title: "⚠️ شكوى جديدة", description: "تم استلام شكوى جديدة" });
          })
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "tickets" }, () => {
            notifyNewOrder();
            toast({ title: "🎫 تذكرة جديدة", description: "تم إنشاء تذكرة دعم جديدة" });
          })
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "delivery_orders" }, () => {
            notifyNewOrder();
            toast({ title: "📦 طلب توصيل جديد", description: "تم استلام طلب توصيل جديد" });
          })
          .subscribe();
        nextChannels.push(adminChannel);
      }

      if (disposed || version !== setupVersion) {
        await removeChannels(nextChannels);
        return;
      }

      channels = nextChannels;
    };

    // Only setup channels when auth state changes — never call getUser() eagerly
    // to avoid lock contention on startup
    const setupFromSession = async (userId: string) => {
      const version = ++setupVersion;
      await removeChannels();

      if (disposed || version !== setupVersion) return;

      userIdRef.current = userId;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (disposed || version !== setupVersion) return;

      const userRoles = (roles || []).map((roleRow) => roleRow.role);
      await buildChannels(userId, userRoles, version);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) {
        userIdRef.current = session.user.id;
        void setupFromSession(session.user.id);
      } else {
        userIdRef.current = null;
        void removeChannels();
      }
    });

    return () => {
      disposed = true;
      setupVersion += 1;
      subscription.unsubscribe();
      void removeChannels();
    };
  }, []);

  return null; // Invisible component
};

function getNotifTitle(type: string): string {
  switch (type) {
    case "trip": return "🚗 تحديث الرحلة";
    case "earning": return "💰 أرباح جديدة";
    case "rating": return "⭐ تقييم جديد";
    case "alert": return "⚠️ تنبيه";
    case "system": return "✅ إشعار النظام";
    default: return "🔔 إشعار جديد";
  }
}

function getRideStatusMessage(status: string): { title: string; desc: string } | null {
  switch (status) {
    case "accepted": return { title: "✅ تم قبول رحلتك", desc: "السائق في طريقه إليك" };
    case "arriving": return { title: "🚗 السائق وصل", desc: "السائق في نقطة الانطلاق" };
    case "in_progress": return { title: "🛣️ الرحلة بدأت", desc: "أنت في الطريق إلى وجهتك" };
    case "completed": return { title: "🏁 تمت الرحلة", desc: "شكراً لاستخدامك خدمتنا" };
    case "cancelled": return { title: "❌ تم إلغاء الرحلة", desc: "تم إلغاء الرحلة" };
    default: return null;
  }
}

function getDeliveryStatusMessage(status: string): { title: string; desc: string } | null {
  switch (status) {
    case "confirmed": return { title: "✅ تم تأكيد طلبك", desc: "جاري تجهيز طلبك" };
    case "ready_for_driver": return { title: "📦 طلبك جاهز", desc: "بانتظار سائق لاستلام الطلب" };
    case "driver_assigned": return { title: "🚗 تم تعيين سائق", desc: "السائق في طريقه للمطعم" };
    case "on_the_way_to_vendor": return { title: "🏪 السائق متجه للمطعم", desc: "السائق في الطريق لاستلام طلبك" };
    case "picked_up": return { title: "📦 تم استلام طلبك", desc: "السائق استلم طلبك من المطعم" };
    case "on_the_way_to_customer": return { title: "🛵 طلبك في الطريق!", desc: "السائق متجه إلى موقعك الآن" };
    case "delivered": return { title: "🎉 تم التوصيل!", desc: "وصل طلبك، بالصحة والعافية!" };
    case "cancelled": return { title: "❌ تم إلغاء الطلب", desc: "تم إلغاء طلبك" };
    default: return null;
  }
}

export default GlobalNotificationListener;
