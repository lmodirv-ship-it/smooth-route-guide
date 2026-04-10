/**
 * Self-Healing Engine — Background service that monitors and auto-repairs runtime issues.
 * Persists all logs and repairs to database for history and analytics.
 */
import { supabase } from "@/integrations/supabase/client";

export interface HealingLog {
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

    this.runHealingCycle();
    this.intervalId = setInterval(() => this.runHealingCycle(), 60_000);

    window.addEventListener("online", () => this.handleReconnect());
    window.addEventListener("offline", () => this.log("انقطاع الاتصال — في انتظار العودة", "fail"));

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

  /** Persist a repair action to the database */
  private async persistRepair(repairType: string, description: string, status: "success" | "fail", errorMsg?: string, autoTriggered = false) {
    try {
      await supabase.from("system_repairs").insert({
        repair_type: repairType,
        description,
        status,
        error_message: errorMsg || null,
        source: "web",
        auto_triggered: autoTriggered,
        metadata: {
          user_agent: navigator.userAgent,
          url: window.location.href,
          timestamp: Date.now()
        }
      } as any);
    } catch { /* silent */ }
  }

  /** Save health check results to database */
  async persistHealthResults(results: Array<{ id: string; name: string; category: string; status: string; message: string; details?: string }>) {
    try {
      const rows = results.map(r => ({
        check_id: r.id,
        check_name: r.name,
        category: r.category,
        status: r.status,
        message: r.message,
        details: r.details || null,
        source: "web",
        device_info: { user_agent: navigator.userAgent, url: window.location.href }
      }));
      await supabase.from("system_health_logs").insert(rows as any);
    } catch { /* silent */ }
  }

  /** Save a health snapshot summary */
  async persistSnapshot(score: number, total: number, pass: number, warn: number, fail: number, data?: any) {
    try {
      await supabase.from("system_health_snapshots").insert({
        score, total_checks: total, pass_count: pass, warn_count: warn, fail_count: fail,
        source: "web",
        snapshot_data: data || {}
      } as any);
    } catch { /* silent */ }
  }

  /** Cleanup old data (calls DB function) */
  async cleanupOldData() {
    try {
      await supabase.rpc("cleanup_old_health_data" as any);
      this.log("تنظيف بيانات الفحص القديمة", "success");
      return "تم تنظيف البيانات القديمة بنجاح";
    } catch {
      return "لا توجد بيانات قديمة للتنظيف";
    }
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

  private async healAuthSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const remaining = (session.expires_at! * 1000 - Date.now()) / 60000;
      if (remaining < 10 && remaining > 0) {
        const { error } = await supabase.auth.refreshSession();
        if (!error) {
          this.log("تجديد جلسة المصادقة التلقائي", "success", `كانت ستنتهي خلال ${Math.round(remaining)} دقيقة`);
          await this.persistRepair("auth-refresh", "تجديد الجلسة تلقائياً", "success", undefined, true);
        }
      }
    } catch { /* Silent */ }
  }

  private async healSupabaseConnection() {
    try {
      const start = Date.now();
      const { error } = await supabase.from("app_settings").select("id").limit(1);
      const ms = Date.now() - start;
      if (error) {
        this.log("فشل اتصال قاعدة البيانات — محاولة إعادة الاتصال", "fail", error.message);
        supabase.removeAllChannels();
        await this.persistRepair("db-reconnect", "إعادة اتصال قاعدة البيانات", "fail", error.message, true);
      } else if (ms > 2000) {
        this.log("بطء اتصال قاعدة البيانات", "fail", `${ms}ms`);
      }
    } catch { /* Silent */ }
  }

  private healBrowserCaches() {
    try {
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

  private healMemoryLeaks() {
    try {
      const perf = performance as any;
      if (perf.memory) {
        const usedMB = Math.round(perf.memory.usedJSHeapSize / 1048576);
        const limitMB = Math.round(perf.memory.jsHeapSizeLimit / 1048576);
        const usage = usedMB / limitMB;
        if (usage > 0.85) {
          this.log("تحذير: استهلاك ذاكرة مرتفع", "fail", `${usedMB}MB / ${limitMB}MB (${Math.round(usage * 100)}%)`);
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
          supabase.removeAllChannels();
        }
      }
    }, 30_000);
  }

  private handleReconnect() {
    this.log("عودة الاتصال — إعادة تهيئة", "success");
    supabase.auth.refreshSession();
  }

  /** Run a specific repair action */
  async runRepair(repairId: string): Promise<string> {
    let result = "";
    let status: "success" | "fail" = "success";
    try {
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
          result = "تم مسح كاش المتصفح وService Workers";
          break;
        }
        case "reconnect-realtime": {
          supabase.removeAllChannels();
          this.log("إعادة اتصال البث المباشر", "success");
          result = "تم إعادة تهيئة اتصالات Realtime";
          break;
        }
        case "refresh-auth": {
          const { error } = await supabase.auth.refreshSession();
          if (error) throw error;
          this.log("تجديد جلسة المصادقة", "success");
          result = "تم تجديد الجلسة بنجاح";
          break;
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
          result = `تم حذف ${allKeys.length} عنصر من التخزين المحلي`;
          break;
        }
        case "cleanup-old-data": {
          result = await this.cleanupOldData();
          break;
        }
        case "force-reload": {
          this.log("إعادة تحميل قسرية", "success");
          await this.persistRepair(repairId, "إعادة تحميل قسرية", "success");
          window.location.reload();
          return "جاري إعادة التحميل...";
        }
        default:
          throw new Error("إجراء إصلاح غير معروف");
      }
      await this.persistRepair(repairId, result, "success");
      return result;
    } catch (e: any) {
      status = "fail";
      await this.persistRepair(repairId, e.message, "fail", e.message);
      throw e;
    }
  }
}

// Singleton instance
export const selfHealingEngine = new SelfHealingEngine();
