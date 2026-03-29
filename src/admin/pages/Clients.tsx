import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Search, Eye, Ban, CheckCircle, Mail, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface Client {
  id: string; name: string; email: string | null; phone: string | null;
  created_at: string; tripCount?: number; walletBalance?: number; user_code?: string | null;
}

const AdminClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientTrips, setClientTrips] = useState<any[]>([]);

  const fetchClients = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (!profiles) return;
    // Get trip counts
    const ids = profiles.map(p => p.id);
    const { data: trips } = await supabase.from("trips").select("user_id").in("user_id", ids);
    const tripCountMap = new Map<string, number>();
    trips?.forEach(t => tripCountMap.set(t.user_id, (tripCountMap.get(t.user_id) || 0) + 1));
    // Get wallet balances
    const { data: wallets } = await supabase.from("wallet").select("user_id, balance").in("user_id", ids);
    const walletMap = new Map(wallets?.map(w => [w.user_id, w.balance]) || []);

    setClients(profiles.map(p => ({
      ...p, tripCount: tripCountMap.get(p.id) || 0, walletBalance: walletMap.get(p.id) || 0,
    })));
  };

  useEffect(() => { fetchClients(); }, []);

  const openDetail = async (client: Client) => {
    setSelectedClient(client);
    const { data } = await supabase.from("trips").select("*").eq("user_id", client.id).order("created_at", { ascending: false }).limit(10);
    setClientTrips(data || []);
  };

  const filtered = clients.filter(c => {
    if (!search) return true;
    return c.name?.includes(search) || c.email?.includes(search) || c.phone?.includes(search) || c.user_code?.includes(search);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="relative w-64">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث بالاسم، البريد أو الهاتف..." value={search} onChange={e => setSearch(e.target.value)}
            className="bg-secondary/60 border-border h-9 rounded-lg pr-9 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">إدارة العملاء</h1>
          <Users className="w-6 h-6 text-primary" />
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
             <tr className="border-b border-border text-right">
              <th className="p-4 text-muted-foreground font-medium">إجراءات</th>
              <th className="p-4 text-muted-foreground font-medium">الرصيد</th>
              <th className="p-4 text-muted-foreground font-medium">الرحلات</th>
              <th className="p-4 text-muted-foreground font-medium">الهاتف</th>
              <th className="p-4 text-muted-foreground font-medium">البريد</th>
              <th className="p-4 text-muted-foreground font-medium">الاسم</th>
              <th className="p-4 text-muted-foreground font-medium text-center">الرمز</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">لا يوجد عملاء</td></tr>}
            {filtered.map(client => (
              <motion.tr key={client.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                <td className="p-4">
                  <Button size="sm" variant="outline" onClick={() => openDetail(client)} className="text-xs h-7 text-info border-info/30">
                    <Eye className="w-3 h-3 ml-1" />عرض
                  </Button>
                </td>
                <td className="p-4 text-primary font-semibold">{client.walletBalance} ر.س</td>
                <td className="p-4 text-foreground">{client.tripCount}</td>
                <td className="p-4 text-muted-foreground">{client.phone || "—"}</td>
                <td className="p-4 text-muted-foreground">{client.email || "—"}</td>
                <td className="p-4 text-foreground font-medium">{client.name || "—"}</td>
                <td className="p-4 text-center">
                  <Badge variant="outline" className="font-mono text-xs font-bold">{client.user_code || "—"}</Badge>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="glass-card border-border max-w-lg" dir="rtl">
          <DialogHeader><DialogTitle className="text-foreground">بيانات العميل</DialogTitle></DialogHeader>
          {selectedClient && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center"><Users className="w-7 h-7 text-primary" /></div>
                <div>
                  <p className="text-lg font-bold text-foreground">{selectedClient.name}</p>
                  <p className="text-sm font-mono text-primary font-bold">{selectedClient.user_code || "—"}</p>
                  {selectedClient.email && <p className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{selectedClient.email}</p>}
                  {selectedClient.phone && <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{selectedClient.phone}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-secondary/50 text-center">
                  <p className="text-xs text-muted-foreground">الرحلات</p>
                  <p className="text-xl font-bold text-foreground">{selectedClient.tripCount}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50 text-center">
                  <p className="text-xs text-muted-foreground">الرصيد</p>
                  <p className="text-xl font-bold text-primary">{selectedClient.walletBalance} ر.س</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">آخر الرحلات</p>
                {clientTrips.length === 0 ? <p className="text-xs text-muted-foreground">لا توجد رحلات</p> : (
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {clientTrips.map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 text-xs">
                        <span className={t.status === "completed" ? "text-success" : t.status === "in_progress" ? "text-info" : "text-destructive"}>
                          {t.status === "completed" ? "مكتملة" : t.status === "in_progress" ? "جارية" : "ملغاة"}
                        </span>
                        <span className="text-primary font-semibold">{t.fare || 0} ر.س</span>
                        <span className="text-foreground truncate max-w-[120px]">{t.start_location || "—"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminClients;
