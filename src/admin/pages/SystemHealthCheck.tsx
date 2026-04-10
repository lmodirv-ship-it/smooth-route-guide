/**
 * System Health Check — Comprehensive diagnostics with self-healing engine + DB persistence.
 */
import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, Play, Loader2, Clock, Shield, Server, Zap,
  Database as DbIcon, CheckCircle, AlertTriangle, XCircle,
  Heart, Wrench, Trash2, RefreshCw, RotateCcw, WifiOff,
  History, Download, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { healthChecks, type CheckStatus, type HealthCheckResult } from "@/admin/components/health/healthCheckDefinitions";
import HealthCheckCard from "@/admin/components/health/HealthCheckCard";
import { selfHealingEngine } from "@/lib/selfHealingEngine";
import { supabase } from "@/integrations/supabase/client";

interface CheckState extends HealthCheckResult {
  id: string;
  nameAr: string;
  icon: string;
  category: string;
}

const SystemHealthCheck = () => {
  const [checks, setChecks] = useState<CheckState[]>(
    healthChecks.map(c => ({ id: c.id, nameAr: c.nameAr, icon: c.icon, category: c.category, status: "idle" as CheckStatus, message: "في الانتظار" }))
  );
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [healingLogs, setHealingLogs] = useState(selfHealingEngine.getLogs());
  const [showLogs, setShowLogs] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [dbSnapshots, setDbSnapshots] = useState<any[]>([]);
  const [dbRepairs, setDbRepairs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    selfHealingEngine.start();
    const unsub = selfHealingEngine.onLog(setHealingLogs);
    return () => { unsub(); };
  }, []);

  const updateCheck = useCallback((id: string, update: Partial<CheckState>) => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, ...update } : c));
  }, []);

  const runAllChecks = async () => {
    setScanning(true);
    setProgress(0);
    setChecks(prev => prev.map(c => ({ ...c, status: "running" as CheckStatus, message: "جاري الفحص...", fixable: false, fixAction: undefined })));

    const results: Array<{ id: string; name: string; category: string; status: string; message: string; details?: string }> = [];

    for (let i = 0; i < healthChecks.length; i++) {
      const def = healthChecks[i];
      try {
        const result = await def.run();
        updateCheck(def.id, result);
        results.push({ id: def.id, name: def.nameAr, category: def.category, status: result.status, message: result.message || "", details: result.details });
      } catch (e: any) {
        updateCheck(def.id, { status: "fail", message: e.message || "خطأ غير متوقع" });
        results.push({ id: def.id, name: def.nameAr, category: def.category, status: "fail", message: e.message });
      }
      setProgress(Math.round(((i + 1) / healthChecks.length) * 100));
    }

    setScanning(false);
    setLastScan(new Date().toLocaleString("ar-MA"));

    // Persist to database
    const passC = results.filter(r => r.status === "pass").length;
    const warnC = results.filter(r => r.status === "warn").length;
    const failC = results.filter(r => r.status === "fail").length;
    const total = passC + warnC + failC;
    const sc = total > 0 ? Math.round((passC / total) * 100) : 0;

    await selfHealingEngine.persistHealthResults(results);
    await selfHealingEngine.persistSnapshot(sc, total, passC, warnC, failC, {
      categories: results.reduce((acc, r) => {
        acc[r.category] = acc[r.category] || { pass: 0, warn: 0, fail: 0 };
        acc[r.category][r.status as "pass" | "warn" | "fail"]++;
        return acc;
      }, {} as any)
    });

    toast({ title: "✅ تم حفظ نتائج الفحص", description: `النتيجة: ${sc}% — ${passC} ناجح، ${warnC} تحذير، ${failC} فشل` });
  };

  const handleFix = async (checkId: string) => {
    const check = checks.find(c => c.id === checkId);
    if (!check?.fixAction) return;
    try {
      const result = await check.fixAction();
      updateCheck(checkId, { status: "pass", message: result, fixable: false });
      toast({ title: "✅ تم الإصلاح", description: result });
    } catch (e: any) {
      toast({ title: "❌ فشل الإصلاح", description: e.message, variant: "destructive" });
    }
  };

  const handleQuickRepair = async (repairId: string, label: string) => {
    try {
      const result = await selfHealingEngine.runRepair(repairId);
      toast({ title: `✅ ${label}`, description: result });
    } catch (e: any) {
      toast({ title: `❌ ${label}`, description: e.message, variant: "destructive" });
    }
  };

  const fixAll = async () => {
    const fixable = checks.filter(c => c.fixable && c.fixAction && (c.status === "fail" || c.status === "warn"));
    for (const c of fixable) {
      await handleFix(c.id);
    }
    toast({ title: "✅ تم إصلاح جميع المشاكل القابلة للإصلاح" });
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const [snapshotsRes, repairsRes] = await Promise.all([
        supabase.from("system_health_snapshots").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("system_repairs").select("*").order("created_at", { ascending: false }).limit(50)
      ]);
      setDbSnapshots((snapshotsRes.data as any[]) || []);
      setDbRepairs((repairsRes.data as any[]) || []);
      setShowHistory(true);
    } catch { /* silent */ }
    setLoadingHistory(false);
  };

  const passCount = checks.filter(c => c.status === "pass").length;
  const warnCount = checks.filter(c => c.status === "warn").length;
  const failCount = checks.filter(c => c.status === "fail").length;
  const total = passCount + warnCount + failCount;
  const score = total > 0 ? Math.round((passCount / total) * 100) : 0;
  const fixableCount = checks.filter(c => c.fixable && (c.status === "fail" || c.status === "warn")).length;

  const categories = [
    { key: "runtime", label: "🛠️ الإصلاح الذاتي والتشغيل", icon: Wrench },
    { key: "security", label: "🔒 الأمان", icon: Shield },
    { key: "data", label: "🗃️ سلامة البيانات", icon: DbIcon },
    { key: "system", label: "⚙️ النظام", icon: Server },
    { key: "performance", label: "⚡ الأداء", icon: Zap },
    { key: "mobile", label: "📱 التطبيقات (iOS/APK)", icon: Zap },
    { key: "sync", label: "🔄 التزامن والسيرفر", icon: RefreshCw },
  ];

  const quickRepairs = [
    { id: "clear-all-caches", label: "مسح الكاش", icon: Trash2, desc: "مسح جميع الكاش وService Workers" },
    { id: "reconnect-realtime", label: "إعادة اتصال البث", icon: WifiOff, desc: "إعادة تهيئة قنوات Realtime" },
    { id: "refresh-auth", label: "تجديد الجلسة", icon: RefreshCw, desc: "تجديد رمز المصادقة" },
    { id: "clear-local-storage", label: "تنظيف التخزين", icon: RotateCcw, desc: "حذف بيانات مؤقتة قديمة" },
    { id: "cleanup-old-data", label: "تنظيف قاعدة البيانات", icon: DbIcon, desc: "حذف سجلات أقدم من 30 يوم" },
    { id: "force-reload", label: "إعادة تحميل", icon: RefreshCw, desc: "إعادة تحميل كاملة للصفحة" },
  ];

  return (
    <div className="space-y-6 p-2 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">فحص وإصلاح النظام</h1>
            <p className="text-sm text-muted-foreground">فحص شامل + إصلاح ذاتي + قاعدة بيانات مركزية</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {lastScan && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> آخر فحص: {lastScan}
            </span>
          )}
          <Badge className="bg-green-500/20 text-green-600 gap-1">
            <Heart className="w-3 h-3" /> الإصلاح الذاتي نشط
          </Badge>
          <Button onClick={loadHistory} disabled={loadingHistory} variant="outline" className="gap-2 rounded-xl text-sm">
            {loadingHistory ? <Loader2 className="w-3 h-3 animate-spin" /> : <History className="w-3 h-3" />}
            سجل الفحوصات
          </Button>
          {fixableCount > 0 && (
            <Button onClick={fixAll} variant="outline" className="gap-2 rounded-xl text-sm">
              🔧 إصلاح الكل ({fixableCount})
            </Button>
          )}
          <Button onClick={runAllChecks} disabled={scanning} className="gap-2 rounded-xl">
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {scanning ? "جاري الفحص..." : "بدء الفحص الشامل"}
          </Button>
        </div>
      </div>

      {scanning && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1 text-center">{progress}% مكتمل</p>
        </motion.div>
      )}

      {/* History from DB */}
      {showHistory && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Snapshots history */}
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> سجل نتائج الفحوصات ({dbSnapshots.length})
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)} className="text-xs">إخفاء</Button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {dbSnapshots.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">لا توجد سجلات محفوظة بعد</p>}
              {dbSnapshots.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 text-xs p-3 rounded-xl bg-muted/30">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                    s.score >= 80 ? "border-green-500 text-green-500" :
                    s.score >= 50 ? "border-yellow-500 text-yellow-500" :
                    "border-red-500 text-red-500"
                  }`}>{s.score}%</div>
                  <div className="flex-1">
                    <div className="flex gap-3">
                      <span className="text-green-500">✓ {s.pass_count}</span>
                      <span className="text-yellow-500">⚠ {s.warn_count}</span>
                      <span className="text-red-500">✗ {s.fail_count}</span>
                    </div>
                    <span className="text-muted-foreground">{new Date(s.created_at).toLocaleString("ar-MA")}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{s.source}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Repairs history */}
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary" /> سجل الإصلاحات ({dbRepairs.length})
            </h2>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {dbRepairs.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">لا توجد إصلاحات محفوظة</p>}
              {dbRepairs.map((r: any) => (
                <div key={r.id} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-muted/30">
                  {r.status === "success" ? (
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                  )}
                  <Badge variant="outline" className="text-[10px]">{r.repair_type}</Badge>
                  <span className="text-foreground truncate">{r.description}</span>
                  {r.auto_triggered && <Badge className="bg-blue-500/20 text-blue-500 text-[10px]">تلقائي</Badge>}
                  <span className="text-muted-foreground mr-auto">{new Date(r.created_at).toLocaleString("ar-MA")}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick Repair Tools */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Wrench className="w-4 h-4 text-primary" /> أدوات الإصلاح السريع
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickRepairs.map(repair => (
            <Button
              key={repair.id}
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4 rounded-xl hover:bg-primary/5"
              onClick={() => handleQuickRepair(repair.id, repair.label)}
            >
              <repair.icon className="w-5 h-5 text-primary" />
              <span className="text-xs font-medium">{repair.label}</span>
              <span className="text-[10px] text-muted-foreground">{repair.desc}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Score */}
      {!scanning && total > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-black border-4 ${
            score >= 80 ? "border-green-500 text-green-500" :
            score >= 50 ? "border-yellow-500 text-yellow-500" :
            "border-red-500 text-red-500"
          }`}>
            {score}%
          </div>
          <div className="flex-1 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 text-green-500">
                <CheckCircle className="w-5 h-5" /><span className="text-2xl font-bold">{passCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">ناجح</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-yellow-500">
                <AlertTriangle className="w-5 h-5" /><span className="text-2xl font-bold">{warnCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">تحذير</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-red-500">
                <XCircle className="w-5 h-5" /><span className="text-2xl font-bold">{failCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">فشل</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Checks by category */}
      {categories.map(cat => {
        const catChecks = checks.filter(c => c.category === cat.key);
        if (catChecks.length === 0) return null;
        return (
          <div key={cat.key} className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">{cat.label}</h2>
            <div className="grid gap-3">
              {catChecks.map(check => (
                <HealthCheckCard
                  key={check.id}
                  nameAr={check.nameAr}
                  icon={check.icon}
                  status={check.status}
                  message={check.message}
                  details={check.details}
                  fixable={check.fixable}
                  onFix={() => handleFix(check.id)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Self-Healing Activity Log */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Heart className="w-4 h-4 text-primary" /> سجل الإصلاح الذاتي (الجلسة الحالية)
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setShowLogs(!showLogs)} className="text-xs">
            {showLogs ? "إخفاء" : `عرض (${healingLogs.length})`}
          </Button>
        </div>
        {showLogs && (
          <div className="max-h-60 overflow-y-auto space-y-1">
            {healingLogs.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">لا توجد سجلات بعد</p>}
            {healingLogs.map((log, i) => (
              <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-muted/30">
                {log.result === "success" ? (
                  <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                )}
                <span className="text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString("ar-MA")}</span>
                <span className="text-foreground">{log.action}</span>
                {log.details && <span className="text-muted-foreground truncate">— {log.details}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemHealthCheck;
