/**
 * PayPal Live Payments — Admin-only dashboard
 * ─────────────────────────────────────────────
 * SECURITY LAYERS:
 *  1. Route: RequireRole allowed={["admin"]} in AdminRoutes
 *  2. Backend: paypal-live edge function validates JWT + admin role
 *  3. Database: RLS — admins see all, users see own only
 *  4. No secrets in frontend — all sensitive ops via edge function
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle,
  Shield, DollarSign, Search, Calendar, CreditCard,
} from "lucide-react";
import { toast } from "sonner";

/* ── Types ── */
interface PaymentTxn {
  id: string;
  user_id: string;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  paypal_payer_id: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  transaction_type: string;
  provider: string | null;
  reference_type: string | null;
  environment: string | null;
  created_at: string;
  completed_at: string | null;
  metadata: unknown;
}

interface Stats {
  total: number;
  completed: number;
  pending: number;
  failed: number;
  revenue: number;
}

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  completed: { icon: CheckCircle, color: "bg-green-500/15 text-green-500 border-green-500/30", label: "مكتمل" },
  pending:   { icon: Clock,       color: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30", label: "معلق" },
  failed:    { icon: XCircle,     color: "bg-red-500/15 text-red-500 border-red-500/30", label: "فشل" },
  refunded:  { icon: AlertTriangle, color: "bg-orange-500/15 text-orange-500 border-orange-500/30", label: "مسترد" },
};

