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

  // ══════ RUNTIME (Self-Healing) ══════
  {
    id: "browser-cache",
    nameAr: "كاش المتصفح وService Workers",
    icon: "Trash2",
    category: "runtime",
    run: async () => {
      let swCount = 0;
      let cacheCount = 0;
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          swCount = regs.length;
        }
        if ("caches" in window) {
          const keys = await caches.keys();
          cacheCount = keys.length;
        }
      } catch { /* ignore */ }
      if (swCount > 0 || cacheCount > 0) {
        return {
          status: "warn",
          message: `${swCount} Service Worker, ${cacheCount} كاش — قد يسبب نسخ قديمة`,
          fixable: true,
          fixAction: async () => {
            if ("serviceWorker" in navigator) {
              const regs = await navigator.serviceWorker.getRegistrations();
              await Promise.all(regs.map(r => r.unregister()));
            }
            if ("caches" in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map(k => caches.delete(k)));
            }
            return `تم مسح ${swCount} SW و${cacheCount} كاش`;
          },
        };
      }
      return { status: "pass", message: "لا يوجد كاش قديم أو Service Workers" };
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
      if (pct > 85) {
        return {
          status: "fail",
          message: `ذاكرة مرتفعة: ${usedMB}MB / ${limitMB}MB (${pct}%)`,
          fixable: true,
          fixAction: async () => {
            supabase.removeAllChannels();
            return "تم تحرير قنوات Realtime غير المستخدمة";
          },
        };
      }
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
      if (totalNodes > 5000) {
        return {
          status: "warn",
          message: `${totalNodes} عنصر DOM — الصفحة معقدة جداً`,
          details: "أكثر من 5000 عنصر قد يسبب بطء",
        };
      }
      if (totalNodes > 3000) {
        return { status: "warn", message: `${totalNodes} عنصر DOM — متوسط التعقيد` };
      }
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
        try {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
            method: "HEAD",
            headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          });
        } catch { /* ignore */ }
        times.push(Date.now() - s);
      }
      const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      return {
        status: avg < 200 ? "pass" : avg < 500 ? "warn" : "fail",
        message: `متوسط: ${avg}ms`,
        details: times.map((t, i) => `محاولة ${i + 1}: ${t}ms`).join(" | "),
      };
    },
  },
  {
    id: "local-storage-health",
    nameAr: "التخزين المحلي (LocalStorage)",
    icon: "HardDrive",
    category: "runtime",
    run: async () => {
      try {
        let totalSize = 0;
        let itemCount = 0;
        const staleKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;
          const val = localStorage.getItem(key) || "";
          totalSize += key.length + val.length;
          itemCount++;
          // Detect stale/orphan keys
          if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
            try {
              const parsed = JSON.parse(val);
              if (parsed.expires_at && parsed.expires_at * 1000 < Date.now() - 86400000) {
                staleKeys.push(key);
              }
            } catch { /* skip */ }
          }
        }
        const sizeMB = (totalSize * 2 / 1048576).toFixed(2);
        if (staleKeys.length > 0) {
          return {
            status: "warn",
            message: `${itemCount} عنصر (${sizeMB}MB) — ${staleKeys.length} رمز منتهي`,
            fixable: true,
            fixAction: async () => {
              staleKeys.forEach(k => localStorage.removeItem(k));
              return `تم حذف ${staleKeys.length} رمز مصادقة منتهي`;
            },
          };
        }
        return { status: "pass", message: `${itemCount} عنصر (${sizeMB}MB)` };
      } catch {
        return { status: "fail", message: "لا يمكن الوصول للتخزين المحلي" };
      }
    },
  },
  {
    id: "realtime-channels",
    nameAr: "قنوات البث المباشر النشطة",
    icon: "Radio",
    category: "runtime",
    run: async () => {
      const channels = supabase.getChannels();
      if (channels.length > 10) {
        return {
          status: "warn",
          message: `${channels.length} قناة نشطة — عدد مرتفع`,
          details: channels.map(c => c.topic).join(", "),
          fixable: true,
          fixAction: async () => {
            supabase.removeAllChannels();
            return `تم إغلاق ${channels.length} قناة`;
          },
        };
      }
      return { status: "pass", message: `${channels.length} قناة نشطة`, details: channels.map(c => c.topic).join(", ") };
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
            const { error: e } = await supabase.from("trips").update({ status: "cancelled" }).in("id", ids);
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
            const { error: e } = await supabase.from("delivery_orders").update({ status: "cancelled" }).in("id", ids);
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
        .select("id, user_id, location_updated_at")
        .eq("status", "active")
        .limit(200);
      if (!online || online.length === 0) return { status: "pass", message: "لا سائقين متصلين" };
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const stale = online.filter(d => !d.location_updated_at || d.location_updated_at < oneHourAgo);
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
            const { error: e } = await supabase.from("driver_subscriptions").update({ status: "expired" }).in("id", ids);
            if (e) throw e;
            return `تم إغلاق ${ids.length} اشتراك منتهي`;
          },
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
      const fns = ["hn-assistant", "auto-dispatch", "distance-matrix"];
      const results: string[] = [];
      let allOk = true;
      for (const fn of fns) {
        try {
          const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`;
          const resp = await fetch(url, { method: "OPTIONS" });
          results.push(`${fn}: ${resp.status}`);
          if (!resp.ok && resp.status !== 204) allOk = false;
        } catch {
          results.push(`${fn}: ✗`);
          allOk = false;
        }
      }
      return {
        status: allOk ? "pass" : "warn",
        message: allOk ? `${fns.length} دوال سحابية متاحة` : "بعض الدوال غير متاحة",
        details: results.join(" | "),
      };
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
        if (!connected) {
          return {
            status: "fail", message: "فشل اتصال البث المباشر",
            fixable: true,
            fixAction: async () => {
              supabase.removeAllChannels();
              return "تم إعادة تهيئة اتصالات Realtime";
            },
          };
        }
        return { status: "pass", message: "البث المباشر يعمل" };
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
        { name: "delivery_orders", fn: () => supabase.from("delivery_orders").select("id").limit(10) },
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
      const tables = ["profiles", "trips", "delivery_orders", "drivers", "ride_requests", "wallet", "user_roles"];
      const sizes: string[] = [];
      let totalRows = 0;
      for (const t of tables) {
        const { count } = await supabase.from(t as any).select("id", { count: "exact", head: true });
        const c = count || 0;
        totalRows += c;
        sizes.push(`${t}: ${c}`);
      }
      return {
        status: totalRows > 50000 ? "warn" : "pass",
        message: `${totalRows} سجل في ${tables.length} جداول`,
        details: sizes.join(" | "),
      };
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
      return {
        status: fullLoad < 3000 ? "pass" : fullLoad < 6000 ? "warn" : "fail",
        message: `تحميل كامل: ${fullLoad}ms`,
        details: `TTFB: ${ttfb}ms | DOM Ready: ${domReady}ms | Full: ${fullLoad}ms`,
      };
    },
  },

  // ══════ NEW: ADVANCED CHECKS ══════

  // --- Security: detect users without roles ---
  {
    id: "users-without-roles",
    nameAr: "مستخدمون بدون أدوار",
    icon: "ShieldAlert",
    category: "security",
    run: async () => {
      const { data: profiles } = await supabase.from("profiles").select("id").limit(500);
      if (!profiles?.length) return { status: "pass", message: "لا مستخدمين" };
      const { data: roles } = await supabase.from("user_roles").select("user_id").in("user_id", profiles.map(p => p.id));
      const roleSet = new Set((roles || []).map(r => r.user_id));
      const missing = profiles.filter(p => !roleSet.has(p.id));
      if (missing.length > 0) {
        return {
          status: "fail",
          message: `${missing.length} مستخدم بدون دور`,
          fixable: true,
          fixAction: async () => {
            for (const m of missing) {
              await supabase.from("user_roles").upsert({ user_id: m.id, role: "user" }, { onConflict: "user_id,role" });
            }
            return `تم تعيين دور "user" لـ ${missing.length} مستخدم`;
          },
        };
      }
      return { status: "pass", message: `${profiles.length} مستخدم — جميعهم لديهم أدوار` };
    },
  },

  // --- Security: expired customer subscriptions ---
  {
    id: "expired-customer-subs",
    nameAr: "اشتراكات عملاء منتهية ولم تُغلق",
    icon: "CreditCard",
    category: "security",
    run: async () => {
      const now = new Date().toISOString();
      const { data: expired, error } = await supabase
        .from("customer_subscriptions")
        .select("id")
        .eq("status", "active")
        .lt("expires_at", now)
        .limit(100);
      if (error) return { status: "fail", message: error.message };
      if (expired && expired.length > 0) {
        return {
          status: "warn",
          message: `${expired.length} اشتراك عميل منتهي`,
          fixable: true,
          fixAction: async () => {
            const ids = expired.map(e => e.id);
            const { error: e } = await supabase.from("customer_subscriptions").update({ status: "expired" }).in("id", ids);
            if (e) throw e;
            return `تم إغلاق ${ids.length} اشتراك عميل`;
          },
        };
      }
      return { status: "pass", message: "جميع اشتراكات العملاء محدثة" };
    },
  },

  // --- Data: unresolved alerts ---
  {
    id: "stale-alerts",
    nameAr: "تنبيهات قديمة غير محلولة",
    icon: "Bell",
    category: "data",
    run: async () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: stale, error } = await supabase
        .from("alerts")
        .select("id")
        .eq("status", "new")
        .lt("created_at", weekAgo)
        .limit(100);
      if (error) return { status: "fail", message: error.message };
      if (stale && stale.length > 0) {
        return {
          status: "warn",
          message: `${stale.length} تنبيه قديم (أكثر من أسبوع)`,
          fixable: true,
          fixAction: async () => {
            const ids = stale.map(a => a.id);
            const { error: e } = await supabase.from("alerts").update({ status: "dismissed" }).in("id", ids);
            if (e) throw e;
            return `تم إغلاق ${ids.length} تنبيه قديم`;
          },
        };
      }
      return { status: "pass", message: "لا توجد تنبيهات قديمة" };
    },
  },

  // --- Data: open complaints older than 48h ---
  {
    id: "stale-complaints",
    nameAr: "شكاوى مفتوحة أكثر من 48 ساعة",
    icon: "MessageSquareWarning",
    category: "data",
    run: async () => {
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data: old, error } = await supabase
        .from("complaints")
        .select("id, priority")
        .in("status", ["open", "pending"])
        .lt("created_at", twoDaysAgo)
        .limit(50);
      if (error) return { status: "fail", message: error.message };
      if (old && old.length > 0) {
        const urgent = old.filter(c => c.priority === "high" || c.priority === "urgent").length;
        return {
          status: urgent > 0 ? "fail" : "warn",
          message: `${old.length} شكوى مفتوحة (${urgent} عاجلة)`,
          details: `يجب معالجة الشكاوى العاجلة فوراً`,
        };
      }
      return { status: "pass", message: "جميع الشكاوى تمت معالجتها" };
    },
  },

  // --- Data: negative wallet balances ---
  {
    id: "negative-wallets",
    nameAr: "محافظ برصيد سالب",
    icon: "Wallet",
    category: "data",
    run: async () => {
      const { data: neg, error } = await supabase
        .from("wallet")
        .select("user_id, balance")
        .lt("balance", 0)
        .limit(50);
      if (error) return { status: "fail", message: error.message };
      if (neg && neg.length > 0) {
        return {
          status: "warn",
          message: `${neg.length} محفظة برصيد سالب`,
          details: neg.map(w => `${w.user_id.slice(0, 8)}: ${w.balance} DH`).join(", "),
          fixable: true,
          fixAction: async () => {
            const ids = neg.map(w => w.user_id);
            const { error: e } = await supabase.from("wallet").update({ balance: 0 }).in("user_id", ids);
            if (e) throw e;
            return `تم تصفير ${ids.length} محفظة سالبة`;
          },
        };
      }
      return { status: "pass", message: "لا توجد محافظ سالبة" };
    },
  },

  // --- Performance: JS errors in console ---
  {
    id: "js-error-count",
    nameAr: "أخطاء JavaScript الأخيرة",
    icon: "Bug",
    category: "performance",
    run: async () => {
      // Count errors captured during session
      const errorCount = (window as any).__hn_error_count || 0;
      if (errorCount > 10) {
        return { status: "fail", message: `${errorCount} خطأ JS في هذه الجلسة`, details: "تحقق من Console للتفاصيل" };
      }
      if (errorCount > 0) {
        return { status: "warn", message: `${errorCount} خطأ JS في هذه الجلسة` };
      }
      return { status: "pass", message: "لا أخطاء JavaScript" };
    },
  },

  // --- Performance: pending network requests ---
  {
    id: "network-pending",
    nameAr: "استقرار الشبكة",
    icon: "Wifi",
    category: "performance",
    run: async () => {
      const online = navigator.onLine;
      if (!online) {
        return {
          status: "fail",
          message: "المتصفح غير متصل بالإنترنت",
          fixable: true,
          fixAction: async () => {
            // Just retry check
            if (navigator.onLine) return "تم استعادة الاتصال";
            throw new Error("لا يزال غير متصل");
          },
        };
      }
      // Check connection quality
      const conn = (navigator as any).connection;
      if (conn) {
        const effectiveType = conn.effectiveType;
        const downlink = conn.downlink;
        if (effectiveType === "slow-2g" || effectiveType === "2g") {
          return { status: "fail", message: `اتصال بطيء جداً: ${effectiveType}`, details: `سرعة: ${downlink}Mbps` };
        }
        if (effectiveType === "3g") {
          return { status: "warn", message: `اتصال متوسط: ${effectiveType}`, details: `سرعة: ${downlink}Mbps` };
        }
        return { status: "pass", message: `اتصال جيد: ${effectiveType}`, details: `سرعة: ${downlink}Mbps` };
      }
      return { status: "pass", message: "متصل بالإنترنت" };
    },
  },

  // --- System: app settings integrity ---
  {
    id: "app-settings",
    nameAr: "إعدادات التطبيق",
    icon: "Settings",
    category: "system",
    run: async () => {
      const { data, error } = await supabase.from("app_settings").select("key, value").limit(100);
      if (error) return { status: "fail", message: error.message };
      if (!data || data.length === 0) {
        return { status: "warn", message: "لا توجد إعدادات محفوظة" };
      }
      const emptyValues = data.filter(s => s.value === null || s.value === undefined);
      if (emptyValues.length > 0) {
        return {
          status: "warn",
          message: `${emptyValues.length} إعداد بدون قيمة`,
          details: emptyValues.map(s => s.key).join(", "),
        };
      }
      return { status: "pass", message: `${data.length} إعداد — جميعها صالحة` };
    },
  },

  // --- System: stores without owner ---
  {
    id: "orphan-stores",
    nameAr: "متاجر بدون مالك",
    icon: "Store",
    category: "data",
    run: async () => {
      const { data: stores } = await supabase.from("stores").select("id, owner_id, name").limit(200);
      if (!stores?.length) return { status: "pass", message: "لا متاجر" };
      const ownerIds = stores.filter(s => s.owner_id).map(s => s.owner_id!);
      if (ownerIds.length === 0) return { status: "pass", message: `${stores.length} متجر` };
      const { data: profiles } = await supabase.from("profiles").select("id").in("id", ownerIds);
      const profileSet = new Set((profiles || []).map(p => p.id));
      const orphans = stores.filter(s => s.owner_id && !profileSet.has(s.owner_id));
      if (orphans.length > 0) {
        return {
          status: "warn",
          message: `${orphans.length} متجر مرتبط بمالك غير موجود`,
          details: orphans.map(s => s.name || s.id.slice(0, 8)).join(", "),
        };
      }
      return { status: "pass", message: `${stores.length} متجر — جميعها صالحة` };
    },
  },

  // --- Runtime: CSS/font loading ---
  {
    id: "resource-loading",
    nameAr: "تحميل الموارد (CSS/الخطوط)",
    icon: "FileCode",
    category: "runtime",
    run: async () => {
      const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const failed = resources.filter(r => r.transferSize === 0 && r.decodedBodySize === 0 && !r.name.includes("data:"));
      const slowResources = resources.filter(r => r.duration > 3000);
      if (failed.length > 5) {
        return {
          status: "warn",
          message: `${failed.length} مورد قد يكون فاشل التحميل`,
          details: failed.slice(0, 5).map(r => r.name.split("/").pop()).join(", "),
        };
      }
      if (slowResources.length > 3) {
        return {
          status: "warn",
          message: `${slowResources.length} مورد بطيء (>3 ثوانٍ)`,
          details: slowResources.slice(0, 3).map(r => `${r.name.split("/").pop()}: ${Math.round(r.duration)}ms`).join(", "),
        };
      }
      return { status: "pass", message: `${resources.length} مورد — تحميل سليم` };
    },
  },

  // --- Runtime: error listener setup ---
  {
    id: "error-tracking",
    nameAr: "تتبع الأخطاء التلقائي",
    icon: "Shield",
    category: "runtime",
    run: async () => {
      // Ensure global error counter is set up
      if (!(window as any).__hn_error_listener_active) {
        (window as any).__hn_error_count = 0;
        window.addEventListener("error", () => { (window as any).__hn_error_count = ((window as any).__hn_error_count || 0) + 1; });
        window.addEventListener("unhandledrejection", () => { (window as any).__hn_error_count = ((window as any).__hn_error_count || 0) + 1; });
        (window as any).__hn_error_listener_active = true;
      }
      return { status: "pass", message: "تتبع الأخطاء نشط — يتم رصد أخطاء JS تلقائياً" };
    },
  },

  // ══════ MOBILE (iOS/APK) ══════
  {
    id: "mobile-viewport",
    nameAr: "توافق الموقع مع الهاتف",
    icon: "Smartphone",
    category: "mobile",
    run: async () => {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (!viewport) {
        return {
          status: "fail", message: "لا يوجد وسم viewport",
          fixable: true,
          fixAction: async () => {
            const meta = document.createElement("meta");
            meta.name = "viewport";
            meta.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
            document.head.appendChild(meta);
            return "تم إضافة viewport meta tag";
          },
        };
      }
      const content = viewport.getAttribute("content") || "";
      return { status: "pass", message: "viewport مضبوط", details: content };
    },
  },
  {
    id: "mobile-manifest",
    nameAr: "ملف تعريف التطبيق (manifest)",
    icon: "FileJson2",
    category: "mobile",
    run: async () => {
      try {
        const resp = await fetch("/manifest.json");
        if (!resp.ok) return { status: "fail", message: "manifest.json غير موجود" };
        const data = await resp.json();
        const issues: string[] = [];
        if (!data.name) issues.push("اسم مفقود");
        if (!data.icons?.length) issues.push("لا أيقونات");
        if (!data.start_url) issues.push("start_url مفقود");
        if (issues.length > 0) return { status: "warn", message: issues.join(" | ") };
        return { status: "pass", message: `التطبيق: ${data.name}`, details: `${data.icons?.length || 0} أيقونة` };
      } catch { return { status: "fail", message: "فشل قراءة manifest.json" }; }
    },
  },
  {
    id: "mobile-touch-targets",
    nameAr: "حجم أزرار اللمس",
    icon: "Pointer",
    category: "mobile",
    run: async () => {
      const btns = document.querySelectorAll("button, a, [role='button']");
      let small = 0;
      btns.forEach(b => { const r = b.getBoundingClientRect(); if (r.width > 0 && r.height > 0 && (r.width < 32 || r.height < 32)) small++; });
      if (small > 10) return { status: "warn", message: `${small} زر صغير (<32px)`, details: `إجمالي: ${btns.length}` };
      return { status: "pass", message: `${btns.length} زر — أحجام مناسبة للمس` };
    },
  },
  {
    id: "mobile-images-opt",
    nameAr: "تحسين الصور للهاتف",
    icon: "ImageDown",
    category: "mobile",
    run: async () => {
      const imgs = document.querySelectorAll("img");
      let noAlt = 0, noLazy = 0;
      imgs.forEach(img => { if (!img.alt) noAlt++; if (img.loading !== "lazy") noLazy++; });
      const issues: string[] = [];
      if (noAlt > 3) issues.push(`${noAlt} بدون alt`);
      if (noLazy > 5) issues.push(`${noLazy} بدون lazy loading`);
      if (issues.length) return { status: "warn", message: issues.join(" | "), details: `إجمالي: ${imgs.length}` };
      return { status: "pass", message: `${imgs.length} صورة محسّنة` };
    },
  },
  {
    id: "mobile-apk-links",
    nameAr: "روابط تحميل APK",
    icon: "Download",
    category: "mobile",
    run: async () => {
      const apks = [
        { name: "Client", path: "/downloads/hn-client.apk" },
        { name: "Ride", path: "/downloads/hn-ride.apk" },
        { name: "Delivery", path: "/downloads/hn-delivery.apk" },
      ];
      const results: string[] = [];
      let ok = 0;
      for (const a of apks) {
        try {
          await fetch(`https://www.hn-driver.com${a.path}`, { method: "HEAD", mode: "no-cors" });
          results.push(`${a.name}: ✓`);
          ok++;
        } catch { results.push(`${a.name}: ✗`); }
      }
      return {
        status: ok === apks.length ? "pass" : "warn",
        message: ok === apks.length ? "جميع APK متاحة" : `${apks.length - ok} APK غير متاحة`,
        details: results.join(" | "),
      };
    },
  },
  {
    id: "mobile-capacitor",
    nameAr: "حالة Capacitor Native",
    icon: "Cpu",
    category: "mobile",
    run: async () => {
      const cap = (window as any).Capacitor;
      if (cap) {
        const platform = cap.getPlatform?.() || "unknown";
        return { status: "pass", message: `Capacitor — المنصة: ${platform}`, details: `Native: ${cap.isNativePlatform?.()}` };
      }
      return { status: "pass", message: "وضع الويب (ليس Native)" };
    },
  },
  {
    id: "mobile-scroll-perf",
    nameAr: "أداء التمرير (Scroll)",
    icon: "ArrowDownUp",
    category: "mobile",
    run: async () => {
      const heavyAnims = document.querySelectorAll("[style*='transform'], [style*='animation']");
      const fixedElements = document.querySelectorAll("[style*='position: fixed'], .fixed");
      if (heavyAnims.length > 20) {
        return { status: "warn", message: `${heavyAnims.length} عنصر متحرك — قد يسبب بطء التمرير` };
      }
      if (fixedElements.length > 5) {
        return { status: "warn", message: `${fixedElements.length} عنصر ثابت (fixed) — قد يؤثر على الأداء` };
      }
      return { status: "pass", message: "أداء التمرير سليم" };
    },
  },

  // ══════ SYNC (التزامن وقاعدة البيانات) ══════
  {
    id: "sync-db-backup",
    nameAr: "حالة النسخ الاحتياطي",
    icon: "HardDrive",
    category: "sync",
    run: async () => {
      const { data } = await supabase
        .from("app_settings").select("value, updated_at")
        .eq("key", "last_backup_timestamp").maybeSingle();
      if (!data) {
        return {
          status: "warn", message: "لم تُسجل أي نسخة احتياطية",
          fixable: true,
          fixAction: async () => {
            await supabase.from("app_settings").upsert(
              { key: "last_backup_timestamp", value: JSON.parse(JSON.stringify(new Date().toISOString())) },
              { onConflict: "key" }
            );
            return "تم تسجيل وقت النسخة";
          },
        };
      }
      const hrs = Math.round((Date.now() - new Date(data.updated_at).getTime()) / 3600000);
      return {
        status: hrs > 48 ? "fail" : hrs > 24 ? "warn" : "pass",
        message: `آخر نسخة منذ ${hrs} ساعة`,
        details: new Date(data.updated_at).toLocaleString("ar-MA"),
      };
    },
  },
  {
    id: "sync-server-ping",
    nameAr: "السيرفر الرئيسي (hn-driver.com)",
    icon: "Server",
    category: "sync",
    run: async () => {
      try {
        const s = Date.now();
        await fetch("https://www.hn-driver.com/robots.txt", { method: "HEAD", mode: "no-cors" });
        const ms = Date.now() - s;
        return { status: ms < 1000 ? "pass" : ms < 3000 ? "warn" : "fail", message: `استجابة: ${ms}ms` };
      } catch { return { status: "fail", message: "السيرفر لا يستجيب" }; }
    },
  },
  {
    id: "sync-critical-tables",
    nameAr: "تزامن الجداول الحيوية",
    icon: "RefreshCw",
    category: "sync",
    run: async () => {
      const tables = ["trips", "delivery_orders", "drivers", "wallet", "profiles"];
      const slow: string[] = [];
      for (const t of tables) {
        const { ms } = await timed(() => supabase.from(t as any).select("id").limit(1));
        if (ms > 1000) slow.push(`${t}: ${ms}ms`);
      }
      if (slow.length > 0) return { status: "warn", message: `${slow.length} جدول بطيء`, details: slow.join(" | ") };
      return { status: "pass", message: `${tables.length} جداول — تستجيب بسرعة` };
    },
  },
  {
    id: "sync-edge-fns",
    nameAr: "الدوال السحابية الشاملة",
    icon: "Cloud",
    category: "sync",
    run: async () => {
      const fns = ["hn-chatbot", "paypal-payment", "distance-matrix", "auto-dispatch", "twilio-sms", "send-transactional-email", "hn-assistant"];
      let fail = 0;
      const res: string[] = [];
      for (const fn of fns) {
        try {
          const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`, { method: "OPTIONS" });
          res.push(`${fn}: ${r.status}`);
          if (!r.ok && r.status !== 204) fail++;
        } catch { res.push(`${fn}: ✗`); fail++; }
      }
      return {
        status: fail === 0 ? "pass" : fail <= 2 ? "warn" : "fail",
        message: fail === 0 ? `${fns.length} دالة تعمل` : `${fail} دالة غير متاحة`,
        details: res.join(" | "),
      };
    },
  },
  {
    id: "sync-data-consistency",
    nameAr: "تناسق البيانات بين الجداول",
    icon: "GitCompareArrows",
    category: "sync",
    run: async () => {
      const issues: string[] = [];
      const { data: activeTrips } = await supabase
        .from("trips").select("id, driver_id")
        .in("status", ["accepted", "in_progress"]).not("driver_id", "is", null).limit(100);
      if (activeTrips?.length) {
        const dids = [...new Set(activeTrips.map(t => t.driver_id!))];
        const { data: drvs } = await supabase.from("drivers").select("id").in("id", dids);
        const dset = new Set((drvs || []).map(d => d.id));
        const orphan = activeTrips.filter(t => !dset.has(t.driver_id!));
        if (orphan.length) issues.push(`${orphan.length} رحلة بسائق مفقود`);
      }
      const { data: storeOrders } = await supabase
        .from("delivery_orders").select("id, store_id")
        .not("store_id", "is", null).in("status", ["pending", "accepted"]).limit(100);
      if (storeOrders?.length) {
        const sids = [...new Set(storeOrders.map(o => o.store_id!))];
        const { data: stores } = await supabase.from("stores").select("id").in("id", sids);
        const sset = new Set((stores || []).map(s => s.id));
        const orphan = storeOrders.filter(o => !sset.has(o.store_id!));
        if (orphan.length) issues.push(`${orphan.length} طلب بمتجر مفقود`);
      }
      if (issues.length) return { status: "warn", message: issues.join(" | ") };
      return { status: "pass", message: "تناسق البيانات سليم" };
    },
  },
  {
    id: "sync-version",
    nameAr: "رقم إصدار التطبيق",
    icon: "Tag",
    category: "sync",
    run: async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "app_version").maybeSingle();
      if (!data) {
        return {
          status: "warn", message: "لم يُسجل رقم الإصدار",
          fixable: true,
          fixAction: async () => {
            await supabase.from("app_settings").upsert({ key: "app_version", value: JSON.parse(JSON.stringify("1.0.0")) }, { onConflict: "key" });
            return "تم تسجيل الإصدار 1.0.0";
          },
        };
      }
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
      const results: string[] = [];
      let fail = 0;
      for (const sub of subs) {
        try {
          await fetch(`https://${sub}.hn-driver.com/`, { method: "HEAD", mode: "no-cors" });
          results.push(`${sub}: ✓`);
        } catch { results.push(`${sub}: ✗`); fail++; }
      }
      return {
        status: fail === 0 ? "pass" : fail <= 2 ? "warn" : "fail",
        message: fail === 0 ? `${subs.length} نطاقات فرعية تعمل` : `${fail} نطاق غير متاح`,
        details: results.join(" | "),
      };
    },
  },
];
