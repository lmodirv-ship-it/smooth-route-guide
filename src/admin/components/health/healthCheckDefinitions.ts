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
  category: "security" | "system" | "performance" | "data" | "runtime";
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
];
