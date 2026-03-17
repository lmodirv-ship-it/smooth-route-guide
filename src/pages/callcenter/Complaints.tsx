import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Clock, User, CheckCircle, XCircle, ArrowUp, Plus, MessageCircle, Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const categories = [
  { id: "late_delivery", label: "تأخير التوصيل" },
  { id: "wrong_item", label: "منتج خاطئ" },
  { id: "driver_issue", label: "مشكلة مع السائق" },
  { id: "restaurant_issue", label: "مشكلة مع المطعم" },
  { id: "payment", label: "مشكلة دفع" },
  { id: "cancellation", label: "إلغاء" },
  { id: "other", label: "أخرى" },
];

const Complaints = () => {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [agentNotes, setAgentNotes] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ category: "", description: "", userId: "" });

  const fetchComplaints = useCallback(async () => {
    const { data } = await supabase.from("complaints").select("*").order("created_at", { ascending: false }).limit(100);
    if (data) {
      const uids = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, name, phone").in("id", uids);
      const pMap = new Map(profiles?.map(p => [p.id, p]) || []);
      setComplaints(data.map(c => ({
        ...c,
        userName: pMap.get(c.user_id)?.name || "—",
        userPhone: pMap.get(c.user_id)?.phone || "—",
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchComplaints();
    const ch = supabase.channel("cc-complaints-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "complaints" }, fetchComplaints)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchComplaints]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("complaints").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast({ title: "خطأ", variant: "destructive" }); return; }
    toast({ title: status === "resolved" ? "تم الحل ✅" : status === "in_review" ? "قيد المراجعة" : "تم التحديث" });
  };

  const saveNotes = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("complaints").update({
      agent_notes: agentNotes,
      agent_id: user?.id,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) { toast({ title: "خطأ", variant: "destructive" }); return; }
    toast({ title: "تم حفظ الملاحظات ✅" });
  };

  const filtered = filter === "all" ? complaints :
    filter === "open" ? complaints.filter(c => c.status === "open") :
    filter === "in_review" ? complaints.filter(c => c.status === "in_review") :
    complaints.filter(c => c.status === "resolved");

  const getPriorityBadge = (p: string) => {
    if (p === "high") return { label: "عالي", color: "text-destructive", bg: "bg-destructive/10" };
    if (p === "low") return { label: "منخفض", color: "text-info", bg: "bg-info/10" };
    return { label: "متوسط", color: "text-amber-400", bg: "bg-amber-400/10" };
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button size="sm" onClick={() => setShowNew(!showNew)} className="rounded-lg gap-1">
          <Plus className="w-4 h-4" /> شكوى جديدة
        </Button>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          الشكاوى
        </h1>
      </div>

      {showNew && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="glass rounded-xl p-4 border border-border space-y-3">
          <h3 className="text-foreground font-bold text-sm">تسجيل شكوى جديدة</h3>
          <Select onValueChange={v => setNewForm(f => ({ ...f, category: v }))}>
            <SelectTrigger className="bg-card border-border text-sm"><SelectValue placeholder="التصنيف" /></SelectTrigger>
            <SelectContent>
              {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))}
            placeholder="تفاصيل الشكوى..." className="bg-card border-border text-right text-sm min-h-[60px]" />
          <div className="flex gap-2">
            <Button size="sm" className="rounded-lg" onClick={async () => {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;
              const { error } = await supabase.from("complaints").insert({
                user_id: user.id, category: newForm.category, description: newForm.description, priority: "medium",
              });
              if (error) { toast({ title: "خطأ", variant: "destructive" }); return; }
              toast({ title: "تم تسجيل الشكوى ✅" });
              setShowNew(false);
              setNewForm({ category: "", description: "", userId: "" });
            }}>حفظ</Button>
            <Button size="sm" variant="outline" onClick={() => setShowNew(false)}>إلغاء</Button>
          </div>
        </motion.div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {([
          ["all", "الكل", complaints.length],
          ["open", "مفتوح", complaints.filter(c => c.status === "open").length],
          ["in_review", "قيد المراجعة", complaints.filter(c => c.status === "in_review").length],
          ["resolved", "محلول", complaints.filter(c => c.status === "resolved").length],
        ] as const).map(([key, label, count]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === key ? "gradient-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
            }`}>{label} ({count})</button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-2 max-h-[65vh] overflow-auto">
          {filtered.map(c => {
            const pb = getPriorityBadge(c.priority);
            return (
              <button key={c.id} onClick={() => { setSelected(c); setAgentNotes(c.agent_notes || ""); }}
                className={`w-full glass rounded-xl p-3 border text-right transition-all ${
                  selected?.id === c.id ? "border-primary glow-ring-orange" : "border-border hover:border-primary/30"
                }`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex gap-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      c.status === "open" ? "bg-amber-400/10 text-amber-400" :
                      c.status === "in_review" ? "bg-info/10 text-info" :
                      "bg-success/10 text-success"
                    }`}>{c.status === "open" ? "مفتوح" : c.status === "in_review" ? "مراجعة" : "محلول"}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${pb.bg} ${pb.color}`}>{pb.label}</span>
                  </div>
                  <p className="text-sm font-bold text-foreground">{c.userName}</p>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{c.description}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {categories.find(cat => cat.id === c.category)?.label || c.category} •{" "}
                  {new Date(c.created_at).toLocaleDateString("ar-SA")}
                </p>
              </button>
            );
          })}
          {filtered.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">لا توجد شكاوى</p>}
        </div>

        {selected ? (
          <div className="lg:col-span-2 space-y-4">
            <div className="glass rounded-xl p-5 border border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-success border-success/30 rounded-lg text-xs gap-1"
                    onClick={() => updateStatus(selected.id, "resolved")}>
                    <CheckCircle className="w-3 h-3" /> حل
                  </Button>
                  <Button size="sm" variant="outline" className="text-info border-info/30 rounded-lg text-xs gap-1"
                    onClick={() => updateStatus(selected.id, "in_review")}>
                    <ArrowUp className="w-3 h-3" /> مراجعة
                  </Button>
                </div>
                <h3 className="text-foreground font-bold">شكوى #{selected.id?.slice(0, 8)}</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">{selected.userName}</span><span className="text-foreground font-bold">الزبون</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{selected.userPhone}</span><span className="text-foreground font-bold">الهاتف</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{categories.find(c => c.id === selected.category)?.label || selected.category}</span><span className="text-foreground font-bold">التصنيف</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{selected.priority}</span><span className="text-foreground font-bold">الأولوية</span></div>
              </div>

              <div className="bg-secondary/20 rounded-lg p-4 mb-4">
                <h4 className="text-xs font-bold text-foreground mb-1">التفاصيل</h4>
                <p className="text-sm text-muted-foreground">{selected.description}</p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground">ملاحظات الموظف</h4>
                <Textarea value={agentNotes} onChange={e => setAgentNotes(e.target.value)}
                  placeholder="أضف ملاحظاتك..." className="bg-card border-border text-right text-sm min-h-[60px]" />
                <Button size="sm" className="rounded-lg text-xs gap-1" onClick={() => saveNotes(selected.id)}>
                  <MessageCircle className="w-3 h-3" /> حفظ الملاحظات
                </Button>
              </div>

              {/* Contact buttons */}
              {selected.userPhone && selected.userPhone !== "—" && (
                <div className="flex gap-2 mt-4">
                  <a href={`tel:${selected.userPhone}`}>
                    <Button size="sm" variant="outline" className="rounded-lg text-xs gap-1 text-info border-info/30">
                      <Phone className="w-3 h-3" />اتصال بالزبون
                    </Button>
                  </a>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 glass rounded-2xl p-12 border border-border text-center">
            <AlertTriangle className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-foreground font-bold">اختر شكوى لعرض التفاصيل</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Complaints;
