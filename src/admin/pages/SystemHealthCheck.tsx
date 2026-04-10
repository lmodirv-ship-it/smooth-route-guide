/**
 * System Health Check — Comprehensive diagnostics with real fix capabilities.
 */
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Play, Loader2, Clock, Shield, Server, Zap, Database as DbIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { healthChecks, type CheckStatus, type HealthCheckResult } from "@/admin/components/health/healthCheckDefinitions";
import HealthCheckCard from "@/admin/components/health/HealthCheckCard";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

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

  const updateCheck = useCallback((id: string, update: Partial<CheckState>) => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, ...update } : c));
  }, []);

  const runAllChecks = async () => {
    setScanning(true);
    setProgress(0);
    setChecks(prev => prev.map(c => ({ ...c, status: "running" as CheckStatus, message: "جاري الفحص...", fixable: false, fixAction: undefined })));

    for (let i = 0; i < healthChecks.length; i++) {
      const def = healthChecks[i];
      try {
        const result = await def.run();
        updateCheck(def.id, result);
      } catch (e: any) {
        updateCheck(def.id, { status: "fail", message: e.message || "خطأ غير متوقع" });
      }
      setProgress(Math.round(((i + 1) / healthChecks.length) * 100));
    }

    setScanning(false);
    setLastScan(new Date().toLocaleString("ar-MA"));
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

  const passCount = checks.filter(c => c.status === "pass").length;
  const warnCount = checks.filter(c => c.status === "warn").length;
  const failCount = checks.filter(c => c.status === "fail").length;
  const total = passCount + warnCount + failCount;
  const score = total > 0 ? Math.round((passCount / total) * 100) : 0;

  const categories = [
    { key: "security", label: "🔒 الأمان", icon: Shield },
    { key: "data", label: "🗃️ سلامة البيانات", icon: DbIcon },
    { key: "system", label: "⚙️ النظام", icon: Server },
    { key: "performance", label: "⚡ الأداء", icon: Zap },
  ];

  const fixableCount = checks.filter(c => c.fixable && (c.status === "fail" || c.status === "warn")).length;

  const fixAll = async () => {
    const fixable = checks.filter(c => c.fixable && c.fixAction && (c.status === "fail" || c.status === "warn"));
    for (const c of fixable) {
      await handleFix(c.id);
    }
  };

  return (
    <div className="space-y-6 p-2 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">فحص صحة النظام</h1>
            <p className="text-sm text-muted-foreground">فحص شامل مع إصلاح تلقائي للمشاكل</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {lastScan && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> آخر فحص: {lastScan}
            </span>
          )}
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
    </div>
  );
};

export default SystemHealthCheck;
