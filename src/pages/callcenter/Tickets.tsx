import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, User, Car, Link as LinkIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { supabase } from "@/lib/firestoreClient";

const statusMap: Record<string, string> = {
  open: "مفتوح",
  in_progress: "جاري",
  closed: "مغلق",
};

const Tickets = () => {
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "progress" | "closed">("all");
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    user_id: "",
    driver_id: "",
    trip_id: "",
    priority: "high",
    category: "client",
  });

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("tickets").select("*").order("updated_at", { ascending: false }).limit(100);
    const rows = data || [];

    const userIds = [...new Set(rows.flatMap((ticket: any) => [ticket.user_id, ticket.agent_id].filter(Boolean)))];
    const driverIds = [...new Set(rows.map((ticket: any) => ticket.driver_id).filter(Boolean))];

    const [profilesRes, driversRes] = await Promise.all([
      userIds.length ? supabase.from("profiles").select("id, name").in("id", userIds) : Promise.resolve({ data: [] }),
      driverIds.length ? supabase.from("drivers").select("id, user_id").in("id", driverIds) : Promise.resolve({ data: [] }),
    ]);

    const profilesMap = new Map((profilesRes.data || []).map((profile: any) => [profile.id, profile.name]));
    const driversMap = new Map((driversRes.data || []).map((driver: any) => [driver.id, profilesMap.get(driver.user_id) || driver.id.slice(0, 6)]));

    setTickets(rows.map((ticket: any) => ({
      ...ticket,
      statusLabel: statusMap[ticket.status] || ticket.status,
      createdLabel: ticket.created_at ? new Date(ticket.created_at).toLocaleString("ar-MA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—",
      linkedTo: ticket.trip_id
        ? `رحلة ${ticket.trip_id.slice(0, 6)}`
        : ticket.driver_id
          ? `سائق ${driversMap.get(ticket.driver_id) || ticket.driver_id.slice(0, 6)}`
          : ticket.user_id
            ? `عميل ${profilesMap.get(ticket.user_id) || ticket.user_id.slice(0, 6)}`
            : "عام",
      ownerName: ticket.driver_id
        ? driversMap.get(ticket.driver_id) || "سائق"
        : ticket.user_id
          ? profilesMap.get(ticket.user_id) || "عميل"
          : "غير محدد",
      agentName: ticket.agent_id ? profilesMap.get(ticket.agent_id) || "وكيل" : "غير معين",
      typeLabel: ticket.driver_id ? "سائق" : "عميل",
    })));
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchTickets();
    const channel = supabase
      .channel("tickets-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, fetchTickets)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTickets]);

  const filtered = useMemo(() => {
    if (filter === "all") return tickets;
    if (filter === "open") return tickets.filter((ticket) => ticket.status === "open");
    if (filter === "progress") return tickets.filter((ticket) => ticket.status === "in_progress");
    return tickets.filter((ticket) => ticket.status === "closed");
  }, [filter, tickets]);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast({ title: "يرجى تعبئة الموضوع والتفاصيل", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    setSubmitting(true);
    await supabase.from("tickets").insert({
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      category: form.category,
      status: "open",
      user_id: form.user_id.trim() || null,
      driver_id: form.driver_id.trim() || null,
      trip_id: form.trip_id.trim() || null,
      agent_id: user?.id || null,
      updated_at: new Date().toISOString(),
    });
    setSubmitting(false);
    setShowNew(false);
    setForm({ title: "", description: "", user_id: "", driver_id: "", trip_id: "", priority: "high", category: "client" });
    toast({ title: "✅ تم إنشاء التذكرة" });
    await fetchTickets();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button size="sm" onClick={() => setShowNew(!showNew)} className="gradient-primary text-primary-foreground rounded-lg">
          <Plus className="w-4 h-4 ml-1" /> تذكرة جديدة
        </Button>
        <h1 className="text-xl font-bold text-foreground">نظام التذاكر</h1>
      </div>

      {showNew && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="gradient-card rounded-xl p-4 border border-border mb-4 space-y-3">
          <h3 className="text-foreground font-bold text-sm">إنشاء تذكرة جديدة</h3>
          <Input value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} placeholder="الموضوع" className="bg-secondary border-border rounded-lg text-right text-sm" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={form.user_id} onChange={(e) => setForm((current) => ({ ...current, user_id: e.target.value }))} placeholder="UID العميل (اختياري)" className="bg-secondary border-border rounded-lg text-right text-sm" />
            <Input value={form.driver_id} onChange={(e) => setForm((current) => ({ ...current, driver_id: e.target.value }))} placeholder="UID السائق (اختياري)" className="bg-secondary border-border rounded-lg text-right text-sm" />
            <Input value={form.trip_id} onChange={(e) => setForm((current) => ({ ...current, trip_id: e.target.value }))} placeholder="UID الرحلة (اختياري)" className="bg-secondary border-border rounded-lg text-right text-sm" />
          </div>
          <div className="flex gap-2">
            <select value={form.priority} onChange={(e) => setForm((current) => ({ ...current, priority: e.target.value }))} className="flex-1 bg-secondary border border-border rounded-lg text-sm text-foreground p-2 text-right">
              <option value="high">عالي</option>
              <option value="medium">متوسط</option>
              <option value="low">منخفض</option>
            </select>
            <select value={form.category} onChange={(e) => setForm((current) => ({ ...current, category: e.target.value }))} className="flex-1 bg-secondary border border-border rounded-lg text-sm text-foreground p-2 text-right">
              <option value="client">عميل</option>
              <option value="driver">سائق</option>
              <option value="system">نظام</option>
            </select>
          </div>
          <Textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} placeholder="تفاصيل التذكرة..." className="bg-secondary border-border rounded-lg text-right min-h-[60px] text-sm" />
          <div className="flex gap-2">
            <Button size="sm" className="gradient-primary text-primary-foreground rounded-lg" onClick={() => void handleCreate()} disabled={submitting}>إنشاء</Button>
            <Button size="sm" variant="outline" className="border-border rounded-lg" onClick={() => setShowNew(false)}>إلغاء</Button>
          </div>
        </motion.div>
      )}

      <div className="flex gap-2 mb-4">
        {([ ["all", "الكل"], ["open", "مفتوح"], ["progress", "جاري"], ["closed", "مغلق"] ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === key ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{label}</button>
        ))}
      </div>

      <div className="gradient-card rounded-xl border border-border overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs">
                <td className="p-3">الوكيل</td>
                <td className="p-3">الأولوية</td>
                <td className="p-3">الحالة</td>
                <td className="p-3">مرتبط بـ</td>
                <td className="p-3">العميل/السائق</td>
                <td className="p-3">التاريخ</td>
                <td className="p-3">الموضوع</td>
                <td className="p-3 text-right">#</td>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ticket) => (
                <tr key={ticket.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="p-3 text-muted-foreground text-xs">{ticket.agentName}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ticket.priority === "high" ? "bg-destructive/10 text-destructive" : ticket.priority === "medium" ? "bg-warning/10 text-warning" : "bg-info/10 text-info"}`}>{ticket.priority}</span>
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ticket.status === "open" ? "bg-warning/10 text-warning" : ticket.status === "in_progress" ? "bg-info/10 text-info" : "bg-success/10 text-success"}`}>{ticket.statusLabel}</span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" /> {ticket.linkedTo}
                  </td>
                  <td className="p-3 text-foreground text-xs">
                    <div className="flex items-center gap-1">
                      {ticket.typeLabel === "عميل" ? <User className="w-3 h-3 text-info" /> : <Car className="w-3 h-3 text-primary" />}
                      {ticket.ownerName}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">{ticket.createdLabel}</td>
                  <td className="p-3 text-foreground text-xs font-medium">{ticket.title}</td>
                  <td className="p-3 text-right text-muted-foreground font-mono text-xs">{ticket.id.slice(0, 8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Tickets;
