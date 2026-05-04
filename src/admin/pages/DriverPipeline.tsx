import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Phone, MessageCircle, UserCheck, Clock, Search, RefreshCw, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type Lead = {
  id: string;
  business_name: string;
  phone: string;
  city: string | null;
  email: string | null;
  whatsapp: string | null;
  source: string | null;
  status: string;
  notes: string | null;
  last_contact_at: string | null;
  created_at: string;
};

const STATUSES = [
  { value: "new", label: "جديد", color: "bg-blue-500" },
  { value: "contacted", label: "تم التواصل", color: "bg-yellow-500" },
  { value: "interview", label: "موعد مقابلة", color: "bg-purple-500" },
  { value: "active", label: "نشط", color: "bg-green-500" },
  { value: "rejected", label: "مرفوض", color: "bg-red-500" },
];

const DriverPipeline = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [editNotes, setEditNotes] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("hn_driver_leads")
      .select("*")
      .eq("segment", "driver_signup")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error("خطأ في التحميل");
    else setLeads((data || []) as Lead[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("driver_leads_pipeline")
      .on("postgres_changes", { event: "*", schema: "public", table: "hn_driver_leads" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (filterStatus !== "all" && l.status !== filterStatus) return false;
      if (search && !`${l.business_name} ${l.phone} ${l.city || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [leads, search, filterStatus]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: leads.length };
    STATUSES.forEach(s => { c[s.value] = leads.filter(l => l.status === s.value).length; });
    return c;
  }, [leads]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("hn_driver_leads")
      .update({ status, last_contact_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error("خطأ في التحديث");
    else { toast.success("تم التحديث"); load(); }
  };

  const saveNotes = async () => {
    if (!selected) return;
    const { error } = await supabase
      .from("hn_driver_leads")
      .update({ notes: editNotes, last_contact_at: new Date().toISOString() })
      .eq("id", selected.id);
    if (error) toast.error("خطأ");
    else { toast.success("تم الحفظ"); setSelected(null); load(); }
  };

  const conversionRate = leads.length > 0
    ? ((counts.active || 0) / leads.length * 100).toFixed(1)
    : "0";

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-primary" />
            خط أنابيب السائقين
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            إدارة المتقدمين الجدد ومتابعة تحويلهم لسائقين نشطين
          </p>
        </div>
        <Button onClick={load} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 ml-2" /> تحديث
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">المجموع</div>
          <div className="text-2xl font-bold">{counts.all}</div>
        </Card>
        {STATUSES.map(s => (
          <Card key={s.value} className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={`w-2 h-2 rounded-full ${s.color}`} />
              {s.label}
            </div>
            <div className="text-2xl font-bold">{counts[s.value] || 0}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-success" />
          <span className="text-sm">معدل التحويل (سائق نشط من إجمالي المتقدمين):</span>
          <span className="text-lg font-bold text-success">{conversionRate}%</span>
        </div>
      </Card>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو الهاتف أو المدينة..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {STATUSES.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          لا يوجد متقدمون بعد. شارك رابط <code className="bg-muted px-2 py-0.5 rounded">/join-driver</code> لاستقبال الطلبات.
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(lead => {
            const statusObj = STATUSES.find(s => s.value === lead.status) || STATUSES[0];
            const wa = (lead.whatsapp || lead.phone || "").replace(/\D/g, "");
            return (
              <Card key={lead.id} className="p-4 hover:shadow-md transition">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{lead.business_name}</span>
                      <Badge className={`${statusObj.color} text-white text-xs`}>{statusObj.label}</Badge>
                      {lead.source && <Badge variant="outline" className="text-xs">{lead.source}</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground flex gap-3 flex-wrap">
                      <span>📞 {lead.phone}</span>
                      {lead.city && <span>📍 {lead.city}</span>}
                      <span>🕐 {format(new Date(lead.created_at), "yyyy-MM-dd HH:mm")}</span>
                      {lead.last_contact_at && (
                        <span className="text-info">
                          <Clock className="w-3 h-3 inline" /> آخر تواصل: {format(new Date(lead.last_contact_at), "MM-dd HH:mm")}
                        </span>
                      )}
                    </div>
                    {lead.notes && (
                      <div className="text-xs mt-2 p-2 bg-muted rounded">{lead.notes}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={`tel:${lead.phone}`}>
                      <Button size="sm" variant="outline"><Phone className="w-4 h-4" /></Button>
                    </a>
                    <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline" className="text-green-600">
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </a>
                    <Select value={lead.status} onValueChange={v => updateStatus(lead.id, v)}>
                      <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="ghost" onClick={() => { setSelected(lead); setEditNotes(lead.notes || ""); }}>
                          ملاحظات
                        </Button>
                      </DialogTrigger>
                      <DialogContent dir="rtl">
                        <DialogHeader><DialogTitle>ملاحظات: {selected?.business_name}</DialogTitle></DialogHeader>
                        <Textarea
                          value={editNotes}
                          onChange={e => setEditNotes(e.target.value)}
                          rows={6}
                          placeholder="مثلاً: تم الاتصال، يحتاج وقت للتفكير، عنده سيارة موديل 2020..."
                        />
                        <Button onClick={saveNotes}>حفظ</Button>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DriverPipeline;
