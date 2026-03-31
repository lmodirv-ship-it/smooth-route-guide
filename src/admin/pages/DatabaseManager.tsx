import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Database, Table2, Search, Plus, Trash2, Edit3, Save, X, RefreshCw,
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Download,
  Loader2, Shield, Clock, FileText, AlertTriangle, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const DatabaseManager = () => {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [searchColumn, setSearchColumn] = useState("");
  const [sortColumn, setSortColumn] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(false);
  const [tablesLoading, setTablesLoading] = useState(true);

  // Detail/edit panel
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});

  // New record dialog
  const [showNew, setShowNew] = useState(false);
  const [newData, setNewData] = useState<Record<string, any>>({});

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  // Audit log
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);

  const [activeTab, setActiveTab] = useState("data");

  // Load tables
  useEffect(() => {
    setTablesLoading(true);
    dbApi("list_tables")
      .then(d => setTables(d.tables || []))
      .catch(e => toast({ title: "خطأ", description: e.message, variant: "destructive" }))
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

  // Load audit log
  const loadAudit = useCallback(async () => {
    if (!selectedTable) return;
    try {
      const d = await dbApi("audit_log", { table: selectedTable, page: auditPage, pageSize: 25 });
      setAuditLogs(d.logs || []);
      setAuditTotal(d.total || 0);
    } catch {}
  }, [selectedTable, auditPage]);

  useEffect(() => { if (activeTab === "audit") loadAudit(); }, [activeTab, loadAudit]);

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

  const totalPages = Math.ceil(total / pageSize);
  const visibleColumns = columns.filter(c => !["created_at", "updated_at"].includes(c.column_name)).slice(0, 6);

  const formatCellValue = (val: any) => {
    if (val === null || val === undefined) return <span className="text-muted-foreground italic">null</span>;
    if (typeof val === "boolean") return <Badge variant={val ? "default" : "secondary"}>{val ? "true" : "false"}</Badge>;
    if (typeof val === "object") return <span className="text-xs font-mono">{JSON.stringify(val).slice(0, 50)}...</span>;
    const s = String(val);
    return s.length > 40 ? s.slice(0, 40) + "…" : s;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Database className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">إدارة قاعدة البيانات</h1>
        <Badge variant="secondary" className="gap-1">
          <Shield className="w-3 h-3" /> آمن
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Tables List */}
        <div className="lg:col-span-2 space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <Table2 className="w-4 h-4" /> الجداول
          </h2>
          {tablesLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-1 max-h-[70vh] overflow-auto">
              {tables.map(t => (
                <button
                  key={t}
                  onClick={() => { setSelectedTable(t); setPage(1); setSearch(""); setSelectedRecord(null); setActiveTab("data"); }}
                  className={`w-full text-right rounded-lg px-3 py-2 text-sm transition-all ${
                    selectedTable === t ? "bg-primary/10 text-primary border border-primary/30" : "hover:bg-secondary text-foreground border border-transparent"
                  }`}
                >
                  <span className="font-mono text-xs">{t}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-10">
          {!selectedTable ? (
            <div className="rounded-xl border border-border glass-strong p-16 text-center">
              <Database className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">اختر جدولاً من القائمة</p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <TabsList>
                  <TabsTrigger value="data" className="gap-1.5"><Table2 className="w-3.5 h-3.5" /> البيانات</TabsTrigger>
                  <TabsTrigger value="columns" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> الأعمدة</TabsTrigger>
                  <TabsTrigger value="audit" className="gap-1.5"><Clock className="w-3.5 h-3.5" /> سجل العمليات</TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">{selectedTable}</Badge>
                  <Badge variant="secondary">{total} سجل</Badge>
                </div>
              </div>

              {/* DATA TAB */}
              <TabsContent value="data" className="space-y-3">
                {/* Toolbar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                    <Select value={searchColumn} onValueChange={setSearchColumn}>
                      <SelectTrigger className="w-32 h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map(c => (
                          <SelectItem key={c.column_name} value={c.column_name}>{c.column_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="relative flex-1">
                      <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder="بحث..."
                        className="h-9 pr-8 text-sm"
                      />
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={loadRecords} className="gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" /> تحديث
                  </Button>
                  <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5">
                    <Download className="w-3.5 h-3.5" /> تصدير CSV
                  </Button>
                  <Button size="sm" onClick={() => { setShowNew(true); setNewData({}); }} className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> إضافة
                  </Button>
                </div>

                {/* Records Table */}
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-secondary/50">
                        <tr>
                          {visibleColumns.map(col => (
                            <th
                              key={col.column_name}
                              className="px-3 py-2.5 text-right font-semibold text-foreground cursor-pointer hover:bg-secondary transition-colors whitespace-nowrap"
                              onClick={() => handleSort(col.column_name)}
                            >
                              <span className="flex items-center gap-1">
                                <span className="font-mono text-xs">{col.column_name}</span>
                                {sortColumn === col.column_name ? (
                                  sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                                )}
                              </span>
                            </th>
                          ))}
                          <th className="px-3 py-2.5 text-right font-semibold text-foreground w-24">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {loading ? (
                          <tr><td colSpan={visibleColumns.length + 1} className="py-12 text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                          </td></tr>
                        ) : records.length === 0 ? (
                          <tr><td colSpan={visibleColumns.length + 1} className="py-12 text-center text-muted-foreground">لا توجد سجلات</td></tr>
                        ) : records.map((rec, i) => (
                          <tr key={rec.id || i} className="hover:bg-secondary/30 transition-colors">
                            {visibleColumns.map(col => (
                              <td key={col.column_name} className="px-3 py-2 text-foreground max-w-[200px] truncate">
                                {formatCellValue(rec[col.column_name])}
                              </td>
                            ))}
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                <button onClick={() => { setSelectedRecord(rec); setEditData({ ...rec }); setEditMode(false); }} className="p-1.5 hover:bg-secondary rounded-lg transition-colors" title="عرض">
                                  <Eye className="w-3.5 h-3.5 text-primary" />
                                </button>
                                <button onClick={() => { setSelectedRecord(rec); setEditData({ ...rec }); setEditMode(true); }} className="p-1.5 hover:bg-secondary rounded-lg transition-colors" title="تعديل">
                                  <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                                <button onClick={() => setDeleteTarget(rec)} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors" title="حذف">
                                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                </button>
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
                      صفحة {page} من {totalPages} ({total} سجل)
                    </span>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const p = page <= 3 ? i + 1 : page + i - 2;
                        if (p < 1 || p > totalPages) return null;
                        return (
                          <Button key={p} size="sm" variant={p === page ? "default" : "outline"} onClick={() => setPage(p)} className="w-9">
                            {p}
                          </Button>
                        );
                      })}
                      <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* COLUMNS TAB */}
              <TabsContent value="columns">
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50">
                      <tr>
                        <th className="px-4 py-2.5 text-right font-semibold">اسم العمود</th>
                        <th className="px-4 py-2.5 text-right font-semibold">النوع</th>
                        <th className="px-4 py-2.5 text-right font-semibold">قابل للفراغ</th>
                        <th className="px-4 py-2.5 text-right font-semibold">القيمة الافتراضية</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {columns.map(col => (
                        <tr key={col.column_name} className="hover:bg-secondary/30">
                          <td className="px-4 py-2 font-mono text-xs text-foreground">{col.column_name}</td>
                          <td className="px-4 py-2"><Badge variant="outline" className="text-xs font-mono">{col.data_type}</Badge></td>
                          <td className="px-4 py-2">{col.is_nullable === "YES" ? <Badge variant="secondary">نعم</Badge> : <Badge>لا</Badge>}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground font-mono">{col.column_default || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* AUDIT LOG TAB */}
              <TabsContent value="audit" className="space-y-3">
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50">
                      <tr>
                        <th className="px-3 py-2.5 text-right font-semibold">العملية</th>
                        <th className="px-3 py-2.5 text-right font-semibold">معرّف السجل</th>
                        <th className="px-3 py-2.5 text-right font-semibold">التاريخ</th>
                        <th className="px-3 py-2.5 text-right font-semibold">المستخدم</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {auditLogs.length === 0 ? (
                        <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">لا توجد عمليات مسجلة</td></tr>
                      ) : auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-secondary/30">
                          <td className="px-3 py-2">
                            <Badge variant={log.action === "DELETE" ? "destructive" : log.action === "INSERT" ? "default" : "secondary"}>
                              {log.action}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{log.record_id?.slice(0, 8) || "—"}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground" dir="ltr">{new Date(log.created_at).toLocaleString("ar")}</td>
                          <td className="px-3 py-2 font-mono text-xs">{log.user_id?.slice(0, 8)}</td>
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
            </DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-3">
              {columns.map(col => (
                <div key={col.column_name} className="space-y-1">
                  <Label className="text-xs font-mono text-muted-foreground">{col.column_name} <span className="text-[10px]">({col.data_type})</span></Label>
                  {editMode && col.column_name !== "id" && col.column_name !== "created_at" ? (
                    col.data_type === "jsonb" || col.data_type === "json" ? (
                      <Textarea
                        value={typeof editData[col.column_name] === "object" ? JSON.stringify(editData[col.column_name], null, 2) : editData[col.column_name] || ""}
                        onChange={e => {
                          try {
                            setEditData(d => ({ ...d, [col.column_name]: JSON.parse(e.target.value) }));
                          } catch {
                            setEditData(d => ({ ...d, [col.column_name]: e.target.value }));
                          }
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
                    <div className="text-sm text-foreground bg-secondary/30 rounded-lg px-3 py-2 font-mono break-all">
                      {selectedRecord[col.column_name] === null ? <span className="text-muted-foreground italic">null</span>
                        : typeof selectedRecord[col.column_name] === "object"
                          ? JSON.stringify(selectedRecord[col.column_name], null, 2)
                          : String(selectedRecord[col.column_name])}
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
              <div key={col.column_name} className="space-y-1">
                <Label className="text-xs font-mono">
                  {col.column_name}
                  {col.is_nullable === "NO" && !col.column_default && <span className="text-destructive mr-1">*</span>}
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
              {deleteTarget?.id && <span className="block font-mono text-xs mt-1">ID: {deleteTarget.id}</span>}
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
