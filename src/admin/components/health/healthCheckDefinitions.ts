/**
 * Health check definitions — each check knows how to diagnose AND fix issues.
 */
import { supabase } from "@/integrations/supabase/client";

export type CheckStatus = "idle" | "running" | "pass" | "warn" | "fail";

export interface HealthCheckResult {
  status: CheckStatus;
  message: string;
  details?: string;
  fixable?: boolean;
  fixAction?: () => Promise<string>;
}

export interface HealthCheckDef {
  id: string;
  nameAr: string;
  icon: string; // lucide icon name
  category: "security" | "system" | "performance" | "data";
  run: () => Promise<HealthCheckResult>;
}

// ─── Helpers ───
async function timed(fn: () => PromiseLike<any>): Promise<{ result: any; ms: number }> {
  const s = Date.now();
  const result = await fn();
  return { result, ms: Date.now() - s };
}

// ─── Check implementations ───

export const healthChecks: HealthCheckDef[] = [
  // ══════ SECURITY ══════
  {
    id: "db-conn",
    nameAr: "اتصال قاعدة البيانات",
    icon: "Database",
    category: "security",
    run: async () => {
      const { result: { error }, ms } = await timed(() =>
        supabase.from("app_settings").select("id").limit(1)
      );
      if (error) return { status: "fail", message: `فشل الاتصال: ${error.message}`, details: `${ms}ms`, fixable: false };
      return {
        status: ms < 500 ? "pass" : "warn",
        message: ms < 500 ? `متصل بنجاح (${ms}ms)` : `بطيء (${ms}ms)`,
        details: `زمن الاستجابة: ${ms}ms`,
      };
    },
  },
  {
    id: "auth-session",
    nameAr: "جلسة المصادقة",
    icon: "Lock",
    category: "security",
    run: async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) return { status: "fail", message: "لا توجد جلسة نشطة", fixable: true,
        fixAction: async () => { await supabase.auth.refreshSession(); return "تم تجديد الجلسة"; }
      };
      const remaining = Math.round((session.expires_at! * 1000 - Date.now()) / 60000);
      if (remaining < 5) {
        return {
          status: "warn",
          message: `الجلسة تنتهي خلال ${remaining} دقيقة`,
          details: `المستخدم: ${session.user.email}`,
          fixable: true,
          fixAction: async () => {
            const { error: e } = await supabase.auth.refreshSession();
            if (e) throw e;
            return "تم تجديد الجلسة بنجاح ✓";
          },
        };
      }
      return { status: "pass", message: `جلسة نشطة — تنتهي بعد ${remaining} دقيقة`, details: `المستخدم: ${session.user.email}` };
    },
  },
  {
    id: "roles-integrity",
    nameAr: "سلامة الأدوار",
    icon: "Users",
    category: "security",
    run: async () => {
      const { data: roles, error } = await supabase.from("user_roles").select("role, user_id").limit(500);
      if (error) return { status: "fail", message: error.message };
      const validRoles = ["admin", "user", "driver", "delivery", "agent", "moderator", "store_owner", "supervisor"];
      const invalid = (roles || []).filter(r => !validRoles.includes(r.role));
      if (invalid.length > 0) {
        return { status: "warn", message: `${invalid.length} أدوار غير معروفة`, details: invalid.map(r => r.role).join(", ") };
      }
      return { status: "pass", message: `${(roles || []).length} دور — جميعها صالحة` };
    },
  },

  // ══════ DATA INTEGRITY ══════
  {
    id: "orphan-drivers",
    nameAr: "سائقون بدون ملف شخصي",
    icon: "UserX",
    category: "data",
    run: async () => {
      const { data: drivers } = await supabase.from("drivers").select("id, user_id").limit(500);
      if (!drivers || drivers.length === 0) return { status: "pass", message: "لا توجد سجلات سائقين" };
      const userIds = drivers.map(d => d.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id").in("id", userIds);
      const profileIds = new Set((profiles || []).map(p => p.id));
      const orphans = drivers.filter(d => !profileIds.has(d.user_id));
      if (orphans.length > 0) {
        return {
          status: "fail",
          message: `${orphans.length} سائق بدون ملف شخصي`,
          details: orphans.map(o => o.id.slice(0, 8)).join(", "),
          fixable: true,
          fixAction: async () => {
            // Create missing profiles for orphan drivers
            for (const o of orphans) {
              await supabase.from("profiles").upsert({
                id: o.user_id,
                name: "سائق (تم الإنشاء آلياً)",
                email: "",
              }, { onConflict: "id" });
            }
            return `تم إنشاء ${orphans.length} ملف شخصي`;
          },
        };
      }
      return { status: "pass", message: `${drivers.length} سائق — جميعهم لديهم ملفات شخصية` };
    },
  },
  {
    id: "wallet-missing",
    nameAr: "مستخدمون بدون محفظة",
    icon: "Wallet",
    category: "data",
    run: async () => {
      const { data: profiles } = await supabase.from("profiles").select("id").limit(500);
      if (!profiles || profiles.length === 0) return { status: "pass", message: "لا مستخدمين" };
      const { data: wallets } = await supabase.from("wallet").select("user_id").in("user_id", profiles.map(p => p.id));
      const walletSet = new Set((wallets || []).map(w => w.user_id));
      const missing = profiles.filter(p => !walletSet.has(p.id));
      if (missing.length > 0) {
        return {
          status: "fail",
          message: `${missing.length} مستخدم بدون محفظة`,
          fixable: true,
          fixAction: async () => {
            for (const m of missing) {
              await supabase.from("wallet").upsert({ user_id: m.id, balance: 0 }, { onConflict: "user_id" });
            }
            return `تم إنشاء ${missing.length} محفظة`;
          },
        };
      }
      return { status: "pass", message: `${profiles.length} مستخدم — جميعهم لديهم محافظ` };
    },
  },
  {
    id: "stuck-trips",
    nameAr: "رحلات معلقة (أكثر من 24 ساعة)",
    icon: "AlertTriangle",
    category: "data",
    run: async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: stuck, error } = await supabase
        .from("trips")
        .select("id, status, created_at")
        .in("status", ["pending", "accepted", "in_progress"])
        .lt("created_at", yesterday)
        .limit(50);
      if (error) return { status: "fail", message: error.message };
      if (stuck && stuck.length > 0) {
        return {
          status: "warn",
          message: `${stuck.length} رحلة معلقة أكثر من 24 ساعة`,
          details: stuck.map(t => `${t.id.slice(0, 8)}:${t.status}`).join(", "),
          fixable: true,
          fixAction: async () => {
            const ids = stuck.map(t => t.id);
            const { error: e } = await supabase
              .from("trips")
              .update({ status: "cancelled" })
              .in("id", ids);
            if (e) throw e;
            return `تم إلغاء ${ids.length} رحلة معلقة`;
          },
        };
      }
      return { status: "pass", message: "لا توجد رحلات معلقة" };
    },
  },
  {
    id: "stuck-orders",
    nameAr: "طلبات توصيل معلقة (أكثر من 24 ساعة)",
    icon: "Package",
    category: "data",
    run: async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: stuck, error } = await supabase
        .from("delivery_orders")
        .select("id, status, created_at")
        .in("status", ["pending", "accepted", "picked_up"])
        .lt("created_at", yesterday)
        .limit(50);
      if (error) return { status: "fail", message: error.message };
      if (stuck && stuck.length > 0) {
        return {
          status: "warn",
          message: `${stuck.length} طلب معلق أكثر من 24 ساعة`,
          fixable: true,
          fixAction: async () => {
            const ids = stuck.map(t => t.id);
            const { error: e } = await supabase
              .from("delivery_orders")
              .update({ status: "cancelled" })
              .in("id", ids);
            if (e) throw e;
            return `تم إلغاء ${ids.length} طلب معلق`;
          },
        };
      }
      return { status: "pass", message: "لا توجد طلبات معلقة" };
    },
  },
  {
    id: "inactive-drivers",
    nameAr: "سائقون متصلون بدون نشاط",
    icon: "UserCheck",
    category: "data",
    run: async () => {
      const { data: online } = await supabase
        .from("drivers")
        .select("id, user_id, updated_at")
        .eq("status", "active")
        .limit(200);
      if (!online || online.length === 0) return { status: "pass", message: "لا سائقين متصلين" };
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const stale = online.filter(d => d.updated_at < oneHourAgo);
      if (stale.length > 0) {
        return {
          status: "warn",
          message: `${stale.length} سائق "متصل" بدون تحديث منذ ساعة+`,
          fixable: true,
          fixAction: async () => {
            const ids = stale.map(d => d.id);
            const { error } = await supabase.from("drivers").update({ status: "inactive" }).in("id", ids);
            if (error) throw error;
            return `تم تحويل ${ids.length} سائق إلى غير متصل`;
          },
        };
      }
      return { status: "pass", message: `${online.length} سائق متصل — جميعهم نشطون` };
    },
  },

  // ══════ SYSTEM ══════
  {
    id: "storage-buckets",
    nameAr: "دلاء التخزين",
    icon: "HardDrive",
    category: "system",
    run: async () => {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) return { status: "fail", message: `فشل: ${error.message}` };
      return {
        status: "pass",
        message: `${(data || []).length} دلاء تخزين`,
        details: (data || []).map(b => `${b.name} (${b.public ? "عام" : "خاص"})`).join(", "),
      };
    },
  },
  {
    id: "edge-functions",
    nameAr: "الدوال السحابية",
    icon: "Zap",
    category: "system",
    run: async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hn-assistant`;
        const resp = await fetch(url, { method: "OPTIONS" });
        return {
          status: resp.ok || resp.status === 204 || resp.status === 200 ? "pass" : "warn",
          message: `الدوال السحابية متاحة (${resp.status})`,
        };
      } catch {
        return { status: "warn", message: "لم يتم الوصول — قد تكون محمية" };
      }
    },
  },
  {
    id: "realtime",
    nameAr: "البث المباشر (Realtime)",
    icon: "Wifi",
    category: "system",
    run: async () => {
      try {
        const channel = supabase.channel("health-check-" + Date.now());
        let connected = false;
        await new Promise<void>((resolve) => {
          const timer = setTimeout(() => resolve(), 3000);
          channel.subscribe((status) => {
            if (status === "SUBSCRIBED") { connected = true; clearTimeout(timer); resolve(); }
          });
        });
        supabase.removeChannel(channel);
        return { status: connected ? "pass" : "warn", message: connected ? "البث المباشر يعمل" : "بطء في الاتصال" };
      } catch {
        return { status: "fail", message: "فشل اتصال البث المباشر" };
      }
    },
  },
  {
    id: "profiles-table",
    nameAr: "جدول الملفات الشخصية",
    icon: "FileText",
    category: "system",
    run: async () => {
      const { count, error } = await supabase.from("profiles").select("id", { count: "exact", head: true });
      if (error) return { status: "fail", message: error.message };
      return { status: "pass", message: `${count || 0} مستخدم مسجل` };
    },
  },
  {
    id: "expired-subscriptions",
    nameAr: "اشتراكات سائقين منتهية ولم تُغلق",
    icon: "CreditCard",
    category: "data",
    run: async () => {
      const now = new Date().toISOString();
      const { data: expired, error } = await supabase
        .from("driver_subscriptions")
        .select("id, driver_id, expires_at")
        .eq("status", "active")
        .lt("expires_at", now)
        .limit(100);
      if (error) return { status: "fail", message: error.message };
      if (expired && expired.length > 0) {
        return {
          status: "warn",
          message: `${expired.length} اشتراك منتهي لم يُغلق`,
          fixable: true,
          fixAction: async () => {
            const ids = expired.map(e => e.id);
            const { error: e } = await supabase
              .from("driver_subscriptions")
              .update({ status: "expired" })
              .in("id", ids);
            if (e) throw e;
            return `تم إغلاق ${ids.length} اشتراك منتهي`;
          },
        };
      }
      return { status: "pass", message: "جميع الاشتراكات محدثة" };
    },
  },

  // ══════ PERFORMANCE ══════
  {
    id: "query-speed",
    nameAr: "سرعة الاستعلامات",
    icon: "Activity",
    category: "performance",
    run: async () => {
      const queries = [
        { name: "profiles", fn: () => supabase.from("profiles").select("id").limit(10) },
        { name: "drivers", fn: () => supabase.from("drivers").select("id").limit(10) },
        { name: "trips", fn: () => supabase.from("trips").select("id").limit(10) },
      ];
      let totalMs = 0;
      const timings: string[] = [];
      for (const q of queries) {
        const { ms } = await timed(q.fn);
        totalMs += ms;
        timings.push(`${q.name}: ${ms}ms`);
      }
      const avg = Math.round(totalMs / queries.length);
      return {
        status: avg < 300 ? "pass" : avg < 800 ? "warn" : "fail",
        message: `متوسط: ${avg}ms`,
        details: timings.join(" | "),
      };
    },
  },
  {
    id: "table-sizes",
    nameAr: "أحجام الجداول",
    icon: "Database",
    category: "performance",
    run: async () => {
      const tables = ["profiles", "trips", "delivery_orders", "drivers", "ride_requests"];
      const sizes: string[] = [];
      for (const t of tables) {
        const { count } = await supabase.from(t as any).select("id", { count: "exact", head: true });
        sizes.push(`${t}: ${count || 0}`);
      }
      return { status: "pass", message: `تم فحص ${tables.length} جداول`, details: sizes.join(" | ") };
    },
  },
  {
    id: "duplicate-roles",
    nameAr: "أدوار مكررة",
    icon: "Copy",
    category: "data",
    run: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").limit(1000);
      if (!roles) return { status: "pass", message: "لا بيانات" };
      const seen = new Map<string, number>();
      for (const r of roles) {
        const key = `${r.user_id}:${r.role}`;
        seen.set(key, (seen.get(key) || 0) + 1);
      }
      const dupes = [...seen.entries()].filter(([, c]) => c > 1);
      if (dupes.length > 0) {
        return { status: "warn", message: `${dupes.length} دور مكرر`, details: dupes.map(([k]) => k.slice(0, 12)).join(", ") };
      }
      return { status: "pass", message: "لا توجد أدوار مكررة" };
    },
  },
];
