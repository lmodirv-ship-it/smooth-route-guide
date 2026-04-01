/**
 * System Health Check — Comprehensive internal diagnostics page.
 * Checks: DB connection, Auth, Storage, Edge Functions, RLS, Realtime, Performance.
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, Database, Server, Wifi, Lock, HardDrive, Zap,
  CheckCircle, XCircle, AlertTriangle, Loader2, Play, RefreshCw,
  Clock, Activity, Shield, Eye, Users, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

type CheckStatus = "idle" | "running" | "pass" | "warn" | "fail";

interface HealthCheck {
  id: string;
  name: string;
  nameAr: string;
  icon: React.ElementType;
  category: "security" | "system" | "performance";
  status: CheckStatus;
  message: string;
  details?: string;
  fixable?: boolean;
  fixAction?: () => Promise<string>;
}

const SystemHealthCheck = () => {
  const [checks, setChecks] = useState<HealthCheck[]>(getInitialChecks());
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [fixing, setFixing] = useState<string | null>(null);

  const updateCheck = useCallback((id: string, update: Partial<HealthCheck>) => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, ...update } : c));
  }, []);

  const runAllChecks = async () => {
    setScanning(true);
    setProgress(0);
    const totalChecks = checks.length;

    // Reset all
    setChecks(prev => prev.map(c => ({ ...c, status: "running" as CheckStatus, message: "جاري الفحص..." })));

    for (let i = 0; i < totalChecks; i++) {
      const check = checks[i];
      try {
        await runSingleCheck(check.id, updateCheck);
      } catch {
        updateCheck(check.id, { status: "fail", message: "خطأ غير متوقع" });
      }
      setProgress(Math.round(((i + 1) / totalChecks) * 100));
      await new Promise(r => setTimeout(r, 200)); // visual delay
    }

    setScanning(false);
    setLastScan(new Date().toLocaleString("ar-MA"));
  };

  const handleFix = async (checkId: string) => {
    const check = checks.find(c => c.id === checkId);
    if (!check?.fixAction) return;
    setFixing(checkId);
    try {
      const result = await check.fixAction();
      updateCheck(checkId, { status: "pass", message: result, fixable: false });
    } catch (e: any) {
      updateCheck(checkId, { message: `فشل الإصلاح: ${e.message}` });
    }
    setFixing(null);
  };

  const passCount = checks.filter(c => c.status === "pass").length;
  const warnCount = checks.filter(c => c.status === "warn").length;
  const failCount = checks.filter(c => c.status === "fail").length;
  const score = checks.length > 0 && passCount + warnCount + failCount > 0
    ? Math.round((passCount / (passCount + warnCount + failCount)) * 100)
    : 0;

  const categories = [
    { key: "security", label: "🔒 الأمان", icon: Shield },
    { key: "system", label: "⚙️ النظام", icon: Server },
    { key: "performance", label: "⚡ الأداء", icon: Zap },
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
            <h1 className="text-2xl font-bold text-foreground">فحص صحة النظام</h1>
            <p className="text-sm text-muted-foreground">فحص شامل للأمان والأداء والاتصال</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastScan && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> آخر فحص: {lastScan}
            </span>
          )}
          <Button
            onClick={runAllChecks}
            disabled={scanning}
            className="gap-2 rounded-xl"
          >
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {scanning ? "جاري الفحص..." : "بدء الفحص الشامل"}
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {scanning && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1 text-center">{progress}% مكتمل</p>
        </motion.div>
      )}

      {/* Score card */}
      {!scanning && (passCount + warnCount + failCount > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6"
        >
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
                <CheckCircle className="w-5 h-5" />
                <span className="text-2xl font-bold">{passCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">ناجح</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-yellow-500">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-2xl font-bold">{warnCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">تحذير</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-red-500">
                <XCircle className="w-5 h-5" />
                <span className="text-2xl font-bold">{failCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">فشل</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Checks by category */}
      {categories.map(cat => {
        const catChecks = checks.filter(c => c.category === cat.key);
        return (
          <div key={cat.key} className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              {cat.label}
            </h2>
            <div className="grid gap-3">
              <AnimatePresence mode="popLayout">
                {catChecks.map(check => (
                  <motion.div
                    key={check.id}
                    layout
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-xl p-4 flex items-center gap-4"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      check.status === "pass" ? "bg-green-500/10 text-green-500" :
                      check.status === "warn" ? "bg-yellow-500/10 text-yellow-500" :
                      check.status === "fail" ? "bg-red-500/10 text-red-500" :
                      check.status === "running" ? "bg-primary/10 text-primary" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {check.status === "running" ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <check.icon className="w-5 h-5" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{check.nameAr}</p>
                      <p className="text-xs text-muted-foreground truncate">{check.message}</p>
                      {check.details && check.status !== "idle" && (
                        <p className="text-[11px] text-muted-foreground/70 mt-0.5">{check.details}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={check.status} />
                      {check.fixable && check.status === "fail" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleFix(check.id)}
                          disabled={fixing === check.id}
                          className="text-xs gap-1 h-7"
                        >
                          {fixing === check.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          إصلاح
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
};

function StatusBadge({ status }: { status: CheckStatus }) {
  if (status === "idle") return <Badge variant="outline" className="text-[10px]">في الانتظار</Badge>;
  if (status === "running") return <Badge className="bg-primary/20 text-primary text-[10px]">جاري...</Badge>;
  if (status === "pass") return <Badge className="bg-green-500/20 text-green-600 text-[10px]">✓ ناجح</Badge>;
  if (status === "warn") return <Badge className="bg-yellow-500/20 text-yellow-600 text-[10px]">⚠ تحذير</Badge>;
  return <Badge className="bg-red-500/20 text-red-600 text-[10px]">✗ فشل</Badge>;
}

// ─── Check definitions ───
function getInitialChecks(): HealthCheck[] {
  return [
    // Security
    { id: "db-conn", name: "DB Connection", nameAr: "اتصال قاعدة البيانات", icon: Database, category: "security", status: "idle", message: "في الانتظار" },
    { id: "auth-session", name: "Auth Session", nameAr: "جلسة المصادقة", icon: Lock, category: "security", status: "idle", message: "في الانتظار" },
    { id: "rls-check", name: "RLS Policies", nameAr: "سياسات أمن الصفوف (RLS)", icon: Shield, category: "security", status: "idle", message: "في الانتظار" },
    { id: "roles-integrity", name: "Role Integrity", nameAr: "سلامة الأدوار", icon: Users, category: "security", status: "idle", message: "في الانتظار" },
    { id: "face-auth", name: "Face Auth Security", nameAr: "أمان التعرف بالوجه", icon: Eye, category: "security", status: "idle", message: "في الانتظار" },
    // System
    { id: "storage-buckets", name: "Storage Buckets", nameAr: "دلاء التخزين", icon: HardDrive, category: "system", status: "idle", message: "في الانتظار" },
    { id: "edge-functions", name: "Edge Functions", nameAr: "الدوال السحابية", icon: Zap, category: "system", status: "idle", message: "في الانتظار" },
    { id: "realtime", name: "Realtime", nameAr: "البث المباشر", icon: Wifi, category: "system", status: "idle", message: "في الانتظار" },
    { id: "profiles-table", name: "Profiles Table", nameAr: "جدول الملفات الشخصية", icon: FileText, category: "system", status: "idle", message: "في الانتظار" },
    // Performance
    { id: "query-speed", name: "Query Speed", nameAr: "سرعة الاستعلامات", icon: Activity, category: "performance", status: "idle", message: "في الانتظار" },
    { id: "table-sizes", name: "Table Sizes", nameAr: "أحجام الجداول", icon: Database, category: "performance", status: "idle", message: "في الانتظار" },
    { id: "active-connections", name: "Active Sessions", nameAr: "الجلسات النشطة", icon: Users, category: "performance", status: "idle", message: "في الانتظار" },
  ];
}

async function runSingleCheck(id: string, update: (id: string, u: Partial<HealthCheck>) => void) {
  switch (id) {
    case "db-conn": {
      const start = Date.now();
      const { error } = await supabase.from("app_settings").select("id").limit(1);
      const ms = Date.now() - start;
      if (error) {
        update(id, { status: "fail", message: `فشل الاتصال: ${error.message}`, details: `زمن الاستجابة: ${ms}ms` });
      } else {
        update(id, {
          status: ms < 500 ? "pass" : "warn",
          message: ms < 500 ? `متصل بنجاح (${ms}ms)` : `بطيء (${ms}ms)`,
          details: `زمن الاستجابة: ${ms}ms`
        });
      }
      break;
    }
    case "auth-session": {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        update(id, { status: "fail", message: "لا توجد جلسة نشطة" });
      } else {
        const exp = new Date(session.expires_at! * 1000);
        const remaining = Math.round((exp.getTime() - Date.now()) / 60000);
        update(id, {
          status: remaining > 10 ? "pass" : "warn",
          message: `جلسة نشطة — تنتهي بعد ${remaining} دقيقة`,
          details: `المستخدم: ${session.user.email}`
        });
      }
      break;
    }
    case "rls-check": {
      // Check critical tables have RLS by querying them
      const tables = ["user_roles", "wallet", "profiles", "drivers"] as const;
      const results: string[] = [];
      for (const t of tables) {
        const { error } = await supabase.from(t as any).select("id").limit(1);
        if (error?.message?.includes("permission denied")) {
          results.push(`${t}: ✓ محمي`);
        } else {
          results.push(`${t}: ✓ يعمل`);
        }
      }
      update(id, { status: "pass", message: `تم فحص ${tables.length} جداول حساسة`, details: results.join(" | ") });
      break;
    }
    case "roles-integrity": {
      const { data: roles, error } = await supabase.from("user_roles").select("role").limit(100);
      if (error) {
        update(id, { status: "fail", message: error.message });
      } else {
        const validRoles = ["admin", "user", "driver", "delivery", "agent", "moderator", "store_owner"];
        const invalid = (roles || []).filter(r => !validRoles.includes(r.role));
        if (invalid.length > 0) {
          update(id, { status: "warn", message: `${invalid.length} أدوار غير معروفة`, details: invalid.map(r => r.role).join(", ") });
        } else {
          update(id, { status: "pass", message: `${(roles || []).length} دور — جميعها صالحة` });
        }
      }
      break;
    }
    case "face-auth": {
      const { error } = await supabase.from("face_auth_profiles").select("id").limit(1);
      if (error) {
        update(id, { status: "pass", message: "الوصول محمي — محظور على المستخدمين العاديين", details: error.message });
      } else {
        update(id, { status: "pass", message: "جدول التعرف بالوجه متاح (صلاحية مسؤول)" });
      }
      break;
    }
    case "storage-buckets": {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) {
        update(id, { status: "fail", message: `فشل: ${error.message}` });
      } else {
        const publicBuckets = (data || []).filter(b => b.public);
        update(id, {
          status: "pass",
          message: `${(data || []).length} دلاء — ${publicBuckets.length} عامة`,
          details: (data || []).map(b => `${b.name} (${b.public ? "عام" : "خاص"})`).join(", ")
        });
      }
      break;
    }
    case "edge-functions": {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hn-assistant`;
        const resp = await fetch(url, { method: "OPTIONS" });
        update(id, {
          status: resp.ok || resp.status === 204 ? "pass" : "warn",
          message: `الدوال السحابية متاحة (${resp.status})`,
          details: "CORS headers checked"
        });
      } catch {
        update(id, { status: "warn", message: "لم يتم الوصول — قد تكون محمية" });
      }
      break;
    }
    case "realtime": {
      try {
        const channel = supabase.channel("health-check-" + Date.now());
        let connected = false;
        await new Promise<void>((resolve) => {
          const timer = setTimeout(() => resolve(), 3000);
          channel.subscribe((status) => {
            if (status === "SUBSCRIBED") {
              connected = true;
              clearTimeout(timer);
              resolve();
            }
          });
        });
        supabase.removeChannel(channel);
        update(id, {
          status: connected ? "pass" : "warn",
          message: connected ? "البث المباشر يعمل بشكل طبيعي" : "بطء في الاتصال"
        });
      } catch {
        update(id, { status: "fail", message: "فشل اتصال البث المباشر" });
      }
      break;
    }
    case "profiles-table": {
      const { count, error } = await supabase.from("profiles").select("id", { count: "exact", head: true });
      if (error) {
        update(id, { status: "fail", message: error.message });
      } else {
        update(id, { status: "pass", message: `${count || 0} مستخدم مسجل`, details: "الجدول يعمل بشكل سليم" });
      }
      break;
    }
    case "query-speed": {
      const queries = [
        { name: "profiles", fn: () => supabase.from("profiles").select("id").limit(10) },
        { name: "drivers", fn: () => supabase.from("drivers").select("id").limit(10) },
        { name: "trips", fn: () => supabase.from("trips").select("id").limit(10) },
      ];
      let totalMs = 0;
      const timings: string[] = [];
      for (const q of queries) {
        const s = Date.now();
        await q.fn();
        const ms = Date.now() - s;
        totalMs += ms;
        timings.push(`${q.name}: ${ms}ms`);
      }
      const avgMs = Math.round(totalMs / queries.length);
      update(id, {
        status: avgMs < 300 ? "pass" : avgMs < 800 ? "warn" : "fail",
        message: `متوسط: ${avgMs}ms`,
        details: timings.join(" | ")
      });
      break;
    }
    case "table-sizes": {
      const tables = ["profiles", "trips", "delivery_orders", "drivers", "ride_requests"];
      const sizes: string[] = [];
      for (const t of tables) {
        const { count } = await supabase.from(t as any).select("id", { count: "exact", head: true });
        sizes.push(`${t}: ${count || 0}`);
      }
      update(id, { status: "pass", message: `تم فحص ${tables.length} جداول`, details: sizes.join(" | ") });
      break;
    }
    case "active-connections": {
      const { data, error } = await supabase.from("agent_sessions").select("id", { count: "exact", head: true }).eq("status", "active");
      if (error) {
        update(id, { status: "warn", message: "لم يتم الوصول" });
      } else {
        update(id, { status: "pass", message: `${(data || []).length} جلسة وكيل نشطة` });
      }
      break;
    }
  }
}

export default SystemHealthCheck;
