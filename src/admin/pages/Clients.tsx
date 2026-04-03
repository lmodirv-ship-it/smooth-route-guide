import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Search, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import ClientDetailSheet from "@/admin/components/ClientDetailSheet";

interface Client {
  id: string; name: string; email: string | null; phone: string | null;
  created_at: string; tripCount?: number; walletBalance?: number; user_code?: string | null;
  roles?: string[];
}

const AdminClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const fetchClients = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (!profiles) return;
    const ids = profiles.map(p => p.id);
    const [tripsRes, walletsRes, rolesRes] = await Promise.all([
      supabase.from("trips").select("user_id").in("user_id", ids),
      supabase.from("wallet").select("user_id, balance").in("user_id", ids),
      supabase.from("user_roles").select("user_id, role").in("user_id", ids),
    ]);
    const tripCountMap = new Map<string, number>();
    tripsRes.data?.forEach(t => tripCountMap.set(t.user_id, (tripCountMap.get(t.user_id) || 0) + 1));
    const walletMap = new Map(walletsRes.data?.map(w => [w.user_id, w.balance]) || []);
    const rolesMap = new Map<string, string[]>();
    rolesRes.data?.forEach(r => {
      if (!rolesMap.has(r.user_id)) rolesMap.set(r.user_id, []);
      rolesMap.get(r.user_id)!.push(r.role);
    });

    setClients(profiles.map(p => ({
      ...p, tripCount: tripCountMap.get(p.id) || 0, walletBalance: walletMap.get(p.id) || 0,
      roles: rolesMap.get(p.id) || ["user"],
    })));
  };

  useEffect(() => { fetchClients(); }, []);

  const openDetail = (clientId: string) => {
    setSelectedClientId(clientId);
    setSheetOpen(true);
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
                  <Button size="sm" variant="outline" onClick={() => openDetail(client.id)} className="text-xs h-7 text-info border-info/30">
                    <Eye className="w-3 h-3 ml-1" />عرض
                  </Button>
                </td>
                <td className="p-4 text-primary font-semibold">{client.walletBalance} DH</td>
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