const PayPalLivePayments = () => {
  const [transactions, setTransactions] = useState<PaymentTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, pending: 0, failed: 0, revenue: 0 });
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "ok" | "error">("checking");
  const [envMode, setEnvMode] = useState<string>("live");

  /* ── Load transactions via secure edge function (admin-validated server-side) ── */
  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("paypal-live", {
        body: {
          action: "list-payments",
          statusFilter,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          limit: 500,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setTransactions(data.transactions || []);
      setStats(data.stats || { total: 0, completed: 0, pending: 0, failed: 0, revenue: 0 });
      setEnvMode(data.environment || "live");
    } catch (err: any) {
      toast.error("خطأ في تحميل المعاملات: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo]);

  /* ── Test PayPal connection (no secrets exposed) ── */
  const testConnection = useCallback(async () => {
    setConnectionStatus("checking");
    try {
      const { data, error } = await supabase.functions.invoke("paypal-live", {
        body: { action: "test-connection" },
      });
      if (error || data?.error) {
        setConnectionStatus("error");
        toast.error("فشل الاتصال بـ PayPal: " + (data?.error || error?.message));
      } else {
        setConnectionStatus("ok");
        setEnvMode(data.environment || "live");
        if (data.mode === "live") {
          toast.success("✅ PayPal Live متصل بنجاح");
        } else {
          toast.warning("⚠️ PayPal في وضع Sandbox");
        }
      }
    } catch {
      setConnectionStatus("error");
    }
  }, []);

  useEffect(() => {
    loadTransactions();
    testConnection();
  }, [loadTransactions, testConnection]);

  /* ── Local search filter ── */
  const filteredTxns = transactions.filter((t) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      t.id?.toLowerCase().includes(s) ||
      t.paypal_order_id?.toLowerCase().includes(s) ||
      t.paypal_capture_id?.toLowerCase().includes(s) ||
      t.user_id?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 p-4" dir="rtl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <CreditCard className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">مدفوعات PayPal</h1>
          {/* LIVE badge */}
          <Badge className={`gap-1 text-xs font-bold px-3 py-1 ${
            envMode === "live"
              ? "bg-red-600 text-white border-red-700 animate-pulse"
              : "bg-yellow-600 text-white border-yellow-700"
          }`}>
            <span className="w-2 h-2 rounded-full bg-white inline-block" />
            {envMode === "live" ? "LIVE" : "SANDBOX"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              connectionStatus === "ok"
                ? "border-green-500 text-green-500"
                : connectionStatus === "error"
                ? "border-red-500 text-red-500"
                : "border-yellow-500 text-yellow-500"
            }
          >
            <Shield className="w-3.5 h-3.5 ml-1" />
            {connectionStatus === "ok" ? "متصل" : connectionStatus === "error" ? "غير متصل" : "جاري الفحص..."}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => { loadTransactions(); testConnection(); }}>
            <RefreshCw className="w-4 h-4 ml-1" />
            تحديث
          </Button>
        </div>
      </div>

      {/* ── Security notice ── */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-600 dark:text-amber-300 flex items-start gap-2">
        <Shield className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div>
          <strong>بيئة {envMode === "live" ? "إنتاج (LIVE)" : "اختبار (SANDBOX)"}</strong> — 
          {envMode === "live" ? " جميع العمليات حقيقية." : " عمليات تجريبية فقط."}{" "}
          المفاتيح السرية محمية في الخادم. لا يتم تخزين بيانات حساسة في المتصفح.
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "إجمالي المعاملات", value: stats.total, icon: CreditCard, color: "text-primary" },
          { label: "مكتملة", value: stats.completed, icon: CheckCircle, color: "text-green-500" },
          { label: "معلقة", value: stats.pending, icon: Clock, color: "text-yellow-500" },
          { label: "فاشلة", value: stats.failed, icon: XCircle, color: "text-red-500" },
          { label: "الإيرادات", value: `${stats.revenue.toFixed(2)} DH`, icon: DollarSign, color: "text-emerald-500" },
        ].map((s, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 text-center">
            <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
            <p className="text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground mb-1 block">بحث</label>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ID، PayPal Order، Capture ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9"
            />
          </div>
        </div>
        <div className="w-[150px]">
          <label className="text-xs text-muted-foreground mb-1 block">الحالة</label>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="completed">مكتمل</SelectItem>
              <SelectItem value="pending">معلق</SelectItem>
              <SelectItem value="failed">فاشل</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">من تاريخ</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">إلى تاريخ</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" />
        </div>
        <Button variant="secondary" size="sm" onClick={loadTransactions}>
          <Calendar className="w-4 h-4 ml-1" />
          تطبيق
        </Button>
      </div>

      {/* ── Transactions table ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-muted-foreground">
                <th className="text-right p-3 font-medium">المعرف</th>
                <th className="text-right p-3 font-medium">المستخدم</th>
                <th className="text-right p-3 font-medium">PayPal Order</th>
                <th className="text-right p-3 font-medium">Capture ID</th>
                <th className="text-right p-3 font-medium">المبلغ</th>
                <th className="text-right p-3 font-medium">العملة</th>
                <th className="text-right p-3 font-medium">الحالة</th>
                <th className="text-right p-3 font-medium">البيئة</th>
                <th className="text-right p-3 font-medium">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {filteredTxns.map((t) => {
                const sc = statusConfig[t.status] || statusConfig.pending;
                const Icon = sc.icon;
                return (
                  <tr key={t.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono text-xs">{t.id.slice(0, 8)}…</td>
                    <td className="p-3 font-mono text-xs">{t.user_id.slice(0, 8)}…</td>
                    <td className="p-3 font-mono text-xs">{t.paypal_order_id || "—"}</td>
                    <td className="p-3 font-mono text-xs">{t.paypal_capture_id || "—"}</td>
                    <td className="p-3 font-bold">{Number(t.amount).toFixed(2)}</td>
                    <td className="p-3">{t.currency}</td>
                    <td className="p-3">
                      <Badge variant="outline" className={`gap-1 ${sc.color}`}>
                        <Icon className="w-3 h-3" />
                        {sc.label}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className={t.environment === "live" ? "border-red-500/50 text-red-500" : "border-yellow-500/50 text-yellow-500"}>
                        {t.environment || "live"}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleString("ar-MA")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredTxns.length === 0 && (
            <p className="text-center text-muted-foreground py-12">لا توجد معاملات PayPal</p>
          )}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="text-xs text-muted-foreground flex items-center gap-2 pt-4 border-t border-border">
        <Shield className="w-4 h-4" />
        الحماية: JWT + RLS + Edge Functions — لا يتم كشف أي مفتاح سري في الواجهة الأمامية
      </div>
    </div>
  );
};

export default PayPalLivePayments;
