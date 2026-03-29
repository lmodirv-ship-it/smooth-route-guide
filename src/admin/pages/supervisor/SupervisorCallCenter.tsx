import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Headphones, Loader2, Search, Clock, AlertCircle, CheckCircle, XCircle, PhoneIncoming, RefreshCw, BarChart3 } from "lucide-react";
import AgentStaffPanel from "@/admin/components/AgentStaffPanel";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface CallRecord {
  id: string;
  request: string;
  status: string;
  createdAt: string;
  userName: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  open: { label: "مفتوح", icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20" },
  in_progress: { label: "قيد المعالجة", icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
  resolved: { label: "تم الحل", icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
  closed: { label: "مغلق", icon: XCircle, color: "text-muted-foreground", bg: "bg-muted/50 border-border" },
};

const SupervisorCallCenter = () => {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const fetchCalls = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    const { data } = await supabase
      .from("call_center")
      .select("id, request, status, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(200);

    if (!data) { setLoading(false); setRefreshing(false); return; }

    const userIds = [...new Set(data.map(c => c.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", userIds);
    const profileMap = new Map((profiles || []).map(p => [p.id, p.name || "—"]));

    setCalls(data.map(c => ({
      id: c.id,
      request: c.request || "—",
      status: c.status,
      createdAt: c.created_at,
      userName: profileMap.get(c.user_id) || "—",
    })));
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchCalls(); }, []);

  const stats = useMemo(() => ({
    total: calls.length,
    open: calls.filter(c => c.status === "open").length,
    inProgress: calls.filter(c => c.status === "in_progress").length,
    resolved: calls.filter(c => c.status === "resolved" || c.status === "closed").length,
  }), [calls]);

  const filtered = useMemo(() => {
    return calls.filter(c => {
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (search && !c.userName.includes(search) && !c.request.includes(search)) return false;
      return true;
    });
  }, [calls, filterStatus, search]);

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 60) return `${mins} دقيقة`;
    if (mins < 1440) return `${Math.floor(mins / 60)} ساعة`;
    return `${Math.floor(mins / 1440)} يوم`;
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5" dir="rtl">
      {/* Agent Staff Panel */}
      <AgentStaffPanel />
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Headphones className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">مراقبة مركز الاتصال</h2>
            <p className="text-xs text-muted-foreground">عرض وتتبع جميع طلبات مركز الاتصال</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchCalls(true)} disabled={refreshing} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "إجمالي الطلبات", value: stats.total, icon: BarChart3, color: "text-primary", bg: "bg-primary/10" },
          { label: "مفتوحة", value: stats.open, icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-500/10" },
          { label: "قيد المعالجة", value: stats.inProgress, icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "تم حلها", value: stats.resolved, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        ].map(s => (
          <Card key={s.label} className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو الطلب..." className="pr-10" />
        </div>
        <Tabs value={filterStatus} onValueChange={setFilterStatus}>
          <TabsList className="h-10">
            <TabsTrigger value="all" className="text-xs">الكل</TabsTrigger>
            <TabsTrigger value="open" className="text-xs">مفتوح</TabsTrigger>
            <TabsTrigger value="in_progress" className="text-xs">قيد المعالجة</TabsTrigger>
            <TabsTrigger value="resolved" className="text-xs">محلول</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden glass-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-right font-semibold">العميل</TableHead>
              <TableHead className="text-right font-semibold">الطلب</TableHead>
              <TableHead className="text-center font-semibold">الحالة</TableHead>
              <TableHead className="text-center font-semibold">الوقت</TableHead>
              <TableHead className="text-center font-semibold">منذ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <PhoneIncoming className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">لا توجد طلبات مطابقة</p>
                </TableCell>
              </TableRow>
            ) : filtered.map(c => {
              const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.open;
              const StatusIcon = cfg.icon;
              return (
                <TableRow key={c.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="font-medium text-right">{c.userName}</TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm max-w-xs truncate">{c.request}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`gap-1 text-[10px] ${cfg.bg} ${cfg.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground text-xs">
                    {new Date(c.createdAt).toLocaleDateString("ar-MA", { day: "numeric", month: "short" })}
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground/70">{timeAgo(c.createdAt)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
};

export default SupervisorCallCenter;
