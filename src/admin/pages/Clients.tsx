import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Search, Eye, Wallet, Filter, SortAsc, SortDesc,
  Download, ChevronLeft, ChevronRight, UserCheck, RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import ClientDetailSheet from "@/admin/components/ClientDetailSheet";
import BalanceBars from "@/admin/components/BalanceBars";

const ROLE_LABELS: Record<string, string> = {
  user: "عميل", admin: "مسؤول", moderator: "مشرف", agent: "مركز اتصال",
  driver: "سائق ركاب", delivery: "سائق توصيل", store_owner: "صاحب محل",
};

const ROLE_COLORS: Record<string, string> = {
  user: "bg-secondary text-secondary-foreground",
  admin: "bg-primary/15 text-primary border-primary/30",
  moderator: "bg-info/15 text-info border-info/30",
  agent: "bg-warning/15 text-warning border-warning/30",
  driver: "bg-success/15 text-success border-success/30",
  delivery: "bg-accent/15 text-accent-foreground border-accent/30",
  store_owner: "bg-destructive/15 text-destructive border-destructive/30",
};

const ALL_ROLES = Object.keys(ROLE_LABELS);
const PAGE_SIZE = 20;

type SortField = "name" | "created_at" | "walletBalance" | "tripCount";
type SortDir = "asc" | "desc";

interface Client {
  id: string; name: string; email: string | null; phone: string | null;
  created_at: string; tripCount: number; walletBalance: number; user_code: string | null;
  roles: string[];
  pendingRechargeCount: number;
  pendingRechargeTotal: number;
}

const AdminClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [balanceFilter, setBalanceFilter] = useState<string>("all");
  const [rechargeFilter, setRechargeFilter] = useState(false);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (!profiles) { setLoading(false); return; }
    const ids = profiles.map(p => p.id);
    const [tripsRes, walletsRes, rolesRes, rechargeRes] = await Promise.all([
      supabase.from("trips").select("user_id").in("user_id", ids),
      supabase.from("wallet").select("user_id, balance").in("user_id", ids),
      supabase.from("user_roles").select("user_id, role").in("user_id", ids),
      supabase.from("wallet_recharge_requests").select("user_id, amount, status").eq("status", "pending").in("user_id", ids),
    ]);
    const tripCountMap = new Map<string, number>();
    tripsRes.data?.forEach(t => tripCountMap.set(t.user_id, (tripCountMap.get(t.user_id) || 0) + 1));
    const walletMap = new Map(walletsRes.data?.map(w => [w.user_id, w.balance]) || []);
    const rolesMap = new Map<string, string[]>();
    rolesRes.data?.forEach(r => {
      if (!rolesMap.has(r.user_id)) rolesMap.set(r.user_id, []);
      rolesMap.get(r.user_id)!.push(r.role);
    });
    const rechargeCountMap = new Map<string, number>();
    const rechargeTotalMap = new Map<string, number>();
    rechargeRes.data?.forEach(r => {
      rechargeCountMap.set(r.user_id, (rechargeCountMap.get(r.user_id) || 0) + 1);
      rechargeTotalMap.set(r.user_id, (rechargeTotalMap.get(r.user_id) || 0) + (r.amount || 0));
    });

    setClients(profiles.map(p => ({
      id: p.id, name: p.name || "", email: p.email, phone: p.phone, created_at: p.created_at,
      user_code: p.user_code,
      tripCount: tripCountMap.get(p.id) || 0,
      walletBalance: walletMap.get(p.id) || 0,
      roles: rolesMap.get(p.id) || ["user"],
      pendingRechargeCount: rechargeCountMap.get(p.id) || 0,
      pendingRechargeTotal: rechargeTotalMap.get(p.id) || 0,
    })));
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  // Filtering + sorting
  const processed = useMemo(() => {
    let list = [...clients];

    // Text search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q) || c.user_code?.toLowerCase().includes(q)
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      list = list.filter(c => c.roles.includes(roleFilter));
    }

    // Balance filter
    if (balanceFilter === "high") list = list.filter(c => c.walletBalance >= 50);
    else if (balanceFilter === "medium") list = list.filter(c => c.walletBalance >= 10 && c.walletBalance < 50);
    else if (balanceFilter === "low") list = list.filter(c => c.walletBalance < 10);

    // Recharge requests only
    if (rechargeFilter) list = list.filter(c => c.pendingRechargeCount > 0);

    // Sort
    list.sort((a, b) => {
      let va: any, vb: any;
      switch (sortField) {
        case "name": va = a.name?.toLowerCase() || ""; vb = b.name?.toLowerCase() || ""; break;
        case "walletBalance": va = a.walletBalance; vb = b.walletBalance; break;
        case "tripCount": va = a.tripCount; vb = b.tripCount; break;
        default: va = a.created_at; vb = b.created_at;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [clients, search, roleFilter, balanceFilter, rechargeFilter, sortField, sortDir]);

  const totalPages = Math.ceil(processed.length / PAGE_SIZE);
  const paginated = processed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => { setPage(0); }, [search, roleFilter, balanceFilter, rechargeFilter]);

  const openDetail = (clientId: string) => {
    setSelectedClientId(clientId);
    setSheetOpen(true);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc"
      ? <SortAsc className="w-3 h-3 text-primary inline ml-1" />
      : <SortDesc className="w-3 h-3 text-primary inline ml-1" />;
  };

  // Stats
  const totalRechargeRequests = clients.reduce((s, c) => s + c.pendingRechargeCount, 0);

  return (
    <div className="space-y-5">
      {/* Header + Stats */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">إدارة العملاء</h1>
          <Users className="w-6 h-6 text-primary" />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={fetchClients} className="gap-1.5 h-8 text-xs">
            <RefreshCw className="w-3.5 h-3.5" />تحديث
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{clients.length}</p>
            <p className="text-[11px] text-muted-foreground">إجمالي العملاء</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-success/15 flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{clients.filter(c => c.walletBalance >= 50).length}</p>
            <p className="text-[11px] text-muted-foreground">رصيد كامل</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-destructive/15 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{clients.filter(c => c.walletBalance < 10).length}</p>
            <p className="text-[11px] text-muted-foreground">رصيد منخفض</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-warning/15 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{totalRechargeRequests}</p>
            <p className="text-[11px] text-muted-foreground">طلبات تعبئة</p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-card rounded-xl p-3 flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />

        {/* Search */}
        <div className="relative w-52">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="بحث..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-secondary/60 border-border h-8 rounded-lg pr-9 text-xs"
          />
        </div>

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="h-8 rounded-lg border border-border bg-secondary/60 text-xs text-foreground px-3 outline-none cursor-pointer"
        >
          <option value="all">كل الأدوار</option>
          {ALL_ROLES.map(r => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>

        {/* Balance Filter */}
        <select
          value={balanceFilter}
          onChange={e => setBalanceFilter(e.target.value)}
          className="h-8 rounded-lg border border-border bg-secondary/60 text-xs text-foreground px-3 outline-none cursor-pointer"
        >
          <option value="all">كل الأرصدة</option>
          <option value="high">رصيد كامل (≥50)</option>
          <option value="medium">رصيد متوسط (10-49)</option>
          <option value="low">رصيد منخفض (&lt;10)</option>
        </select>

        {/* Recharge Requests Toggle */}
        <button
          onClick={() => setRechargeFilter(f => !f)}
          className={`h-8 px-3 rounded-lg border text-xs font-medium transition-colors ${
            rechargeFilter
              ? "bg-success/15 border-success/40 text-success"
              : "bg-secondary/60 border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Wallet className="w-3 h-3 inline ml-1" />
          طلبات التعبئة فقط
        </button>

        {/* Results count */}
        <span className="text-[11px] text-muted-foreground mr-auto">
          {processed.length} نتيجة
        </span>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">جاري التحميل...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-right bg-secondary/30">
                  <th className="p-3 text-muted-foreground font-medium text-xs">إجراءات</th>
                  <th className="p-3 text-muted-foreground font-medium text-xs">طلبات التعبئة</th>
                  <th className="p-3 text-muted-foreground font-medium text-xs cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort("walletBalance")}>
                    التعبئة <SortIcon field="walletBalance" />
                  </th>
                  <th className="p-3 text-muted-foreground font-medium text-xs cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort("tripCount")}>
                    الرحلات <SortIcon field="tripCount" />
                  </th>
                  <th className="p-3 text-muted-foreground font-medium text-xs">الدور</th>
                  <th className="p-3 text-muted-foreground font-medium text-xs">الهاتف</th>
                  <th className="p-3 text-muted-foreground font-medium text-xs">البريد</th>
                  <th className="p-3 text-muted-foreground font-medium text-xs cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort("name")}>
                    الاسم <SortIcon field="name" />
                  </th>
                  <th className="p-3 text-muted-foreground font-medium text-xs text-center">الرمز</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 && (
                  <tr><td colSpan={9} className="p-10 text-center text-muted-foreground">لا توجد نتائج</td></tr>
                )}
                <AnimatePresence mode="popLayout">
                  {paginated.map((client, i) => (
                    <motion.tr
                      key={client.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-border/40 hover:bg-secondary/20 transition-colors group"
                    >
                      <td className="p-3">
                        <Button size="sm" variant="outline" onClick={() => openDetail(client.id)}
                          className="text-xs h-7 gap-1 text-info border-info/30 opacity-70 group-hover:opacity-100 transition-opacity">
                          <Eye className="w-3 h-3" />عرض
                        </Button>
                      </td>
                      <td className="p-3">
                        {client.pendingRechargeCount > 0 ? (
                          <button
                            onClick={() => openDetail(client.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success/15 border border-success/40 text-success text-[10px] font-bold hover:bg-success/25 transition-colors"
                          >
                            <Wallet className="w-3 h-3" />
                            {client.pendingRechargeCount} ({client.pendingRechargeTotal} DH)
                          </button>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <BalanceBars balance={client.walletBalance} />
                      </td>
                      <td className="p-3">
                        <span className={`font-mono text-xs font-bold ${client.tripCount > 0 ? "text-foreground" : "text-muted-foreground/40"}`}>
                          {client.tripCount}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {client.roles.map(r => (
                            <Badge key={r} variant="outline" className={`text-[9px] px-1.5 py-0 border ${ROLE_COLORS[r] || ""}`}>
                              {ROLE_LABELS[r] || r}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs font-mono" dir="ltr">{client.phone || "—"}</td>
                      <td className="p-3 text-muted-foreground text-xs truncate max-w-[140px]">{client.email || "—"}</td>
                      <td className="p-3 text-foreground font-medium text-xs">{client.name || "—"}</td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="font-mono text-[10px] font-bold">{client.user_code || "—"}</Badge>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/10">
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-7 w-7 p-0">
                <ChevronRight className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                return (
                  <Button
                    key={pageNum}
                    size="sm"
                    variant={page === pageNum ? "default" : "ghost"}
                    onClick={() => setPage(pageNum)}
                    className="h-7 w-7 p-0 text-xs"
                  >
                    {pageNum + 1}
                  </Button>
                );
              })}
              <Button size="sm" variant="ghost" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="h-7 w-7 p-0">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
            <span className="text-[11px] text-muted-foreground">
              صفحة {page + 1} من {totalPages}
            </span>
          </div>
        )}
      </div>

      <ClientDetailSheet
        clientId={selectedClientId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onClientUpdated={fetchClients}
      />
    </div>
  );
};

export default AdminClients;
