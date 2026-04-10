import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database, Table2, Search, Plus, Trash2, Edit3, Save, X, RefreshCw,
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Download,
  Loader2, Shield, Clock, FileText, AlertTriangle, Eye, Server,
  HardDrive, Activity, CheckCircle2, XCircle, Wrench, CloudOff, Zap,
  BarChart3, Rows3, Filter, Copy, MoreHorizontal, ChevronDown,
  DatabaseZap, Gauge, TrendingUp, Link2
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/db-manager`;

async function dbApi(action: string, body: Record<string, any> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const resp = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await resp.json();
  if (data.error) throw new Error(data.error);
  return data;
}

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

// ─── Stat Card ────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color = "primary" }: {
  icon: any; label: string; value: string | number; sub?: string; color?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 group hover:border-primary/30 transition-all duration-300"
  >
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/60 to-primary/0" />
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
      </div>
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
    </div>
  </motion.div>
);

// ─── Server Backup Panel ──────────────────────────────────────
const ServerBackupPanel = ({ loading, status, backups, repairs, snapshots, onRefresh }: {
  loading: boolean; status: any; backups: any[]; repairs: any[]; snapshots: any[]; onRefresh: () => void;
}) => {
  const [subTab, setSubTab] = useState<"overview" | "backups" | "repairs" | "health">("overview");

  const formatSize = (bytes: number) => {
    if (!bytes) return "—";
    if (bytes > 1073741824) return (bytes / 1073741824).toFixed(1) + " GB";
    if (bytes > 1048576) return (bytes / 1048576).toFixed(1) + " MB";
    return (bytes / 1024).toFixed(0) + " KB";
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleString("ar") : "—";

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
        <p className="text-muted-foreground">جاري تحميل بيانات السيرفر...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={HardDrive} label="نسخ في 7 أيام" value={status?.total_7d || 0} />
        <StatCard icon={CheckCircle2} label="نسخ ناجحة" value={status?.success_7d || 0} />
        <StatCard icon={XCircle} label="نسخ فاشلة" value={status?.failed_7d || 0} />
        <StatCard icon={Activity} label="صحة السيرفر" value={`${status?.last_health_score ?? "—"}%`} />
      </div>

      {/* Status Bar */}
      <div className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">آخر نسخ:</span>
          <Badge variant={status?.last_status === "success" ? "default" : "destructive"}>
            {status?.last_status === "success" ? "ناجح" : status?.last_status || "غير معروف"}
          </Badge>
          <span className="text-xs text-muted-foreground">{formatDate(status?.last_backup)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">المزامنة:</span>
          <Badge variant={status?.last_sync === "synced" ? "default" : "secondary"}>
            {status?.last_sync === "synced" ? "متزامن" : status?.last_sync || "—"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">القرص:</span>
          <span className="text-sm font-mono text-foreground">{status?.disk_usage || "N/A"}</span>
        </div>
        <Button size="sm" variant="outline" onClick={onRefresh} className="gap-1.5 mr-auto">
          <RefreshCw className="w-3.5 h-3.5" /> تحديث
        </Button>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2 bg-secondary/30 rounded-xl p-1">
        {[
          { id: "overview", label: "نظرة عامة", icon: Gauge },
          { id: "backups", label: "سجل النسخ", icon: HardDrive },
          { id: "repairs", label: "الإصلاحات", icon: Wrench },
          { id: "health", label: "لقطات الصحة", icon: Activity },
        ].map(tab => (
          <Button
            key={tab.id}
            size="sm"
            variant={subTab === tab.id ? "default" : "ghost"}
            onClick={() => setSubTab(tab.id as any)}
            className="gap-1.5 flex-1"
          >
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </Button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={subTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {subTab === "overview" && (
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Server className="w-5 h-5 text-primary" /> نظام النسخ الاحتياطي</h3>
              <div className="grid gap-3 text-sm">
                {[
                  ["النسخ اليومي", "كل يوم الساعة 3:00 صباحاً"],
                  ["النسخ الأسبوعي", "كل أحد الساعة 2:00 صباحاً"],
                  ["المزامنة التدريجية", "كل 6 ساعات"],
                  ["فحص الصحة", "كل ساعة"],
                  ["مدة الاحتفاظ (يومي)", "30 يوم"],
                  ["مدة الاحتفاظ (أسبوعي)", "12 أسبوع"],
                ].map(([label, val], i) => (
                  <div key={i} className="flex justify-between border-b border-border/50 pb-2 last:border-0">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{val}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-secondary/30 p-4 text-xs text-muted-foreground space-y-1.5">
                <p className="font-semibold text-foreground mb-2">📋 أوامر السيرفر:</p>
                {[
                  "bash /var/www/hn-driver/scripts/server/backup-database.sh",
                  "bash /var/www/hn-driver/scripts/server/sync-database.sh",
                  "bash /var/www/hn-driver/scripts/server/db-health-check.sh",
                  "bash /var/www/hn-driver/scripts/server/restore-database.sh --list",
                ].map((cmd, i) => (
                  <code key={i} className="block font-mono bg-background/50 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-background/80 transition-colors" dir="ltr">{cmd}</code>
                ))}
              </div>
            </div>
          )}

          {subTab === "backups" && (
            <div className="rounded-2xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">النوع</th>
                    <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">الحالة</th>
                    <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">الجداول</th>
                    <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">الصفوف</th>
                    <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">الحجم</th>
                    <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">المدة</th>
                    <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {backups.length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <CloudOff className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p>لا توجد نسخ احتياطية مسجلة بعد</p>
                    </td></tr>
                  ) : backups.map((b: any) => (
                    <tr key={b.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3">
                        <Badge variant="outline">{b.backup_type === "weekly" ? "أسبوعي" : b.backup_type === "sync" ? "مزامنة" : "يومي"}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={b.status === "success" ? "default" : b.status === "failed" ? "destructive" : "secondary"}>
                          {b.status === "success" ? "✅ ناجح" : b.status === "failed" ? "❌ فشل" : "⚠️ جزئي"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{b.tables_count}</td>
                      <td className="px-4 py-3 font-mono text-xs">{b.rows_total?.toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono text-xs">{formatSize(b.file_size)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{b.duration_sec}s</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(b.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {subTab === "repairs" && (
            <div className="rounded-2xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">نوع الإصلاح</th>
                    <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">الوصف</th>
                    <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">الحالة</th>
                    <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">المصدر</th>
                    <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {repairs.length === 0 ? (
                    <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">
                      <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p>لا توجد عمليات إصلاح مسجلة</p>
                    </td></tr>
                  ) : repairs.map((r: any) => (
                    <tr key={r.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3"><Badge variant="outline" className="font-mono text-xs">{r.repair_type}</Badge></td>
                      <td className="px-4 py-3 text-xs max-w-[250px] truncate">{r.description}</td>
                      <td className="px-4 py-3">
                        <Badge variant={r.status === "success" ? "default" : "destructive"}>
                          {r.status === "success" ? "✅" : "❌"} {r.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs">{r.source || "web"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {subTab === "health" && (
            <div className="space-y-3">
              {snapshots.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
                  <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>لا توجد لقطات صحة مسجلة بعد</p>
                </div>
              ) : snapshots.map((s: any) => (
                <div key={s.id} className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4">
                  <div className="text-center min-w-[70px]">
                    <p className={`text-3xl font-bold ${s.score >= 80 ? "text-green-500" : s.score >= 50 ? "text-yellow-500" : "text-red-500"}`}>
                      {s.score}%
                    </p>
                  </div>
                  <div className="flex-1">
                    <Progress value={s.score} className="h-2 mb-2" />
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>✅ {s.pass_count} ناجح</span>
                      <span>⚠️ {s.warn_count} تحذير</span>
                      <span>❌ {s.fail_count} فشل</span>
                      <span className="mr-auto">{formatDate(s.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────
const DatabaseManager = () => {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [searchColumn, setSearchColumn] = useState("");
  const [sortColumn, setSortColumn] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(false);
  const [tablesLoading, setTablesLoading] = useState(true);

  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [showNew, setShowNew] = useState(false);
  const [newData, setNewData] = useState<Record<string, any>>({});
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [activeTab, setActiveTab] = useState("data");

  // Server status
  const [serverStatus, setServerStatus] = useState<any>(null);
  const [serverBackups, setServerBackups] = useState<any[]>([]);
  const [serverRepairs, setServerRepairs] = useState<any[]>([]);
  const [serverSnapshots, setServerSnapshots] = useState<any[]>([]);
  const [serverLoading, setServerLoading] = useState(false);

  // Connection status
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);

  // Load tables
  useEffect(() => {
    setTablesLoading(true);
    dbApi("list_tables")
      .then(d => { setTables(d.tables || []); setDbConnected(true); })
      .catch(e => { toast({ title: "خطأ", description: e.message, variant: "destructive" }); setDbConnected(false); })
      .finally(() => setTablesLoading(false));
  }, []);

  // Load columns when table selected
  useEffect(() => {
    if (!selectedTable) return;
    dbApi("columns", { table: selectedTable })
      .then(d => {
        setColumns(d.columns || []);
        if (d.columns?.length > 0) setSearchColumn(d.columns[0].column_name);
      })
      .catch(() => {});
  }, [selectedTable]);

  // Load records
  const loadRecords = useCallback(async () => {
    if (!selectedTable) return;
    setLoading(true);
    try {
      const d = await dbApi("read", {
        table: selectedTable, page, pageSize,
        search: search || undefined,
        searchColumn: search ? searchColumn : undefined,
        sortColumn: sortColumn || undefined,
        sortDir,
      });
      setRecords(d.records || []);
      setTotal(d.total || 0);
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  }, [selectedTable, page, pageSize, search, searchColumn, sortColumn, sortDir]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const loadAudit = useCallback(async () => {
    if (!selectedTable) return;
    try {
      const d = await dbApi("audit_log", { table: selectedTable, page: auditPage, pageSize: 25 });
      setAuditLogs(d.logs || []);
      setAuditTotal(d.total || 0);
    } catch {}
  }, [selectedTable, auditPage]);

  useEffect(() => { if (activeTab === "audit") loadAudit(); }, [activeTab, loadAudit]);

  // Server DB status API
  const SERVER_API = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server-db-status`;
  const serverApi = async (action: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const resp = await fetch(SERVER_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ action }),
    });
    const d = await resp.json();
    if (d.error) throw new Error(d.error);
    return d;
  };

  const loadServerStatus = useCallback(async () => {
    setServerLoading(true);
    try {
      const [statusRes, repairsRes, snapshotsRes] = await Promise.all([
        serverApi("status"),
        serverApi("repairs"),
        serverApi("snapshots"),
      ]);
      setServerStatus(statusRes.summary || null);
      setServerBackups(statusRes.backups || []);
      setServerRepairs(repairsRes.repairs || []);
      setServerSnapshots(snapshotsRes.snapshots || []);
    } catch {}
    setServerLoading(false);
  }, []);

  useEffect(() => { if (activeTab === "server") loadServerStatus(); }, [activeTab, loadServerStatus]);

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(col);
      setSortDir("asc");
    }
    setPage(1);
  };

  const handleInsert = async () => {
    if (!selectedTable) return;
    try {
      await dbApi("insert", { table: selectedTable, record: newData });
      toast({ title: "تمت الإضافة", description: "تم إضافة السجل بنجاح" });
      setShowNew(false);
      setNewData({});
      loadRecords();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
  };

  const handleUpdate = async () => {
    if (!selectedTable || !selectedRecord?.id) return;
    try {
      const changes: Record<string, any> = {};
      for (const k of Object.keys(editData)) {
        if (JSON.stringify(editData[k]) !== JSON.stringify(selectedRecord[k])) {
          changes[k] = editData[k];
        }
      }
      if (Object.keys(changes).length === 0) {
        toast({ title: "لا توجد تغييرات" });
        return;
      }
      const d = await dbApi("update", { table: selectedTable, id: selectedRecord.id, changes });
      toast({ title: "تم التحديث", description: "تم تحديث السجل بنجاح" });
      setSelectedRecord(d.record);
      setEditMode(false);
      loadRecords();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!selectedTable || !deleteTarget?.id) return;
    try {
      await dbApi("delete", { table: selectedTable, id: deleteTarget.id });
      toast({ title: "تم الحذف", description: "تم حذف السجل بنجاح" });
      setDeleteTarget(null);
      if (selectedRecord?.id === deleteTarget.id) setSelectedRecord(null);
      loadRecords();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
  };

  const exportCSV = () => {
    if (records.length === 0) return;
    const headers = Object.keys(records[0]);
    const csv = [
      headers.join(","),
      ...records.map(r => headers.map(h => {
        const v = r[h];
        const s = v === null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
        return `"${s.replace(/"/g, '""')}"`;
      }).join(","))
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedTable}_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyValue = (val: any) => {
    navigator.clipboard.writeText(typeof val === "object" ? JSON.stringify(val) : String(val));
    toast({ title: "تم النسخ", description: "تم نسخ القيمة" });
  };

  const filteredTables = useMemo(() => {
    if (!tableSearch) return tables;
    return tables.filter(t => t.toLowerCase().includes(tableSearch.toLowerCase()));
  }, [tables, tableSearch]);

  const totalPages = Math.ceil(total / pageSize);
  const visibleColumns = columns.filter(c => !["created_at", "updated_at"].includes(c.column_name)).slice(0, 6);

  const formatCellValue = (val: any) => {
    if (val === null || val === undefined) return <span className="text-muted-foreground/50 italic text-xs">null</span>;
    if (typeof val === "boolean") return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium ${val ? "text-green-500" : "text-red-400"}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${val ? "bg-green-500" : "bg-red-400"}`} />
        {val ? "true" : "false"}
      </span>
    );
    if (typeof val === "object") return <span className="text-[11px] font-mono text-muted-foreground">{JSON.stringify(val).slice(0, 40)}…</span>;
    const s = String(val);
    return s.length > 40 ? s.slice(0, 40) + "…" : s;
  };

  // Table category colors
  const getTableCategory = (name: string) => {
    if (name.startsWith("driver") || name === "drivers" || name === "vehicles") return { color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: "🚗" };
    if (name.startsWith("delivery") || name === "stores" || name.startsWith("store")) return { color: "bg-orange-500/10 text-orange-400 border-orange-500/20", icon: "📦" };
    if (name.startsWith("call") || name.startsWith("agent") || name === "tickets" || name === "complaints") return { color: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: "📞" };
    if (name.startsWith("assistant") || name.startsWith("chat")) return { color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", icon: "🤖" };
    if (name.startsWith("community") || name === "ratings" || name === "referrals") return { color: "bg-pink-500/10 text-pink-400 border-pink-500/20", icon: "👥" };
    if (name === "profiles" || name.startsWith("user") || name === "wallet") return { color: "bg-green-500/10 text-green-400 border-green-500/20", icon: "👤" };
    if (name === "trips" || name === "zones") return { color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", icon: "🗺️" };
    if (name.startsWith("system") || name.startsWith("db_") || name.startsWith("api_") || name.startsWith("site_")) return { color: "bg-gray-500/10 text-gray-400 border-gray-500/20", icon: "⚙️" };
    return { color: "bg-primary/10 text-primary border-primary/20", icon: "📋" };
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
            <DatabaseZap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">إدارة قاعدة البيانات</h1>
            <p className="text-xs text-muted-foreground">إدارة الجداول والسجلات والنسخ الاحتياطية</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mr-auto">
          <Badge variant="outline" className="gap-1.5 border-green-500/30 text-green-400">
            <span className={`w-2 h-2 rounded-full ${dbConnected ? "bg-green-500 animate-pulse" : dbConnected === false ? "bg-red-500" : "bg-yellow-500"}`} />
            {dbConnected ? "متصل" : dbConnected === false ? "غير متصل" : "جاري الاتصال..."}
          </Badge>
          <Badge variant="secondary" className="gap-1 font-mono text-xs">
            {tables.length} جدول
          </Badge>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Table2} label="الجداول" value={tables.length} sub="في قاعدة البيانات" />
        <StatCard icon={Rows3} label="السجلات الحالية" value={total.toLocaleString()} sub={selectedTable ? `في ${selectedTable}` : "اختر جدولاً"} />
        <StatCard icon={BarChart3} label="الأعمدة" value={columns.length} sub={selectedTable || "—"} />
        <StatCard icon={Shield} label="الحماية" value="RLS" sub="سياسات الأمان مفعلة" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Tables Sidebar */}
        <div className="lg:col-span-3 space-y-3">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={tableSearch}
                  onChange={e => setTableSearch(e.target.value)}
                  placeholder="بحث في الجداول..."
                  className="h-9 pr-9 text-sm bg-secondary/30 border-0"
                />
              </div>
            </div>
            <ScrollArea className="h-[60vh]">
              <div className="p-2 space-y-0.5">
                {tablesLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : filteredTables.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">لا توجد نتائج</p>
                ) : filteredTables.map(t => {
                  const cat = getTableCategory(t);
                  return (
                    <button
                      key={t}
                      onClick={() => { setSelectedTable(t); setPage(1); setSearch(""); setSelectedRecord(null); setActiveTab("data"); }}
                      className={`w-full text-right rounded-xl px-3 py-2.5 text-sm transition-all flex items-center gap-2.5 group ${
                        selectedTable === t
                          ? "bg-primary/10 text-primary border border-primary/30 shadow-sm shadow-primary/5"
                          : "hover:bg-secondary/60 text-foreground border border-transparent"
                      }`}
                    >
                      <span className="text-base">{cat.icon}</span>
                      <span className="font-mono text-xs truncate flex-1">{t}</span>
                      <ChevronLeft className={`w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ${selectedTable === t ? "opacity-100 text-primary" : ""}`} />
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="p-3 border-t border-border text-center">
              <span className="text-xs text-muted-foreground">{filteredTables.length} من {tables.length} جدول</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9">
          {/* Tab Navigation */}
          <div className="flex gap-1.5 mb-4 bg-secondary/30 rounded-xl p-1 flex-wrap">
            <Button
              size="sm"
              variant={activeTab === "server" ? "default" : "ghost"}
              onClick={() => setActiveTab("server")}
              className="gap-1.5"
            >
              <Server className="w-3.5 h-3.5" /> السيرفر
            </Button>
            {selectedTable && (
              <>
                <Button size="sm" variant={activeTab === "data" ? "default" : "ghost"} onClick={() => setActiveTab("data")} className="gap-1.5">
                  <Table2 className="w-3.5 h-3.5" /> البيانات
                </Button>
                <Button size="sm" variant={activeTab === "columns" ? "default" : "ghost"} onClick={() => setActiveTab("columns")} className="gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> الأعمدة
                </Button>
                <Button size="sm" variant={activeTab === "audit" ? "default" : "ghost"} onClick={() => setActiveTab("audit")} className="gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> سجل العمليات
                </Button>
              </>
            )}
            {selectedTable && (
              <div className="flex items-center gap-2 mr-auto">
                <Badge variant="outline" className="font-mono text-xs gap-1">
                  <span className="text-base">{getTableCategory(selectedTable).icon}</span>
                  {selectedTable}
                </Badge>
                <Badge variant="secondary" className="font-mono text-xs">{total.toLocaleString()} سجل</Badge>
              </div>
            )}
          </div>

          {/* Server Tab */}
          {activeTab === "server" && (
            <ServerBackupPanel
              loading={serverLoading}
              status={serverStatus}
              backups={serverBackups}
              repairs={serverRepairs}
              snapshots={serverSnapshots}
              onRefresh={loadServerStatus}
            />
          )}

          {/* No Table Selected */}
          {activeTab !== "server" && !selectedTable && (
            <div className="rounded-2xl border border-border bg-card p-16 text-center">
              <div className="w-20 h-20 rounded-3xl bg-primary/5 border border-primary/10 flex items-center justify-center mx-auto mb-5">
                <Database className="w-10 h-10 text-primary/40" />
              </div>
              <p className="text-lg text-muted-foreground mb-2">اختر جدولاً من القائمة</p>
              <p className="text-sm text-muted-foreground/60">لعرض وإدارة البيانات</p>
            </div>
          )}

          {/* Table Content */}
          {activeTab !== "server" && selectedTable && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {/* DATA TAB */}
              <TabsContent value="data" className="space-y-3 mt-0">
                {/* Toolbar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                    <Select value={searchColumn} onValueChange={setSearchColumn}>
                      <SelectTrigger className="w-36 h-9 text-xs bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map(c => (
                          <SelectItem key={c.column_name} value={c.column_name}>{c.column_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="relative flex-1">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder="بحث في السجلات..."
                        className="h-9 pr-9 text-sm bg-card"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="outline" onClick={loadRecords} className="h-9 w-9 p-0">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>تحديث</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="outline" onClick={exportCSV} className="h-9 w-9 p-0">
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>تصدير CSV</TooltipContent>
                    </Tooltip>
                    <Button size="sm" onClick={() => { setShowNew(true); setNewData({}); }} className="gap-1.5 h-9">
                      <Plus className="w-3.5 h-3.5" /> إضافة سجل
                    </Button>
                  </div>
                </div>

                {/* Records Table */}
                <div className="rounded-2xl border border-border overflow-hidden bg-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-secondary/30">
                          {visibleColumns.map(col => (
                            <th
                              key={col.column_name}
                              className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                              onClick={() => handleSort(col.column_name)}
                            >
                              <span className="flex items-center gap-1.5">
                                <span className="font-mono">{col.column_name}</span>
                                {sortColumn === col.column_name ? (
                                  sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 opacity-30" />
                                )}
                              </span>
                            </th>
                          ))}
                          <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wider text-muted-foreground w-28">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {loading ? (
                          <tr><td colSpan={visibleColumns.length + 1} className="py-16 text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                          </td></tr>
                        ) : records.length === 0 ? (
                          <tr><td colSpan={visibleColumns.length + 1} className="py-16 text-center text-muted-foreground">
                            <Rows3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            لا توجد سجلات
                          </td></tr>
                        ) : records.map((rec, i) => (
                          <tr key={rec.id || i} className="hover:bg-secondary/20 transition-colors group">
                            {visibleColumns.map(col => (
                              <td key={col.column_name} className="px-4 py-2.5 text-foreground max-w-[200px] truncate text-xs">
                                {formatCellValue(rec[col.column_name])}
                              </td>
                            ))}
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button onClick={() => { setSelectedRecord(rec); setEditData({ ...rec }); setEditMode(false); }} className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors">
                                      <Eye className="w-3.5 h-3.5 text-primary" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>عرض</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button onClick={() => { setSelectedRecord(rec); setEditData({ ...rec }); setEditMode(true); }} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                                      <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>تعديل</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button onClick={() => setDeleteTarget(rec)} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors">
                                      <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>حذف</TooltipContent>
                                </Tooltip>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      صفحة <span className="font-mono text-foreground">{page}</span> من <span className="font-mono text-foreground">{totalPages}</span> ({total.toLocaleString()} سجل)
                    </span>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-8 w-8 p-0">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const p = page <= 3 ? i + 1 : page + i - 2;
                        if (p < 1 || p > totalPages) return null;
                        return (
                          <Button key={p} size="sm" variant={p === page ? "default" : "outline"} onClick={() => setPage(p)} className="h-8 w-8 p-0 text-xs">
                            {p}
                          </Button>
                        );
                      })}
                      <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-8 w-8 p-0">
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* COLUMNS TAB */}
              <TabsContent value="columns" className="mt-0">
                <div className="rounded-2xl border border-border overflow-hidden bg-card">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wider text-muted-foreground">اسم العمود</th>
                        <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wider text-muted-foreground">النوع</th>
                        <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wider text-muted-foreground">قابل للفراغ</th>
                        <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wider text-muted-foreground">القيمة الافتراضية</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {columns.map(col => (
                        <tr key={col.column_name} className="hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-foreground font-medium">{col.column_name}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-[11px] font-mono bg-secondary/30">{col.data_type}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            {col.is_nullable === "YES" ? (
                              <span className="text-xs text-muted-foreground">نعم</span>
                            ) : (
                              <span className="text-xs text-primary font-medium">مطلوب</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[11px] text-muted-foreground font-mono max-w-[200px] truncate">{col.column_default || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* AUDIT LOG TAB */}
              <TabsContent value="audit" className="space-y-3 mt-0">
                <div className="rounded-2xl border border-border overflow-hidden bg-card">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wider text-muted-foreground">العملية</th>
                        <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wider text-muted-foreground">معرّف السجل</th>
                        <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wider text-muted-foreground">التاريخ</th>
                        <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wider text-muted-foreground">المستخدم</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {auditLogs.length === 0 ? (
                        <tr><td colSpan={4} className="py-12 text-center text-muted-foreground">
                          <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          لا توجد عمليات مسجلة
                        </td></tr>
                      ) : auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3">
                            <Badge variant={log.action === "DELETE" ? "destructive" : log.action === "INSERT" ? "default" : "secondary"} className="text-xs">
                              {log.action}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.record_id?.slice(0, 8) || "—"}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground" dir="ltr">{new Date(log.created_at).toLocaleString("ar")}</td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.user_id?.slice(0, 8)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Record Detail/Edit Panel */}
      <Dialog open={!!selectedRecord} onOpenChange={open => { if (!open) { setSelectedRecord(null); setEditMode(false); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editMode ? <Edit3 className="w-5 h-5 text-primary" /> : <Eye className="w-5 h-5 text-primary" />}
              {editMode ? "تعديل السجل" : "تفاصيل السجل"}
              {selectedRecord?.id && (
                <Badge variant="outline" className="font-mono text-[10px] mr-2">{String(selectedRecord.id).slice(0, 12)}…</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-3">
              {columns.map(col => (
                <div key={col.column_name} className="space-y-1.5">
                  <Label className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                    {col.column_name}
                    <span className="text-[10px] bg-secondary/50 rounded px-1.5 py-0.5">{col.data_type}</span>
                  </Label>
                  {editMode && col.column_name !== "id" && col.column_name !== "created_at" ? (
                    col.data_type === "jsonb" || col.data_type === "json" ? (
                      <Textarea
                        value={typeof editData[col.column_name] === "object" ? JSON.stringify(editData[col.column_name], null, 2) : editData[col.column_name] || ""}
                        onChange={e => {
                          try { setEditData(d => ({ ...d, [col.column_name]: JSON.parse(e.target.value) })); }
                          catch { setEditData(d => ({ ...d, [col.column_name]: e.target.value })); }
                        }}
                        className="text-xs font-mono min-h-[60px]"
                        dir="ltr"
                      />
                    ) : col.data_type === "boolean" ? (
                      <Select
                        value={String(editData[col.column_name] ?? "")}
                        onValueChange={v => setEditData(d => ({ ...d, [col.column_name]: v === "true" }))}
                      >
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">true</SelectItem>
                          <SelectItem value="false">false</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={editData[col.column_name] ?? ""}
                        onChange={e => setEditData(d => ({ ...d, [col.column_name]: e.target.value }))}
                        className="text-sm"
                        dir="auto"
                      />
                    )
                  ) : (
                    <div className="group relative text-sm text-foreground bg-secondary/20 rounded-xl px-3 py-2.5 font-mono break-all text-xs border border-transparent hover:border-border transition-colors">
                      {selectedRecord[col.column_name] === null ? <span className="text-muted-foreground/50 italic">null</span>
                        : typeof selectedRecord[col.column_name] === "object"
                          ? JSON.stringify(selectedRecord[col.column_name], null, 2)
                          : String(selectedRecord[col.column_name])}
                      <button
                        onClick={() => copyValue(selectedRecord[col.column_name])}
                        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-secondary rounded"
                      >
                        <Copy className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <DialogFooter className="gap-2">
            {editMode ? (
              <>
                <Button variant="outline" onClick={() => setEditMode(false)}><X className="w-4 h-4 ml-1" /> إلغاء</Button>
                <Button onClick={handleUpdate}><Save className="w-4 h-4 ml-1" /> حفظ التغييرات</Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => { setEditData({ ...selectedRecord }); setEditMode(true); }}>
                <Edit3 className="w-4 h-4 ml-1" /> تعديل
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Record Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> إضافة سجل جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {columns.filter(c => c.column_name !== "id" && !c.column_default?.includes("gen_random_uuid") && !c.column_default?.includes("now()")).map(col => (
              <div key={col.column_name} className="space-y-1.5">
                <Label className="text-xs font-mono flex items-center gap-2">
                  {col.column_name}
                  {col.is_nullable === "NO" && !col.column_default && <span className="text-destructive text-[10px]">مطلوب</span>}
                  <span className="text-[10px] text-muted-foreground bg-secondary/50 rounded px-1.5 py-0.5">{col.data_type}</span>
                </Label>
                {col.data_type === "boolean" ? (
                  <Select value={String(newData[col.column_name] ?? "")} onValueChange={v => setNewData(d => ({ ...d, [col.column_name]: v === "true" }))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">true</SelectItem>
                      <SelectItem value="false">false</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={newData[col.column_name] ?? ""}
                    onChange={e => setNewData(d => ({ ...d, [col.column_name]: e.target.value }))}
                    className="text-sm"
                    dir="auto"
                    placeholder={col.column_default || ""}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>إلغاء</Button>
            <Button onClick={handleInsert}><Plus className="w-4 h-4 ml-1" /> إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" /> تأكيد الحذف
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا السجل؟ هذا الإجراء لا يمكن التراجع عنه.
              {deleteTarget?.id && <span className="block font-mono text-xs mt-2 bg-secondary/30 rounded-lg px-3 py-1.5">ID: {deleteTarget.id}</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default DatabaseManager;
