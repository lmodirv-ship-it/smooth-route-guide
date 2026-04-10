/**
 * System Health Check — Comprehensive diagnostics with self-healing engine + DB persistence.
 * Features: auto-scan, history, trend chart, category stats, quick repairs.
 */
import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, Play, Loader2, Clock, Shield, Server, Zap,
  Database as DbIcon, CheckCircle, AlertTriangle, XCircle,
  Heart, Wrench, Trash2, RefreshCw, RotateCcw, WifiOff,
  History, BarChart3, TrendingUp, TrendingDown, Minus,
  Smartphone, Globe, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [activeTab, setActiveTab] = useState("all");

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

    const passC = results.filter(r => r.status === "pass").length;
    const warnC = results.filter(r => r.status === "warn").length;
    const failC = results.filter(r => r.status === "fail").length;
    const total = passC + warnC + failC;
    const sc = total > 0 ? Math.round((passC / total) * 100) : 0;

    await selfHealingEngine.persistHealthResults(results);
    await selfHealingEngine.persistSnapshot(sc, total, passC, warnC, failC, {
      categories: results.reduce((acc, r) => {
        acc[r.category] = acc[r.category] || { pass: 0, warn: 0, fail: 0 };
        if (r.status === "pass" || r.status === "warn" || r.status === "fail") {
          acc[r.category][r.status as "pass" | "warn" | "fail"]++;
        }
        return acc;
      }, {} as any)
    });

    toast({ title: "✅ تم حفظ نتائج الفحص", description: `${sc}% — ${passC} ناجح، ${warnC} تحذير، ${failC} فشل` });
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
    for (const c of fixable) await handleFix(c.id);
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
    } catch {}
    setLoadingHistory(false);
  };

  const passCount = checks.filter(c => c.status === "pass").length;
  const warnCount = checks.filter(c => c.status === "warn").length;
  const failCount = checks.filter(c => c.status === "fail").length;
  const total = passCount + warnCount + failCount;
  const score = total > 0 ? Math.round((passCount / total) * 100) : 0;
  const fixableCount = checks.filter(c => c.fixable && (c.status === "fail" || c.status === "warn")).length;

  const categories = [
    { key: "all", label: "الكل", icon: ShieldCheck, emoji: "📊" },
    { key: "runtime", label: "التشغيل", icon: Wrench, emoji: "🛠️" },
    { key: "security", label: "الأمان", icon: Shield, emoji: "🔒" },
    { key: "data", label: "البيانات", icon: DbIcon, emoji: "🗃️" },
    { key: "system", label: "النظام", icon: Server, emoji: "⚙️" },
    { key: "performance", label: "الأداء", icon: Zap, emoji: "⚡" },
    { key: "mobile", label: "الهاتف", icon: Smartphone, emoji: "📱" },
    { key: "sync", label: "المزامنة", icon: Globe, emoji: "🔄" },
  ];

  const categoryStats = useMemo(() => {
    const stats: Record<string, { pass: number; warn: number; fail: number; total: number }> = {};
    for (const cat of categories) {
      if (cat.key === "all") continue;
      const catChecks = checks.filter(c => c.category === cat.key);
      stats[cat.key] = {
        pass: catChecks.filter(c => c.status === "pass").length,
        warn: catChecks.filter(c => c.status === "warn").length,
        fail: catChecks.filter(c => c.status === "fail").length,
        total: catChecks.length,
      };
    }
    return stats;
  }, [checks]);

  const filteredChecks = activeTab === "all" ? checks : checks.filter(c => c.category === activeTab);

  // Trend from snapshots
  const scoreTrend = useMemo(() => {
    if (dbSnapshots.length < 2) return null;
    const latest = dbSnapshots[0]?.score || 0;
    const prev = dbSnapshots[1]?.score || 0;
    return latest - prev;
  }, [dbSnapshots]);

  const quickRepairs = [
    { id: "clear-all-caches", label: "مسح الكاش", icon: Trash2, color: "text-red-500" },
    { id: "reconnect-realtime", label: "إعادة اتصال البث", icon: WifiOff, color: "text-blue-500" },
    { id: "refresh-auth", label: "تجديد الجلسة", icon: RefreshCw, color: "text-green-500" },
    { id: "clear-local-storage", label: "تنظيف التخزين", icon: RotateCcw, color: "text-orange-500" },
    { id: "cleanup-old-data", label: "تنظيف DB", icon: DbIcon, color: "text-purple-500" },
    { id: "force-reload", label: "إعادة تحميل", icon: RefreshCw, color: "text-primary" },
  ];

  return (
    <div className="space-y-4 p-2 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">مركز فحص وإصلاح النظام</h1>
            <p className="text-sm text-muted-foreground">{healthChecks.length} فحص شامل + إصلاح ذاتي + قاعدة بيانات مركزية</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {lastScan && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> {lastScan}
            </span>
          )}
          <Badge className="bg-green-500/20 text-green-600 gap-1">
            <Heart className="w-3 h-3 animate-pulse" /> نشط
          </Badge>
          <Button onClick={loadHistory} disabled={loadingHistory} variant="outline" size="sm" className="gap-1 rounded-xl text-xs">
            {loadingHistory ? <Loader2 className="w-3 h-3 animate-spin" /> : <History className="w-3 h-3" />}
            السجل
          </Button>
          {fixableCount > 0 && (
            <Button onClick={fixAll} variant="outline" size="sm" className="gap-1 rounded-xl text-xs">
              🔧 إصلاح الكل ({fixableCount})
            </Button>
          )}
          <Button onClick={runAllChecks} disabled={scanning} className="gap-2 rounded-xl">
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {scanning ? "جاري الفحص..." : "بدء الفحص"}
          </Button>
        </div>
      </div>

      {/* Progress */}
      {scanning && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1 text-center">{progress}% — فحص {Math.round(progress * healthChecks.length / 100)} من {healthChecks.length}</p>
        </motion.div>
      )}

      {/* Score + Category Stats */}
      {!scanning && total > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Main Score */}
          <div className="glass-card rounded-2xl p-5 flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              <div className={`w-28 h-28 rounded-full flex items-center justify-center text-4xl font-black border-4 ${
                score >= 80 ? "border-green-500 text-green-500" :
                score >= 50 ? "border-yellow-500 text-yellow-500" :
                "border-red-500 text-red-500"
              }`}>
                {score}%
              </div>
              {scoreTrend !== null && (
                <div className={`absolute -bottom-1 -right-1 flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full ${
                  scoreTrend > 0 ? "bg-green-500/20 text-green-600" : scoreTrend < 0 ? "bg-red-500/20 text-red-600" : "bg-muted text-muted-foreground"
                }`}>
                  {scoreTrend > 0 ? <TrendingUp className="w-3 h-3" /> : scoreTrend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  {scoreTrend > 0 ? `+${scoreTrend}` : scoreTrend}
                </div>
              )}
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
          </div>

          {/* Category mini-stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {categories.filter(c => c.key !== "all").map(cat => {
              const s = categoryStats[cat.key];
              if (!s) return null;
              const catScore = s.total > 0 ? Math.round(((s.pass) / (s.pass + s.warn + s.fail || 1)) * 100) : 0;
              return (
                <motion.button
                  key={cat.key}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setActiveTab(cat.key)}
                  className={`glass-card rounded-xl p-3 text-center cursor-pointer transition-all ${activeTab === cat.key ? "ring-2 ring-primary" : ""}`}
                >
                  <div className="text-lg mb-1">{cat.emoji}</div>
                  <p className="text-[11px] font-semibold text-foreground">{cat.label}</p>
                  <div className={`text-lg font-bold ${catScore >= 80 ? "text-green-500" : catScore >= 50 ? "text-yellow-500" : "text-red-500"}`}>
                    {s.pass + s.warn + s.fail > 0 ? `${catScore}%` : "—"}
                  </div>
                  <div className="flex justify-center gap-1.5 text-[10px] mt-1">
                    <span className="text-green-500">{s.pass}</span>
                    <span className="text-yellow-500">{s.warn}</span>
                    <span className="text-red-500">{s.fail}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* History from DB */}
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
            <div className="glass-card rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" /> نتائج الفحوصات السابقة ({dbSnapshots.length})
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)} className="text-xs">إخفاء</Button>
              </div>
              {/* Mini trend chart */}
              {dbSnapshots.length > 1 && (
                <div className="flex items-end gap-1 h-16 px-2">
                  {[...dbSnapshots].reverse().map((s: any, i: number) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-t transition-all ${s.score >= 80 ? "bg-green-500/60" : s.score >= 50 ? "bg-yellow-500/60" : "bg-red-500/60"}`}
                      style={{ height: `${Math.max(s.score, 5)}%` }}
                      title={`${s.score}% — ${new Date(s.created_at).toLocaleDateString("ar-MA")}`}
                    />
                  ))}
                </div>
              )}
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {dbSnapshots.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">لا سجلات محفوظة</p>}
                {dbSnapshots.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-3 text-xs p-2 rounded-lg bg-muted/30">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                      s.score >= 80 ? "border-green-500 text-green-500" :
                      s.score >= 50 ? "border-yellow-500 text-yellow-500" : "border-red-500 text-red-500"
                    }`}>{s.score}%</div>
                    <div className="flex gap-2">
                      <span className="text-green-500">✓{s.pass_count}</span>
                      <span className="text-yellow-500">⚠{s.warn_count}</span>
                      <span className="text-red-500">✗{s.fail_count}</span>
                    </div>
                    <span className="text-muted-foreground mr-auto">{new Date(s.created_at).toLocaleString("ar-MA")}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 space-y-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Wrench className="w-4 h-4 text-primary" /> سجل الإصلاحات ({dbRepairs.length})
              </h2>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {dbRepairs.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">لا إصلاحات</p>}
                {dbRepairs.map((r: any) => (
                  <div key={r.id} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-muted/30">
                    {r.status === "success" ? <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> : <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                    <Badge variant="outline" className="text-[10px]">{r.repair_type}</Badge>
                    <span className="text-foreground truncate">{r.description}</span>
                    {r.auto_triggered && <Badge className="bg-blue-500/20 text-blue-500 text-[10px]">تلقائي</Badge>}
                    <span className="text-muted-foreground mr-auto text-[10px]">{new Date(r.created_at).toLocaleString("ar-MA")}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Repairs */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Wrench className="w-4 h-4 text-primary" /> إصلاح سريع
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {quickRepairs.map(repair => (
            <Button
              key={repair.id}
              variant="outline"
              className="flex flex-col items-center gap-1.5 h-auto py-3 rounded-xl hover:bg-primary/5 text-xs"
              onClick={() => handleQuickRepair(repair.id, repair.label)}
            >
              <repair.icon className={`w-4 h-4 ${repair.color}`} />
              <span className="font-medium">{repair.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Tabbed Checks */}
      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/30 p-1 rounded-xl">
          {categories.map(cat => {
            const s = cat.key === "all"
              ? { pass: passCount, warn: warnCount, fail: failCount }
              : categoryStats[cat.key] || { pass: 0, warn: 0, fail: 0 };
            return (
              <TabsTrigger key={cat.key} value={cat.key} className="text-xs gap-1 rounded-lg data-[state=active]:bg-background">
                {cat.emoji} {cat.label}
                {total > 0 && s.fail > 0 && <span className="w-4 h-4 rounded-full bg-red-500/20 text-red-500 text-[10px] flex items-center justify-center">{s.fail}</span>}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 space-y-2">
          {filteredChecks.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">لا فحوصات في هذه الفئة</p>}
          {filteredChecks.map(check => (
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
        </TabsContent>
      </Tabs>

      {/* Self-Healing Log */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Heart className="w-4 h-4 text-primary animate-pulse" /> الإصلاح الذاتي
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setShowLogs(!showLogs)} className="text-xs">
            {showLogs ? "إخفاء" : `عرض (${healingLogs.length})`}
          </Button>
        </div>
        <AnimatePresence>
          {showLogs && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="max-h-60 overflow-y-auto space-y-1">
              {healingLogs.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">لا سجلات</p>}
              {healingLogs.map((log, i) => (
                <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-muted/30">
                  {log.result === "success" ? <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> : <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                  <span className="text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString("ar-MA")}</span>
                  <span className="text-foreground">{log.action}</span>
                  {log.details && <span className="text-muted-foreground truncate">— {log.details}</span>}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SystemHealthCheck;
