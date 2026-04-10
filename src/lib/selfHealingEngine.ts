/**
 * Self-Healing Engine — Background service that monitors and auto-repairs runtime issues.
 * Runs silently in the background without user intervention.
 */
import { supabase } from "@/integrations/supabase/client";

interface HealingLog {
  timestamp: number;
  action: string;
  result: "success" | "fail";
  details?: string;
}

class SelfHealingEngine {
  private logs: HealingLog[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private listeners: Array<(logs: HealingLog[]) => void> = [];

  /** Start the background healing loop (every 60s) */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.log("بدء محرك الإصلاح الذاتي", "success");

    // Run immediately then every 60s
    this.runHealingCycle();
    this.intervalId = setInterval(() => this.runHealingCycle(), 60_000);

    // Monitor for connection drops
    window.addEventListener("online", () => this.handleReconnect());
    window.addEventListener("offline", () => this.log("انقطاع الاتصال — في انتظار العودة", "fail"));

    // Monitor memory pressure
    if ("memory" in performance) {
      this.monitorMemory();
    }
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.isRunning = false;
    this.log("إيقاف محرك الإصلاح الذاتي", "success");
  }

  onLog(listener: (logs: HealingLog[]) => void) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  getLogs(): HealingLog[] {
    return [...this.logs];
  }

  private log(action: string, result: "success" | "fail", details?: string) {
    const entry: HealingLog = { timestamp: Date.now(), action, result, details };
    this.logs.unshift(entry);
    if (this.logs.length > 100) this.logs = this.logs.slice(0, 100);
    this.listeners.forEach(l => l(this.getLogs()));
  }

  private async runHealingCycle() {
    try {
      await this.healAuthSession();
      await this.healSupabaseConnection();
      this.healBrowserCaches();
      this.healMemoryLeaks();
    } catch (e: any) {
      this.log("خطأ في دورة الإصلاح", "fail", e.message);
    }
  }

  /** Auto-refresh auth session if expiring soon */
  private async healAuthSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const remaining = (session.expires_at! * 1000 - Date.now()) / 60000;
      if (remaining < 10 && remaining > 0) {
        const { error } = await supabase.auth.refreshSession();
        if (!error) {
          this.log("تجديد جلسة المصادقة التلقائي", "success", `كانت ستنتهي خلال ${Math.round(remaining)} دقيقة`);
        }
      }
    } catch {
      // Silent
    }
  }

  /** Verify DB connection and reconnect Realtime if needed */
  private async healSupabaseConnection() {
    try {
      const start = Date.now();
      const { error } = await supabase.from("app_settings").select("id").limit(1);
      const ms = Date.now() - start;
      if (error) {
        this.log("فشل اتصال قاعدة البيانات — محاولة إعادة الاتصال", "fail", error.message);
        // Force reconnect realtime channels
        supabase.removeAllChannels();
      } else if (ms > 2000) {
        this.log("بطء اتصال قاعدة البيانات", "fail", `${ms}ms`);
      }
    } catch {
      // Silent
    }
  }

  /** Clean up old browser caches that might cause stale content */
  private healBrowserCaches() {
    try {
      // Clear old localStorage items that might cause issues
      const keysToCheck = ["sb-typamugwwatqmdkxkfof-auth-token"];
      for (const key of keysToCheck) {
        const val = localStorage.getItem(key);
        if (val) {
          try {
            const parsed = JSON.parse(val);
            if (parsed.expires_at && parsed.expires_at * 1000 < Date.now() - 86400000) {
              localStorage.removeItem(key);
              this.log("تنظيف رمز مصادقة منتهي", "success");
            }
          } catch { /* invalid JSON, skip */ }
        }
      }
    } catch { /* Silent */ }
  }

  /** Monitor and handle memory issues */
  private healMemoryLeaks() {
    try {
      const perf = performance as any;
      if (perf.memory) {
        const usedMB = Math.round(perf.memory.usedJSHeapSize / 1048576);
        const limitMB = Math.round(perf.memory.jsHeapSizeLimit / 1048576);
        const usage = usedMB / limitMB;
        if (usage > 0.85) {
          this.log("تحذير: استهلاك ذاكرة مرتفع", "fail", `${usedMB}MB / ${limitMB}MB (${Math.round(usage * 100)}%)`);
          // Force garbage collection hint
          if (typeof (window as any).gc === "function") {
            (window as any).gc();
          }
        }
      }
    } catch { /* Silent */ }
  }

  private monitorMemory() {
    setInterval(() => {
      const perf = performance as any;
      if (perf.memory) {
        const usedMB = Math.round(perf.memory.usedJSHeapSize / 1048576);
        const limitMB = Math.round(perf.memory.jsHeapSizeLimit / 1048576);
        if (usedMB / limitMB > 0.9) {
          this.log("ذاكرة حرجة — تنظيف تلقائي", "fail", `${usedMB}MB`);
          // Remove unused Supabase channels
          supabase.removeAllChannels();
        }
      }
    }, 30_000);
  }

  private handleReconnect() {
    this.log("عودة الاتصال — إعادة تهيئة", "success");
    // Refresh auth
    supabase.auth.refreshSession();
  }

  /** Run a specific repair action */
  async runRepair(repairId: string): Promise<string> {
    switch (repairId) {
      case "clear-all-caches": {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r => r.unregister()));
        }
        this.log("مسح جميع الكاش", "success");
        return `تم مسح ${0} service workers وكاش المتصفح`;
      }
      case "reconnect-realtime": {
        supabase.removeAllChannels();
        this.log("إعادة اتصال البث المباشر", "success");
        return "تم إعادة تهيئة اتصالات Realtime";
      }
      case "refresh-auth": {
        const { error } = await supabase.auth.refreshSession();
        if (error) throw error;
        this.log("تجديد جلسة المصادقة", "success");
        return "تم تجديد الجلسة بنجاح";
      }
      case "clear-local-storage": {
        const keysToKeep = ["hn_cache_reset_version", "sb-typamugwwatqmdkxkfof-auth-token", "i18n-locale"];
        const allKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && !keysToKeep.includes(key)) allKeys.push(key);
        }
        allKeys.forEach(k => localStorage.removeItem(k));
        this.log("تنظيف التخزين المحلي", "success", `${allKeys.length} عنصر`);
        return `تم حذف ${allKeys.length} عنصر من التخزين المحلي`;
      }
      case "force-reload": {
        this.log("إعادة تحميل قسرية", "success");
        window.location.reload();
        return "جاري إعادة التحميل...";
      }
      default:
        throw new Error("إجراء إصلاح غير معروف");
    }
  }
}

// Singleton instance
export const selfHealingEngine = new SelfHealingEngine();
