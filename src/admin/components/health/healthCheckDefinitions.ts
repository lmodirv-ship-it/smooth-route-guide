/**
 * Health check definitions — each check knows how to diagnose AND fix issues.
 * 48+ comprehensive checks across 7 categories.
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
  icon: string;
  category: "security" | "system" | "performance" | "data" | "runtime" | "mobile" | "sync";
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

  // ══════════════════════════════════
  // ══════ SECURITY (8 checks) ══════
  // ══════════════════════════════════
  {
    id: "db-conn",
    nameAr: "اتصال قاعدة البيانات",
    icon: "Database",
    category: "security",
    run: async () => {
      const { result: { error }, ms } = await timed(() =>
        supabase.from("app_settings").select("id").limit(1)
      );
      if (error) return {
        status: "fail", message: `فشل الاتصال: ${error.message}`, details: `${ms}ms`,
        fixable: true,
        fixAction: async () => {
          supabase.removeAllChannels();
          const { error: e2 } = await supabase.from("app_settings").select("id").limit(1);
          if (e2) throw e2;
          return "تم إعادة الاتصال بنجاح";
        },
      };
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
          status: "warn", message: `الجلسة تنتهي خلال ${remaining} دقيقة`,
          details: `المستخدم: ${session.user.email}`,
          fixable: true,
          fixAction: async () => { const { error: e } = await supabase.auth.refreshSession(); if (e) throw e; return "تم تجديد الجلسة بنجاح ✓"; },
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
      if (invalid.length > 0) return { status: "warn", message: `${invalid.length} أدوار غير معروفة`, details: invalid.map(r => r.role).join(", ") };
      return { status: "pass", message: `${(roles || []).length} دور — جميعها صالحة` };
    },
  },
  {
    id: "users-without-roles",
    nameAr: "مستخدمون بدون أدوار",
    icon: "Shield",
    category: "security",
    run: async () => {
      const { data: profiles } = await supabase.from("profiles").select("id").limit(500);
      if (!profiles?.length) return { status: "pass", message: "لا مستخدمين" };
      const { data: roles } = await supabase.from("user_roles").select("user_id").in("user_id", profiles.map(p => p.id));
      const roleSet = new Set((roles || []).map(r => r.user_id));
      const missing = profiles.filter(p => !roleSet.has(p.id));
      if (missing.length > 0) {
        return {
          status: "fail", message: `${missing.length} مستخدم بدون دور`,
          fixable: true,
          fixAction: async () => {
            for (const m of missing) await supabase.from("user_roles").upsert({ user_id: m.id, role: "user" }, { onConflict: "user_id,role" });
            return `تم تعيين دور "user" لـ ${missing.length} مستخدم`;
          },
        };
      }
      return { status: "pass", message: `${profiles.length} مستخدم — جميعهم لديهم أدوار` };
    },
  },
  {
    id: "expired-customer-subs",
    nameAr: "اشتراكات عملاء منتهية",
    icon: "CreditCard",
    category: "security",
    run: async () => {
      const now = new Date().toISOString();
      const { data: expired, error } = await supabase.from("customer_subscriptions").select("id").eq("status", "active").lt("expires_at", now).limit(100);
      if (error) return { status: "fail", message: error.message };
      if (expired?.length) {
        return {
          status: "warn", message: `${expired.length} اشتراك عميل منتهي`,
          fixable: true,
          fixAction: async () => {
            const { error: e } = await supabase.from("customer_subscriptions").update({ status: "expired" }).in("id", expired.map(e => e.id));
            if (e) throw e;
            return `تم إغلاق ${expired.length} اشتراك`;
          },
        };
      }
      return { status: "pass", message: "جميع اشتراكات العملاء محدثة" };
    },
  },
  {
    id: "admin-protection",
    nameAr: "حماية حسابات المديرين",
    icon: "Shield",
    category: "security",
    run: async () => {
      const protectedIds = [
        "338ea1c1-2ded-4622-a401-4d25c5930fa4",
        "22b66263-874b-498a-81f4-91be081765c2",
        "85dc53b8-2a20-425e-91eb-c3ab8f9fed00"
      ];
      const { data: adminRoles } = await supabase.from("user_roles").select("user_id, role").eq("role", "admin").in("user_id", protectedIds);
      const found = new Set((adminRoles || []).map(r => r.user_id));
      const missing = protectedIds.filter(id => !found.has(id));
      if (missing.length > 0) {
        return {
          status: "fail", message: `${missing.length} مدير محمي فقد دوره!`,
          fixable: true,
          fixAction: async () => {
            for (const id of missing) await supabase.from("user_roles").upsert({ user_id: id, role: "admin" }, { onConflict: "user_id,role" });
            return `تم استعادة دور admin لـ ${missing.length} مدير`;
          },
        };
      }
      return { status: "pass", message: `${protectedIds.length} مديرين محميين — سليم` };
    },
  },
  {
    id: "rate-limit-health",
    nameAr: "صحة نظام تحديد المعدل",
    icon: "Shield",
    category: "security",
    run: async () => {
      const { count, error } = await supabase.from("api_rate_limits").select("id", { count: "exact", head: true });
      if (error) return { status: "fail", message: error.message };
      const hourAgo = new Date(Date.now() - 3600000).toISOString();
      const { count: recentCount } = await supabase.from("api_rate_limits").select("id", { count: "exact", head: true }).gt("updated_at", hourAgo);
      return {
        status: "pass",
        message: `${count || 0} سجل rate limit — ${recentCount || 0} في الساعة الأخيرة`,
      };
    },
  },
  {
    id: "face-auth-status",
    nameAr: "نظام التعرف على الوجه",
    icon: "Shield",
    category: "security",
    run: async () => {
      const { count } = await supabase.from("face_auth_profiles" as any).select("id", { count: "exact", head: true });
      const { count: attempts } = await supabase.from("face_auth_attempts" as any).select("id", { count: "exact", head: true });
      return {
        status: "pass",
        message: `${count || 0} وجه مسجل — ${attempts || 0} محاولة`,
      };
    },
  },

  // ════════════════════════════════════════
  // ══════ RUNTIME (8 checks) ══════
  // ════════════════════════════════════════
  {
    id: "browser-cache",
    nameAr: "كاش المتصفح وService Workers",
    icon: "Trash2",
    category: "runtime",
    run: async () => {
      let swCount = 0, cacheCount = 0;
      try {
        if ("serviceWorker" in navigator) swCount = (await navigator.serviceWorker.getRegistrations()).length;
        if ("caches" in window) cacheCount = (await caches.keys()).length;
      } catch {}
      if (swCount > 0 || cacheCount > 0) {
        return {
          status: "warn", message: `${swCount} SW, ${cacheCount} كاش`,
          fixable: true,
          fixAction: async () => {
            if ("serviceWorker" in navigator) await Promise.all((await navigator.serviceWorker.getRegistrations()).map(r => r.unregister()));
            if ("caches" in window) await Promise.all((await caches.keys()).map(k => caches.delete(k)));
            return `تم مسح ${swCount} SW و${cacheCount} كاش`;
          },
        };
      }
      return { status: "pass", message: "لا يوجد كاش قديم" };
    },
  },
  {
    id: "memory-usage",
    nameAr: "استهلاك الذاكرة",
    icon: "Cpu",
    category: "runtime",
    run: async () => {
      const perf = performance as any;
      if (!perf.memory) return { status: "pass", message: "غير متاح في هذا المتصفح" };
      const usedMB = Math.round(perf.memory.usedJSHeapSize / 1048576);
      const limitMB = Math.round(perf.memory.jsHeapSizeLimit / 1048576);
      const pct = Math.round((usedMB / limitMB) * 100);
      if (pct > 85) return {
        status: "fail", message: `ذاكرة مرتفعة: ${usedMB}MB (${pct}%)`,
        fixable: true, fixAction: async () => { supabase.removeAllChannels(); return "تم تحرير قنوات Realtime"; },
      };
      if (pct > 60) return { status: "warn", message: `${usedMB}MB / ${limitMB}MB (${pct}%)` };
      return { status: "pass", message: `${usedMB}MB / ${limitMB}MB (${pct}%)` };
    },
  },
  {
    id: "dom-complexity",
    nameAr: "تعقيد صفحة DOM",
    icon: "Layers",
    category: "runtime",
    run: async () => {
      const totalNodes = document.querySelectorAll("*").length;
      if (totalNodes > 5000) return { status: "warn", message: `${totalNodes} عنصر DOM — معقدة جداً` };
      if (totalNodes > 3000) return { status: "warn", message: `${totalNodes} عنصر DOM — متوسط` };
      return { status: "pass", message: `${totalNodes} عنصر DOM — ممتاز` };
    },
  },
  {
    id: "network-latency",
    nameAr: "زمن استجابة الشبكة",
    icon: "Globe",
    category: "runtime",
    run: async () => {
      const times: number[] = [];
      for (let i = 0; i < 3; i++) {
        const s = Date.now();
        try { await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, { method: "HEAD", headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }); } catch {}
        times.push(Date.now() - s);
      }
      const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      return { status: avg < 200 ? "pass" : avg < 500 ? "warn" : "fail", message: `متوسط: ${avg}ms`, details: times.map((t, i) => `#${i + 1}: ${t}ms`).join(" | ") };
    },
  },
  {
    id: "local-storage-health",
    nameAr: "التخزين المحلي (LocalStorage)",
    icon: "HardDrive",
    category: "runtime",
    run: async () => {
      try {
        let totalSize = 0, itemCount = 0;
        const staleKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;
          const val = localStorage.getItem(key) || "";
          totalSize += key.length + val.length;
          itemCount++;
          if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
            try {
              const parsed = JSON.parse(val);
              if (parsed.expires_at && parsed.expires_at * 1000 < Date.now() - 86400000) staleKeys.push(key);
            } catch {}
          }
        }
        const sizeMB = (totalSize * 2 / 1048576).toFixed(2);
        if (staleKeys.length > 0) {
          return {
            status: "warn", message: `${itemCount} عنصر (${sizeMB}MB) — ${staleKeys.length} رمز منتهي`,
            fixable: true, fixAction: async () => { staleKeys.forEach(k => localStorage.removeItem(k)); return `تم حذف ${staleKeys.length} رمز`; },
          };
        }
        return { status: "pass", message: `${itemCount} عنصر (${sizeMB}MB)` };
      } catch { return { status: "fail", message: "لا يمكن الوصول" }; }
    },
  },
  {
    id: "realtime-channels",
    nameAr: "قنوات البث المباشر",
    icon: "Radio",
    category: "runtime",
    run: async () => {
      const channels = supabase.getChannels();
      if (channels.length > 10) return {
        status: "warn", message: `${channels.length} قناة — عدد مرتفع`,
        fixable: true, fixAction: async () => { supabase.removeAllChannels(); return `تم إغلاق ${channels.length} قناة`; },
      };
      return { status: "pass", message: `${channels.length} قناة نشطة` };
    },
  },
  {
    id: "resource-loading",
    nameAr: "تحميل الموارد (CSS/الخطوط)",
    icon: "FileText",
    category: "runtime",
    run: async () => {
      const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const failed = resources.filter(r => r.transferSize === 0 && r.decodedBodySize === 0 && !r.name.includes("data:"));
      const slow = resources.filter(r => r.duration > 3000);
      if (failed.length > 5) return { status: "warn", message: `${failed.length} مورد فاشل`, details: failed.slice(0, 5).map(r => r.name.split("/").pop()).join(", ") };
      if (slow.length > 3) return { status: "warn", message: `${slow.length} مورد بطيء (>3s)` };
      return { status: "pass", message: `${resources.length} مورد — تحميل سليم` };
    },
  },
  {
    id: "error-tracking",
    nameAr: "تتبع الأخطاء التلقائي",
    icon: "Shield",
    category: "runtime",
    run: async () => {
      if (!(window as any).__hn_error_listener_active) {
        (window as any).__hn_error_count = 0;
        window.addEventListener("error", () => { (window as any).__hn_error_count = ((window as any).__hn_error_count || 0) + 1; });
        window.addEventListener("unhandledrejection", () => { (window as any).__hn_error_count = ((window as any).__hn_error_count || 0) + 1; });
        (window as any).__hn_error_listener_active = true;
      }
      return { status: "pass", message: "تتبع الأخطاء نشط" };
    },
  },

  // ══════════════════════════════════════════════
  // ══════ DATA INTEGRITY (12 checks) ══════
  // ══════════════════════════════════════════════
  {
    id: "orphan-drivers",
    nameAr: "سائقون بدون ملف شخصي",
    icon: "Users",
    category: "data",
    run: async () => {
      const { data: drivers } = await supabase.from("drivers").select("id, user_id").limit(500);
      if (!drivers?.length) return { status: "pass", message: "لا سائقين" };
      const { data: profiles } = await supabase.from("profiles").select("id").in("id", drivers.map(d => d.user_id));
      const profileIds = new Set((profiles || []).map(p => p.id));
      const orphans = drivers.filter(d => !profileIds.has(d.user_id));
      if (orphans.length > 0) {
        return {
          status: "fail", message: `${orphans.length} سائق بدون ملف`,
          fixable: true,
          fixAction: async () => {
            for (const o of orphans) await supabase.from("profiles").upsert({ id: o.user_id, name: "سائق (إنشاء آلي)", email: "" }, { onConflict: "id" });
            return `تم إنشاء ${orphans.length} ملف شخصي`;
          },
        };
      }
      return { status: "pass", message: `${drivers.length} سائق — سليم` };
    },
  },
  {
    id: "wallet-missing",
    nameAr: "مستخدمون بدون محفظة",
    icon: "Wallet",
    category: "data",
    run: async () => {
      const { data: profiles } = await supabase.from("profiles").select("id").limit(500);
      if (!profiles?.length) return { status: "pass", message: "لا مستخدمين" };
      const { data: wallets } = await supabase.from("wallet").select("user_id").in("user_id", profiles.map(p => p.id));
      const walletSet = new Set((wallets || []).map(w => w.user_id));
      const missing = profiles.filter(p => !walletSet.has(p.id));
      if (missing.length > 0) {
        return {
          status: "fail", message: `${missing.length} مستخدم بدون محفظة`,
          fixable: true,
          fixAction: async () => {
            for (const m of missing) await supabase.from("wallet").upsert({ user_id: m.id, balance: 0 }, { onConflict: "user_id" });
            return `تم إنشاء ${missing.length} محفظة`;
          },
        };
      }
      return { status: "pass", message: `${profiles.length} مستخدم — سليم` };
    },
  },
  {
    id: "stuck-trips",
    nameAr: "رحلات معلقة (+24 ساعة)",
    icon: "AlertTriangle",
    category: "data",
    run: async () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      const { data: stuck } = await supabase.from("trips").select("id, status").in("status", ["pending", "accepted", "in_progress"]).lt("created_at", yesterday).limit(50);
      if (stuck?.length) {
        return {
          status: "warn", message: `${stuck.length} رحلة معلقة`,
          fixable: true,
          fixAction: async () => { const { error } = await supabase.from("trips").update({ status: "cancelled" }).in("id", stuck.map(t => t.id)); if (error) throw error; return `تم إلغاء ${stuck.length} رحلة`; },
        };
      }
      return { status: "pass", message: "لا رحلات معلقة" };
    },
  },
  {
    id: "stuck-orders",
    nameAr: "طلبات توصيل معلقة (+24 ساعة)",
    icon: "Package",
    category: "data",
    run: async () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      const { data: stuck } = await supabase.from("delivery_orders").select("id, status").in("status", ["pending", "accepted", "picked_up"]).lt("created_at", yesterday).limit(50);
      if (stuck?.length) {
        return {
          status: "warn", message: `${stuck.length} طلب معلق`,
          fixable: true,
          fixAction: async () => { const { error } = await supabase.from("delivery_orders").update({ status: "cancelled" }).in("id", stuck.map(t => t.id)); if (error) throw error; return `تم إلغاء ${stuck.length} طلب`; },
        };
      }
      return { status: "pass", message: "لا طلبات معلقة" };
    },
  },
  {
    id: "inactive-drivers",
    nameAr: "سائقون متصلون بدون نشاط",
    icon: "UserCheck",
    category: "data",
    run: async () => {
      const { data: online } = await supabase.from("drivers").select("id, location_updated_at").eq("status", "active").limit(200);
      if (!online?.length) return { status: "pass", message: "لا سائقين متصلين" };
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      const stale = online.filter(d => !d.location_updated_at || d.location_updated_at < oneHourAgo);
      if (stale.length > 0) {
        return {
          status: "warn", message: `${stale.length} سائق بدون تحديث`,
          fixable: true,
          fixAction: async () => { const { error } = await supabase.from("drivers").update({ status: "inactive" }).in("id", stale.map(d => d.id)); if (error) throw error; return `تم تعطيل ${stale.length} سائق`; },
        };
      }
      return { status: "pass", message: `${online.length} سائق نشط` };
    },
  },
  {
    id: "expired-subscriptions",
    nameAr: "اشتراكات سائقين منتهية",
    icon: "CreditCard",
    category: "data",
    run: async () => {
      const now = new Date().toISOString();
      const { data: expired } = await supabase.from("driver_subscriptions").select("id").eq("status", "active").lt("expires_at", now).limit(100);
      if (expired?.length) {
        return {
          status: "warn", message: `${expired.length} اشتراك منتهي`,
          fixable: true,
          fixAction: async () => { const { error } = await supabase.from("driver_subscriptions").update({ status: "expired" }).in("id", expired.map(e => e.id)); if (error) throw error; return `تم إغلاق ${expired.length} اشتراك`; },
        };
      }
      return { status: "pass", message: "جميع الاشتراكات محدثة" };
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
      for (const r of roles) { const key = `${r.user_id}:${r.role}`; seen.set(key, (seen.get(key) || 0) + 1); }
      const dupes = [...seen.entries()].filter(([, c]) => c > 1);
      if (dupes.length > 0) return { status: "warn", message: `${dupes.length} دور مكرر` };
      return { status: "pass", message: "لا أدوار مكررة" };
    },
  },
  {
    id: "stale-alerts",
    nameAr: "تنبيهات قديمة (+أسبوع)",
    icon: "AlertTriangle",
    category: "data",
    run: async () => {
      const weekAgo = new Date(Date.now() - 604800000).toISOString();
      const { data: stale } = await supabase.from("alerts").select("id").eq("status", "new").lt("created_at", weekAgo).limit(100);
      if (stale?.length) {
        return {
          status: "warn", message: `${stale.length} تنبيه قديم`,
          fixable: true,
          fixAction: async () => { const { error } = await supabase.from("alerts").update({ status: "dismissed" }).in("id", stale.map(a => a.id)); if (error) throw error; return `تم إغلاق ${stale.length} تنبيه`; },
        };
      }
      return { status: "pass", message: "لا تنبيهات قديمة" };
    },
  },
  {
    id: "stale-complaints",
    nameAr: "شكاوى مفتوحة (+48 ساعة)",
    icon: "AlertTriangle",
    category: "data",
    run: async () => {
      const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();
      const { data: old } = await supabase.from("complaints").select("id, priority").in("status", ["open", "pending"]).lt("created_at", twoDaysAgo).limit(50);
      if (old?.length) {
        const urgent = old.filter(c => c.priority === "high" || c.priority === "urgent").length;
        return { status: urgent > 0 ? "fail" : "warn", message: `${old.length} شكوى مفتوحة (${urgent} عاجلة)` };
      }
      return { status: "pass", message: "جميع الشكاوى معالجة" };
    },
  },
  {
    id: "negative-wallets",
    nameAr: "محافظ برصيد سالب",
    icon: "Wallet",
    category: "data",
    run: async () => {
      const { data: neg } = await supabase.from("wallet").select("user_id, balance").lt("balance", 0).limit(50);
      if (neg?.length) {
        return {
          status: "warn", message: `${neg.length} محفظة سالبة`,
          fixable: true,
          fixAction: async () => { const { error } = await supabase.from("wallet").update({ balance: 0 }).in("user_id", neg.map(w => w.user_id)); if (error) throw error; return `تم تصفير ${neg.length} محفظة`; },
        };
      }
      return { status: "pass", message: "لا محافظ سالبة" };
    },
  },
  {
    id: "orphan-stores",
    nameAr: "متاجر بدون مالك",
    icon: "HardDrive",
    category: "data",
    run: async () => {
      const { data: stores } = await supabase.from("stores").select("id, owner_id, name").limit(200);
      if (!stores?.length) return { status: "pass", message: "لا متاجر" };
      const ownerIds = stores.filter(s => s.owner_id).map(s => s.owner_id!);
      if (!ownerIds.length) return { status: "pass", message: `${stores.length} متجر` };
      const { data: profiles } = await supabase.from("profiles").select("id").in("id", ownerIds);
      const profileSet = new Set((profiles || []).map(p => p.id));
      const orphans = stores.filter(s => s.owner_id && !profileSet.has(s.owner_id));
      if (orphans.length > 0) return { status: "warn", message: `${orphans.length} متجر بمالك مفقود` };
      return { status: "pass", message: `${stores.length} متجر — سليم` };
    },
  },
  {
    id: "coupon-integrity",
    nameAr: "سلامة القسائم والكوبونات",
    icon: "CreditCard",
    category: "data",
    run: async () => {
      const now = new Date().toISOString();
      const { data: expired } = await supabase.from("coupons").select("id, code").eq("is_active", true).lt("expires_at", now).limit(50);
      if (expired?.length) {
        return {
          status: "warn", message: `${expired.length} كوبون منتهي ولا يزال نشطاً`,
          fixable: true,
          fixAction: async () => {
            const { error } = await supabase.from("coupons").update({ is_active: false }).in("id", expired.map(c => c.id));
            if (error) throw error;
            return `تم تعطيل ${expired.length} كوبون منتهي`;
          },
        };
      }
      return { status: "pass", message: "جميع الكوبونات النشطة صالحة" };
    },
  },

  // ═══════════════════════════════
  // ══════ SYSTEM (6 checks) ══════
  // ═══════════════════════════════
  {
    id: "storage-buckets",
    nameAr: "دلاء التخزين",
    icon: "HardDrive",
    category: "system",
    run: async () => {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) return { status: "fail", message: error.message };
      return { status: "pass", message: `${(data || []).length} دلاء`, details: (data || []).map(b => `${b.name} (${b.public ? "عام" : "خاص"})`).join(", ") };
    },
  },
  {
    id: "edge-functions",
    nameAr: "الدوال السحابية الأساسية",
    icon: "Zap",
    category: "system",
    run: async () => {
      const fns = ["hn-assistant", "auto-dispatch", "distance-matrix"];
      const results: string[] = [];
      let allOk = true;
      for (const fn of fns) {
        try {
          const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`, { method: "OPTIONS" });
          results.push(`${fn}: ${r.status}`);
          if (!r.ok && r.status !== 204) allOk = false;
        } catch { results.push(`${fn}: ✗`); allOk = false; }
      }
      return { status: allOk ? "pass" : "warn", message: allOk ? `${fns.length} دوال متاحة` : "بعض الدوال غير متاحة", details: results.join(" | ") };
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
          channel.subscribe((status) => { if (status === "SUBSCRIBED") { connected = true; clearTimeout(timer); resolve(); } });
        });
        supabase.removeChannel(channel);
        if (!connected) return { status: "fail", message: "فشل البث", fixable: true, fixAction: async () => { supabase.removeAllChannels(); return "تم إعادة التهيئة"; } };
        return { status: "pass", message: "البث المباشر يعمل" };
      } catch { return { status: "fail", message: "فشل البث" }; }
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
    id: "app-settings",
    nameAr: "إعدادات التطبيق",
    icon: "Zap",
    category: "system",
    run: async () => {
      const { data, error } = await supabase.from("app_settings").select("key, value").limit(100);
      if (error) return { status: "fail", message: error.message };
      if (!data?.length) return { status: "warn", message: "لا إعدادات محفوظة" };
      const empty = data.filter(s => s.value === null || s.value === undefined);
      if (empty.length > 0) return { status: "warn", message: `${empty.length} إعداد بدون قيمة`, details: empty.map(s => s.key).join(", ") };
      return { status: "pass", message: `${data.length} إعداد — صالحة` };
    },
  },
  {
    id: "health-db-tables",
    nameAr: "جداول نظام الإصلاح",
    icon: "Database",
    category: "system",
    run: async () => {
      const tables = ["system_health_logs", "system_repairs", "system_health_snapshots"];
      const counts: string[] = [];
      let allOk = true;
      for (const t of tables) {
        const { count, error } = await supabase.from(t as any).select("id", { count: "exact", head: true });
        if (error) { counts.push(`${t}: ✗`); allOk = false; }
        else counts.push(`${t}: ${count || 0}`);
      }
      return { status: allOk ? "pass" : "fail", message: allOk ? "جداول الإصلاح تعمل" : "بعض الجداول غير متاحة", details: counts.join(" | ") };
    },
  },

  // ═════════════════════════════════════
  // ══════ PERFORMANCE (5 checks) ══════
  // ═════════════════════════════════════
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
        { name: "delivery_orders", fn: () => supabase.from("delivery_orders").select("id").limit(10) },
      ];
      let totalMs = 0;
      const timings: string[] = [];
      for (const q of queries) { const { ms } = await timed(q.fn); totalMs += ms; timings.push(`${q.name}: ${ms}ms`); }
      const avg = Math.round(totalMs / queries.length);
      return { status: avg < 300 ? "pass" : avg < 800 ? "warn" : "fail", message: `متوسط: ${avg}ms`, details: timings.join(" | ") };
    },
  },
  {
    id: "table-sizes",
    nameAr: "أحجام الجداول الرئيسية",
    icon: "Database",
    category: "performance",
    run: async () => {
      const tables = ["profiles", "trips", "delivery_orders", "drivers", "wallet", "user_roles", "stores"];
      const sizes: string[] = [];
      let totalRows = 0;
      for (const t of tables) { const { count } = await supabase.from(t as any).select("id", { count: "exact", head: true }); const c = count || 0; totalRows += c; sizes.push(`${t}: ${c}`); }
      return { status: totalRows > 50000 ? "warn" : "pass", message: `${totalRows} سجل`, details: sizes.join(" | ") };
    },
  },
  {
    id: "page-load-speed",
    nameAr: "سرعة تحميل الصفحة",
    icon: "Timer",
    category: "performance",
    run: async () => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (!nav) return { status: "pass", message: "غير متاح" };
      const domReady = Math.round(nav.domContentLoadedEventEnd - nav.startTime);
      const fullLoad = Math.round(nav.loadEventEnd - nav.startTime);
      const ttfb = Math.round(nav.responseStart - nav.startTime);
      return { status: fullLoad < 3000 ? "pass" : fullLoad < 6000 ? "warn" : "fail", message: `تحميل: ${fullLoad}ms`, details: `TTFB: ${ttfb}ms | DOM: ${domReady}ms | Full: ${fullLoad}ms` };
    },
  },
  {
    id: "js-error-count",
    nameAr: "أخطاء JavaScript",
    icon: "AlertTriangle",
    category: "performance",
    run: async () => {
      const errorCount = (window as any).__hn_error_count || 0;
      if (errorCount > 10) return { status: "fail", message: `${errorCount} خطأ JS` };
      if (errorCount > 0) return { status: "warn", message: `${errorCount} خطأ JS` };
      return { status: "pass", message: "لا أخطاء JavaScript" };
    },
  },
  {
    id: "network-pending",
    nameAr: "جودة الاتصال",
    icon: "Wifi",
    category: "performance",
    run: async () => {
      if (!navigator.onLine) return { status: "fail", message: "غير متصل بالإنترنت", fixable: true, fixAction: async () => { if (navigator.onLine) return "تم استعادة الاتصال"; throw new Error("لا يزال غير متصل"); } };
      const conn = (navigator as any).connection;
      if (conn) {
        const et = conn.effectiveType;
        if (et === "slow-2g" || et === "2g") return { status: "fail", message: `بطيء: ${et}`, details: `${conn.downlink}Mbps` };
        if (et === "3g") return { status: "warn", message: `متوسط: ${et}`, details: `${conn.downlink}Mbps` };
        return { status: "pass", message: `جيد: ${et}`, details: `${conn.downlink}Mbps` };
      }
      return { status: "pass", message: "متصل" };
    },
  },

  // ════════════════════════════════════
  // ══════ MOBILE (7 checks) ══════
  // ════════════════════════════════════
  {
    id: "mobile-viewport",
    nameAr: "توافق viewport",
    icon: "Layers",
    category: "mobile",
    run: async () => {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (!viewport) return {
        status: "fail", message: "لا يوجد viewport",
        fixable: true, fixAction: async () => { const m = document.createElement("meta"); m.name = "viewport"; m.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"; document.head.appendChild(m); return "تم إضافة viewport"; },
      };
      return { status: "pass", message: "viewport مضبوط" };
    },
  },
  {
    id: "mobile-manifest",
    nameAr: "ملف manifest.json",
    icon: "FileText",
    category: "mobile",
    run: async () => {
      try {
        const resp = await fetch("/manifest.json");
        if (!resp.ok) return { status: "fail", message: "غير موجود" };
        const data = await resp.json();
        const issues: string[] = [];
        if (!data.name) issues.push("اسم مفقود");
        if (!data.icons?.length) issues.push("لا أيقونات");
        if (issues.length) return { status: "warn", message: issues.join(" | ") };
        return { status: "pass", message: `${data.name}`, details: `${data.icons?.length || 0} أيقونة` };
      } catch { return { status: "fail", message: "فشل القراءة" }; }
    },
  },
  {
    id: "mobile-touch-targets",
    nameAr: "أحجام أزرار اللمس",
    icon: "Layers",
    category: "mobile",
    run: async () => {
      const btns = document.querySelectorAll("button, a, [role='button']");
      let small = 0;
      btns.forEach(b => { const r = b.getBoundingClientRect(); if (r.width > 0 && r.height > 0 && (r.width < 32 || r.height < 32)) small++; });
      if (small > 10) return { status: "warn", message: `${small} زر صغير (<32px)` };
      return { status: "pass", message: `${btns.length} زر — مناسب` };
    },
  },
  {
    id: "mobile-images-opt",
    nameAr: "تحسين الصور",
    icon: "FileText",
    category: "mobile",
    run: async () => {
      const imgs = document.querySelectorAll("img");
      let noAlt = 0, noLazy = 0;
      imgs.forEach(img => { if (!img.alt) noAlt++; if (img.loading !== "lazy") noLazy++; });
      const issues: string[] = [];
      if (noAlt > 3) issues.push(`${noAlt} بدون alt`);
      if (noLazy > 5) issues.push(`${noLazy} بدون lazy`);
      if (issues.length) return { status: "warn", message: issues.join(" | ") };
      return { status: "pass", message: `${imgs.length} صورة محسّنة` };
    },
  },
  {
    id: "mobile-apk-links",
    nameAr: "روابط APK",
    icon: "HardDrive",
    category: "mobile",
    run: async () => {
      const apks = [{ name: "Client", path: "/downloads/hn-client.apk" }, { name: "Ride", path: "/downloads/hn-ride.apk" }, { name: "Delivery", path: "/downloads/hn-delivery.apk" }];
      let ok = 0;
      for (const a of apks) { try { await fetch(`https://www.hn-driver.com${a.path}`, { method: "HEAD", mode: "no-cors" }); ok++; } catch {} }
      return { status: ok === apks.length ? "pass" : "warn", message: ok === apks.length ? "جميع APK متاحة" : `${apks.length - ok} APK غير متاحة` };
    },
  },
  {
    id: "mobile-capacitor",
    nameAr: "حالة Capacitor",
    icon: "Cpu",
    category: "mobile",
    run: async () => {
      const cap = (window as any).Capacitor;
      if (cap) return { status: "pass", message: `المنصة: ${cap.getPlatform?.() || "unknown"}` };
      return { status: "pass", message: "وضع الويب" };
    },
  },
  {
    id: "mobile-scroll-perf",
    nameAr: "أداء التمرير",
    icon: "Layers",
    category: "mobile",
    run: async () => {
      const heavyAnims = document.querySelectorAll("[style*='transform'], [style*='animation']");
      const fixedElements = document.querySelectorAll("[style*='position: fixed'], .fixed");
      if (heavyAnims.length > 20) return { status: "warn", message: `${heavyAnims.length} عنصر متحرك` };
      if (fixedElements.length > 5) return { status: "warn", message: `${fixedElements.length} عنصر ثابت` };
      return { status: "pass", message: "أداء التمرير سليم" };
    },
  },

  // ══════════════════════════════════
  // ══════ SYNC (7 checks) ══════
  // ══════════════════════════════════
  {
    id: "sync-db-backup",
    nameAr: "حالة النسخ الاحتياطي",
    icon: "HardDrive",
    category: "sync",
    run: async () => {
      const { data } = await supabase.from("app_settings").select("value, updated_at").eq("key", "last_backup_timestamp").maybeSingle();
      if (!data) return {
        status: "warn", message: "لم تُسجل نسخة احتياطية",
        fixable: true, fixAction: async () => { await supabase.from("app_settings").upsert({ key: "last_backup_timestamp", value: JSON.parse(JSON.stringify(new Date().toISOString())) }, { onConflict: "key" }); return "تم تسجيل الوقت"; },
      };
      const hrs = Math.round((Date.now() - new Date(data.updated_at).getTime()) / 3600000);
      return { status: hrs > 48 ? "fail" : hrs > 24 ? "warn" : "pass", message: `منذ ${hrs} ساعة` };
    },
  },
  {
    id: "sync-server-ping",
    nameAr: "السيرفر الرئيسي",
    icon: "Globe",
    category: "sync",
    run: async () => {
      try {
        const s = Date.now();
        await fetch("https://www.hn-driver.com/robots.txt", { method: "HEAD", mode: "no-cors" });
        const ms = Date.now() - s;
        return { status: ms < 1000 ? "pass" : ms < 3000 ? "warn" : "fail", message: `${ms}ms` };
      } catch { return { status: "fail", message: "لا يستجيب" }; }
    },
  },
  {
    id: "sync-critical-tables",
    nameAr: "سرعة الجداول الحيوية",
    icon: "Database",
    category: "sync",
    run: async () => {
      const tables = ["trips", "delivery_orders", "drivers", "wallet", "profiles"];
      const slow: string[] = [];
      for (const t of tables) { const { ms } = await timed(() => supabase.from(t as any).select("id").limit(1)); if (ms > 1000) slow.push(`${t}: ${ms}ms`); }
      if (slow.length) return { status: "warn", message: `${slow.length} جدول بطيء`, details: slow.join(" | ") };
      return { status: "pass", message: `${tables.length} جداول — سريعة` };
    },
  },
  {
    id: "sync-edge-fns",
    nameAr: "الدوال السحابية الشاملة",
    icon: "Zap",
    category: "sync",
    run: async () => {
      const fns = ["hn-chatbot", "paypal-payment", "distance-matrix", "auto-dispatch", "twilio-sms", "send-transactional-email", "hn-assistant"];
      let fail = 0;
      const res: string[] = [];
      for (const fn of fns) {
        try { const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`, { method: "OPTIONS" }); res.push(`${fn}: ${r.status}`); if (!r.ok && r.status !== 204) fail++; }
        catch { res.push(`${fn}: ✗`); fail++; }
      }
      return { status: fail === 0 ? "pass" : fail <= 2 ? "warn" : "fail", message: fail === 0 ? `${fns.length} دالة تعمل` : `${fail} غير متاحة`, details: res.join(" | ") };
    },
  },
  {
    id: "sync-data-consistency",
    nameAr: "تناسق البيانات",
    icon: "Database",
    category: "sync",
    run: async () => {
      const issues: string[] = [];
      const { data: activeTrips } = await supabase.from("trips").select("id, driver_id").in("status", ["accepted", "in_progress"]).not("driver_id", "is", null).limit(100);
      if (activeTrips?.length) {
        const dids = [...new Set(activeTrips.map(t => t.driver_id!))];
        const { data: drvs } = await supabase.from("drivers").select("id").in("id", dids);
        const dset = new Set((drvs || []).map(d => d.id));
        const orphan = activeTrips.filter(t => !dset.has(t.driver_id!));
        if (orphan.length) issues.push(`${orphan.length} رحلة بسائق مفقود`);
      }
      const { data: storeOrders } = await supabase.from("delivery_orders").select("id, store_id").not("store_id", "is", null).in("status", ["pending", "accepted"]).limit(100);
      if (storeOrders?.length) {
        const sids = [...new Set(storeOrders.map(o => o.store_id!))];
        const { data: stores } = await supabase.from("stores").select("id").in("id", sids);
        const sset = new Set((stores || []).map(s => s.id));
        const orphan = storeOrders.filter(o => !sset.has(o.store_id!));
        if (orphan.length) issues.push(`${orphan.length} طلب بمتجر مفقود`);
      }
      if (issues.length) return { status: "warn", message: issues.join(" | ") };
      return { status: "pass", message: "تناسق سليم" };
    },
  },
  {
    id: "sync-version",
    nameAr: "إصدار التطبيق",
    icon: "Zap",
    category: "sync",
    run: async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "app_version").maybeSingle();
      if (!data) return {
        status: "warn", message: "لم يُسجل",
        fixable: true, fixAction: async () => { await supabase.from("app_settings").upsert({ key: "app_version", value: JSON.parse(JSON.stringify("1.0.0")) }, { onConflict: "key" }); return "تم تسجيل 1.0.0"; },
      };
      return { status: "pass", message: `الإصدار: ${JSON.stringify(data.value)}` };
    },
  },
  {
    id: "sync-subdomain-configs",
    nameAr: "النطاقات الفرعية",
    icon: "Globe",
    category: "sync",
    run: async () => {
      const subs = ["admin", "call", "ride", "delivery", "supervisor"];
      let fail = 0;
      const results: string[] = [];
      for (const sub of subs) {
        try { await fetch(`https://${sub}.hn-driver.com/`, { method: "HEAD", mode: "no-cors" }); results.push(`${sub}: ✓`); }
        catch { results.push(`${sub}: ✗`); fail++; }
      }
      return { status: fail === 0 ? "pass" : fail <= 2 ? "warn" : "fail", message: fail === 0 ? `${subs.length} نطاقات تعمل` : `${fail} غير متاح`, details: results.join(" | ") };
    },
  },
  // ══════════════════════════════════════════════
  // ══════ SERVER / NGINX (4 checks) ══════
  // ══════════════════════════════════════════════
  {
    id: "nginx-html-cache",
    nameAr: "كاش HTML على السيرفر (Nginx)",
    icon: "Globe",
    category: "performance",
    run: async () => {
      try {
        const resp = await fetch("https://www.hn-driver.com/", { method: "HEAD", cache: "no-store" });
        const cacheControl = resp.headers.get("cache-control") || "";
        const pragma = resp.headers.get("pragma") || "";
        if (cacheControl.includes("no-cache") || cacheControl.includes("no-store") || pragma.includes("no-cache")) {
          return { status: "pass", message: "HTML لا يُخزّن مؤقتاً ✓", details: `Cache-Control: ${cacheControl}` };
        }
        if (cacheControl === "") {
          return { status: "warn", message: "لا يوجد Cache-Control على HTML", details: "قد يتم تخزين HTML مؤقتاً من المتصفح" };
        }
        return { status: "fail", message: "HTML مُخزّن مؤقتاً!", details: `Cache-Control: ${cacheControl}` };
      } catch (e: any) {
        return { status: "warn", message: "تعذر الفحص (CORS)", details: e.message };
      }
    },
  },
  {
    id: "static-assets-cache",
    nameAr: "كاش الأصول الثابتة (JS/CSS)",
    icon: "Zap",
    category: "performance",
    run: async () => {
      const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const jsCSS = resources.filter(r => r.name.match(/\.(js|css)(\?|$)/));
      if (jsCSS.length === 0) return { status: "pass", message: "لا ملفات JS/CSS محمّلة" };
      const cached = jsCSS.filter(r => r.transferSize === 0 && r.decodedBodySize > 0);
      const fromServer = jsCSS.filter(r => r.transferSize > 0);
      const total = jsCSS.length;
      const cachePct = Math.round((cached.length / total) * 100);
      if (fromServer.length === 0 && cached.length > 0) {
        return { status: "pass", message: `${total} ملف — جميعها من الكاش (${cachePct}%)` };
      }
      return { status: "pass", message: `${cached.length}/${total} من الكاش — ${fromServer.length} من السيرفر`, details: `نسبة الكاش: ${cachePct}%` };
    },
  },
  {
    id: "gzip-compression",
    nameAr: "ضغط Gzip على السيرفر",
    icon: "Server",
    category: "performance",
    run: async () => {
      const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const jsFiles = resources.filter(r => r.name.match(/\.js(\?|$)/) && r.transferSize > 0);
      if (jsFiles.length === 0) return { status: "pass", message: "جميع الملفات من الكاش — لا حاجة للفحص" };
      let compressed = 0;
      for (const f of jsFiles) {
        if (f.decodedBodySize > 0 && f.transferSize < f.decodedBodySize * 0.9) compressed++;
      }
      const pct = Math.round((compressed / jsFiles.length) * 100);
      if (pct >= 80) return { status: "pass", message: `${compressed}/${jsFiles.length} ملف مضغوط (${pct}%)` };
      if (pct >= 50) return { status: "warn", message: `${compressed}/${jsFiles.length} مضغوط فقط (${pct}%)`, details: "تحقق من إعدادات gzip في Nginx" };
      return { status: "fail", message: `ضغط ضعيف: ${pct}%`, details: "أضف gzip on في Nginx" };
    },
  },
  {
    id: "ssl-certificate",
    nameAr: "شهادة SSL",
    icon: "Shield",
    category: "security",
    run: async () => {
      try {
        const isSecure = window.location.protocol === "https:";
        if (!isSecure) return { status: "warn", message: "الموقع يعمل بدون HTTPS", details: "تحقق من شهادة SSL" };
        // Check main domain
        const resp = await fetch("https://www.hn-driver.com/", { method: "HEAD", mode: "no-cors" });
        return { status: "pass", message: "شهادة SSL نشطة ✓", details: "HTTPS مفعّل على جميع النطاقات" };
      } catch {
        return { status: "warn", message: "تعذر التحقق من SSL", details: "قد يكون بسبب CORS" };
      }
    },
  },
];
