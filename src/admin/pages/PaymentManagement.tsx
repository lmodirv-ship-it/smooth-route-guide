import { useState, useEffect } from "react";
import { CreditCard, Wallet, Banknote, Star, Search, Loader2, CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  completed: "bg-green-500/20 text-green-400",
  pending: "bg-yellow-500/20 text-yellow-400",
  failed: "bg-red-500/20 text-red-400",
};

const statusIcons: Record<string, any> = {
  completed: CheckCircle,
  pending: Clock,
  failed: XCircle,
};

const PaymentManagement = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [walletRequests, setWalletRequests] = useState<any[]>([]);
  const [stars, setStars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, revenue: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [txnRes, walletRes, starsRes] = await Promise.all([
      supabase.from("payment_transactions").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("wallet_transactions").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("reward_stars").select("*").order("stars", { ascending: false }).limit(50),
    ]);

    const txns = txnRes.data || [];
    setTransactions(txns);
    setWalletRequests(walletRes.data || []);
    setStars(starsRes.data || []);

    setStats({
      total: txns.length,
      completed: txns.filter((t: any) => t.status === "completed").length,
      pending: txns.filter((t: any) => t.status === "pending").length,
      revenue: txns.filter((t: any) => t.status === "completed").reduce((s: number, t: any) => s + Number(t.amount || 0), 0),
    });
    setLoading(false);
  };

  const filteredTxns = transactions.filter((t: any) =>
    !search || t.payment_method?.includes(search) || t.status?.includes(search) || t.id?.includes(search)
  );

  const grantStars = async (userId: string, amount: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("reward_stars").upsert({
      user_id: userId,
      stars: amount,
    }, { onConflict: "user_id" });
    await supabase.from("star_history").insert({
      user_id: userId,
      stars_change: amount,
      reason: "منحة يدوية من المدير",
      granted_by: user?.id,
    });
    toast({ title: `⭐ تم منح ${amount} نجوم` });
    loadData();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">💳 إدارة المدفوعات</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "إجمالي المعاملات", value: stats.total, icon: CreditCard, color: "text-primary" },
          { label: "مكتملة", value: stats.completed, icon: CheckCircle, color: "text-green-400" },
          { label: "معلقة", value: stats.pending, icon: Clock, color: "text-yellow-400" },
          { label: "الإيرادات (DH)", value: stats.revenue.toFixed(2), icon: TrendingUp, color: "text-emerald-400" },
        ].map((s, i) => (
          <div key={i} className="glass-card rounded-xl p-4 text-center">
            <s.icon className={`w-6 h-6 mx-auto mb-2 ${s.color}`} />
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="transactions">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="transactions">المعاملات</TabsTrigger>
          <TabsTrigger value="wallet">المحفظة</TabsTrigger>
          <TabsTrigger value="stars">النجوم والمكافآت</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
            <Button variant="outline" size="sm" onClick={loadData}>تحديث</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-right p-2">المعرف</th>
                  <th className="text-right p-2">المبلغ</th>
                  <th className="text-right p-2">الطريقة</th>
                  <th className="text-right p-2">الحالة</th>
                  <th className="text-right p-2">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxns.map((t: any) => {
                  const Icon = statusIcons[t.status] || Clock;
                  return (
                    <tr key={t.id} className="border-b border-border/50 hover:bg-secondary/30">
                      <td className="p-2 font-mono text-xs">{t.id?.slice(0, 8)}</td>
                      <td className="p-2 font-bold">{Number(t.amount).toFixed(2)} DH</td>
                      <td className="p-2">
                        <Badge variant="outline" className="gap-1">
                          {t.payment_method === "cash" ? "💵" : t.payment_method === "wallet" ? "👛" : "💎"}
                          {t.payment_method}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${statusColors[t.status] || ""}`}>
                          <Icon className="w-3 h-3" /> {t.status}
                        </span>
                      </td>
                      <td className="p-2 text-muted-foreground text-xs">{new Date(t.created_at).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredTxns.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد معاملات</p>}
          </div>
        </TabsContent>

        <TabsContent value="wallet" className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-right p-2">النوع</th>
                  <th className="text-right p-2">المبلغ</th>
                  <th className="text-right p-2">الرصيد بعد</th>
                  <th className="text-right p-2">الوصف</th>
                  <th className="text-right p-2">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {walletRequests.map((w: any) => (
                  <tr key={w.id} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="p-2">
                      <Badge variant={w.amount > 0 ? "default" : "destructive"}>
                        {w.transaction_type}
                      </Badge>
                    </td>
                    <td className={`p-2 font-bold ${Number(w.amount) > 0 ? "text-green-400" : "text-red-400"}`}>
                      {Number(w.amount) > 0 ? "+" : ""}{Number(w.amount).toFixed(2)} DH
                    </td>
                    <td className="p-2">{Number(w.balance_after).toFixed(2)} DH</td>
                    <td className="p-2 text-muted-foreground text-xs">{w.description || "—"}</td>
                    <td className="p-2 text-muted-foreground text-xs">{new Date(w.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {walletRequests.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد عمليات محفظة</p>}
          </div>
        </TabsContent>

        <TabsContent value="stars" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stars.map((s: any) => (
              <div key={s.id} className="glass-card rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => grantStars(s.user_id, s.stars + 5)}>+5 ⭐</Button>
                    <Button size="sm" variant="outline" onClick={() => grantStars(s.user_id, Math.max(0, s.stars - 5))}>-5</Button>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs text-muted-foreground">{s.user_id?.slice(0, 8)}</p>
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      <span className="text-xl font-bold text-foreground">{s.stars}</span>
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">{s.level}</Badge>
                <p className="text-xs text-muted-foreground">إجمالي المكتسب: {s.total_earned}</p>
              </div>
            ))}
            {stars.length === 0 && <p className="text-center text-muted-foreground py-8 col-span-full">لا توجد بيانات نجوم</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PaymentManagement;
