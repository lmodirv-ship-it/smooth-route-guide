/**
 * Relations 360° — Unified entity tracker
 * Search any party (driver / customer / store) by code/phone/name
 * View KPIs + complete timeline (calls, notes, orders, trips, complaints, tickets, ratings)
 * Quick actions: add note, call, view order/trip
 */
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search, User, Car, Store as StoreIcon, Phone, MessageSquare, Package,
  AlertTriangle, Star, FileText, Clock, Loader2, Hash, PhoneCall, StickyNote, Send,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useCallCenterCtx } from "@/admin/layouts/CallCenterLayout";

type EntityType = "customer" | "driver" | "store";

interface Entity {
  type: EntityType;
  id: string;            // profiles.id / drivers.id / stores.id
  userId?: string;       // profiles.id (for customers/drivers)
  code: string;
  name: string;
  phone: string;
  rating?: number;
  status?: string;
}

interface TimelineEvent {
  id: string;
  type: "call" | "note" | "order" | "trip" | "complaint" | "ticket" | "rating";
  title: string;
  subtitle?: string;
  status?: string;
  date: string;
  ref?: string;
}

interface KPIs {
  callsTotal: number;
  callsAvgDuration: number;
  ordersTotal: number;
  ordersDelivered: number;
  ordersCancelled: number;
  tripsTotal: number;
  complaintsOpen: number;
  ticketsOpen: number;
  ratingAvg: number;
  ratingCount: number;
}

const formatDate = (d: string) =>
  new Date(d).toLocaleString("ar-SA", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

const Relations360 = () => {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Entity[]>([]);
  const [selected, setSelected] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const callCtx = useCallCenterCtx();

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 2) {
      toast({ title: "اكتب على الأقل حرفين", variant: "destructive" });
      return;
    }
    setSearching(true);
    setResults([]);
    setSelected(null);

    const like = `%${q}%`;
    const [profilesRes, driversRes, storesRes] = await Promise.all([
      supabase.from("profiles")
        .select("id, name, phone, user_code")
        .or(`name.ilike.${like},phone.ilike.${like},user_code.ilike.${like}`)
        .limit(20),
      supabase.from("drivers")
        .select("id, user_id, status, rating, driver_code, profiles!drivers_user_id_fkey(name, phone)")
        .or(`driver_code.ilike.${like}`)
        .limit(20),
      supabase.from("stores")
        .select("id, name, phone, rating, store_code")
        .or(`name.ilike.${like},phone.ilike.${like},store_code.ilike.${like}`)
        .limit(20),
    ]);

    const list: Entity[] = [];

    // Drivers (resolved via driver_code OR via profile match)
    const driverUserIds = new Set<string>();
    (driversRes.data || []).forEach((d: any) => {
      driverUserIds.add(d.user_id);
      list.push({
        type: "driver",
        id: d.id,
        userId: d.user_id,
        code: d.driver_code || "—",
        name: d.profiles?.name || "—",
        phone: d.profiles?.phone || "—",
        rating: d.rating,
        status: d.status,
      });
    });

    // Profiles → if matching profile is also a driver, skip duplicate
    (profilesRes.data || []).forEach((p: any) => {
      if (driverUserIds.has(p.id)) return;
      list.push({
        type: "customer",
        id: p.id,
        userId: p.id,
        code: p.user_code || "—",
        name: p.name || "—",
        phone: p.phone || "—",
      });
    });

    (storesRes.data || []).forEach((s: any) => {
      list.push({
        type: "store",
        id: s.id,
        code: s.store_code || "—",
        name: s.name || "—",
        phone: s.phone || "—",
        rating: s.rating,
      });
    });

    setResults(list);
    setSearching(false);
    if (list.length === 0) toast({ title: "لا توجد نتائج" });
  }, [query]);

  const loadEntity = useCallback(async (entity: Entity) => {
    setSelected(entity);
    setLoading(true);
    setTimeline([]);
    setKpis(null);

    const events: TimelineEvent[] = [];
    const k: KPIs = {
      callsTotal: 0, callsAvgDuration: 0,
      ordersTotal: 0, ordersDelivered: 0, ordersCancelled: 0,
      tripsTotal: 0, complaintsOpen: 0, ticketsOpen: 0,
      ratingAvg: 0, ratingCount: 0,
    };

    // CALLS — by user_id (for customers/drivers via userId) OR by party_reference (for stores via code)
    let callsQ = supabase.from("call_logs").select("id, call_reference, caller_name, caller_phone, call_type, status, reason, created_at, duration").limit(100).order("created_at", { ascending: false });
    if (entity.userId) callsQ = callsQ.eq("user_id", entity.userId);
    else callsQ = callsQ.eq("party_reference", entity.code);
    const { data: calls } = await callsQ;
    (calls || []).forEach((c: any) => {
      events.push({
        id: `call_${c.id}`, type: "call",
        title: c.reason || c.call_type || "مكالمة",
        subtitle: c.caller_name ? `${c.caller_name} — ${c.caller_phone || ""}` : c.caller_phone,
        status: c.status, date: c.created_at, ref: c.call_reference,
      });
    });
    k.callsTotal = (calls || []).length;
    const durs = (calls || []).map((c: any) => c.duration || 0).filter(Boolean);
    k.callsAvgDuration = durs.length ? Math.round(durs.reduce((a: number, b: number) => a + b, 0) / durs.length) : 0;

    // ORDERS / TRIPS / RATINGS / COMPLAINTS / TICKETS — only when we have a userId
    if (entity.userId) {
      const filterCol = entity.type === "driver" ? "driver_id" : "user_id";
      const filterId = entity.type === "driver" ? entity.id : entity.userId;

      const [ordersRes, tripsRes, complaintsRes, ticketsRes, ratingsRes] = await Promise.all([
        supabase.from("delivery_orders").select("id, order_code, status, created_at, store_id").eq(filterCol, filterId).order("created_at", { ascending: false }).limit(50),
        supabase.from("trips").select("id, trip_code, status, created_at").eq(filterCol, filterId).order("created_at", { ascending: false }).limit(50),
        supabase.from("complaints").select("id, description, status, created_at").eq(filterCol, filterId).order("created_at", { ascending: false }).limit(50),
        supabase.from("tickets").select("id, title, description, status, created_at").eq(filterCol, filterId).order("created_at", { ascending: false }).limit(50),
        supabase.from("ratings").select("id, score, created_at").eq(entity.type === "driver" ? "driver_id" : "user_id", filterId).order("created_at", { ascending: false }).limit(100),
      ]);

      (ordersRes.data || []).forEach((o: any) => {
        events.push({ id: `o_${o.id}`, type: "order", title: `طلب توصيل`, subtitle: o.order_code, status: o.status, date: o.created_at, ref: o.order_code });
        k.ordersTotal++;
        if (o.status === "delivered") k.ordersDelivered++;
        if (o.status === "cancelled") k.ordersCancelled++;
      });
      (tripsRes.data || []).forEach((t: any) => {
        events.push({ id: `t_${t.id}`, type: "trip", title: "رحلة", subtitle: t.trip_code, status: t.status, date: t.created_at, ref: t.trip_code });
        k.tripsTotal++;
      });
      (complaintsRes.data || []).forEach((c: any) => {
        events.push({ id: `c_${c.id}`, type: "complaint", title: "شكوى", subtitle: c.description?.slice(0, 80), status: c.status, date: c.created_at });
        if (c.status === "open") k.complaintsOpen++;
      });
      (ticketsRes.data || []).forEach((t: any) => {
        events.push({ id: `k_${t.id}`, type: "ticket", title: t.title || "تذكرة", subtitle: t.description?.slice(0, 80), status: t.status, date: t.created_at });
        if (t.status === "open") k.ticketsOpen++;
      });
      (ratingsRes.data || []).forEach((r: any) => {
        events.push({ id: `r_${r.id}`, type: "rating", title: `تقييم ${r.score}/5`, status: String(r.score), date: r.created_at });
      });
      const scores = (ratingsRes.data || []).map((r: any) => r.score);
      k.ratingCount = scores.length;
      k.ratingAvg = scores.length ? Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10) / 10 : 0;
    }

    // NOTES — collected from call_notes for this entity's calls
    if ((calls || []).length > 0) {
      const callIds = (calls || []).map((c: any) => c.id);
      const { data: notes } = await supabase.from("call_notes")
        .select("id, content, created_at, call_log_id")
        .in("call_log_id", callIds);
      (notes || []).forEach((n: any) => {
        events.push({ id: `n_${n.id}`, type: "note", title: "ملاحظة", subtitle: n.content, date: n.created_at });
      });
    }

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTimeline(events);
    setKpis(k);
    setLoading(false);
  }, []);

  const handleAddNote = async () => {
    if (!noteText.trim() || !selected) return;
    setSavingNote(true);
    const { data: auth } = await supabase.auth.getUser();
    // Create a "manual" call_log to anchor the note (no actual call)
    const { data: log, error: logErr } = await supabase.from("call_logs").insert({
      caller_name: selected.name,
      caller_phone: selected.phone,
      call_type: "note",
      reason: "ملاحظة يدوية من لوحة العلاقات",
      status: "completed",
      duration: 0,
      agent_id: auth.user?.id,
      user_id: selected.userId || null,
      party_type: selected.type === "driver" ? "driver" : selected.type === "store" ? "store" : "client",
      party_reference: selected.code,
    }).select("id").single();

    if (logErr || !log) {
      toast({ title: "تعذر حفظ الملاحظة", description: logErr?.message, variant: "destructive" });
      setSavingNote(false);
      return;
    }

    const { error } = await supabase.from("call_notes").insert({
      call_log_id: log.id,
      agent_id: auth.user?.id,
      content: noteText.trim(),
    });

    if (error) {
      toast({ title: "تعذر حفظ الملاحظة", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم حفظ الملاحظة ✅" });
      setNoteText("");
      loadEntity(selected);
    }
    setSavingNote(false);
  };

  const handleCall = () => {
    if (!selected || !callCtx) return;
    callCtx.startCallToParty({
      partyType: selected.type === "driver" ? "driver" : selected.type === "store" ? "store" : "client",
      reference: selected.code,
      name: selected.name,
      phone: selected.phone,
      userId: selected.userId,
    } as any);
  };

  const ENTITY_META: Record<EntityType, { icon: any; label: string; color: string }> = {
    customer: { icon: User, label: "عميل", color: "bg-info/15 text-info border-info/20" },
    driver: { icon: Car, label: "سائق", color: "bg-success/15 text-success border-success/20" },
    store: { icon: StoreIcon, label: "محل", color: "bg-primary/15 text-primary border-primary/20" },
  };

  const TIMELINE_META: Record<TimelineEvent["type"], { icon: any; color: string; label: string }> = {
    call: { icon: PhoneCall, color: "text-info", label: "مكالمة" },
    note: { icon: StickyNote, color: "text-warning", label: "ملاحظة" },
    order: { icon: Package, color: "text-amber-400", label: "طلب" },
    trip: { icon: Car, color: "text-cyan-400", label: "رحلة" },
    complaint: { icon: AlertTriangle, color: "text-destructive", label: "شكوى" },
    ticket: { icon: FileText, color: "text-purple-400", label: "تذكرة" },
    rating: { icon: Star, color: "text-yellow-400", label: "تقييم" },
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-right">
          <h1 className="text-xl font-black text-foreground">لوحة العلاقات 360°</h1>
          <p className="text-xs text-muted-foreground/70">تتبع كامل للعلاقات بين السائقين، العملاء، والمحلات</p>
        </div>
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/30 to-primary/5 border border-primary/20 flex items-center justify-center">
          <Search className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Search */}
      <div className="glass-card rounded-2xl p-4 border border-white/[0.06]">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="ابحث بالاسم، الهاتف، أو الكود (A123456 / S123456 / R123456)…"
            className="bg-secondary/40 border-border h-11 rounded-xl text-sm"
          />
          <Button onClick={handleSearch} disabled={searching} className="h-11 px-5 rounded-xl gap-2">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            بحث
          </Button>
        </div>

        {results.length > 0 && (
          <div className="mt-3 space-y-1.5 max-h-64 overflow-auto">
            {results.map(r => {
              const meta = ENTITY_META[r.type];
              const Icon = meta.icon;
              return (
                <button
                  key={`${r.type}_${r.id}`}
                  onClick={() => loadEntity(r)}
                  className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all text-right ${
                    selected?.id === r.id ? "border-primary/40 bg-primary/5" : "border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Hash className="w-3 h-3" /><span className="font-mono">{r.code}</span>
                    {r.phone !== "—" && <span className="text-muted-foreground/60">{r.phone}</span>}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-semibold text-foreground">{r.name}</span>
                    <Badge variant="outline" className={`gap-1 ${meta.color}`}>
                      <Icon className="w-3 h-3" />{meta.label}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Entity detail */}
      {selected && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Profile card */}
          <div className="glass-card rounded-2xl p-4 border border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleCall} className="gap-2">
                <Phone className="w-3.5 h-3.5" />اتصال
              </Button>
            </div>
            <div className="flex items-center gap-3 text-right">
              <div>
                <h2 className="text-base font-bold text-foreground">{selected.name}</h2>
                <p className="text-[11px] text-muted-foreground/70 font-mono">{selected.code} · {selected.phone}</p>
                {selected.status && <Badge variant="secondary" className="mt-1 text-[10px]">{selected.status}</Badge>}
              </div>
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${ENTITY_META[selected.type].color}`}>
                {(() => { const I = ENTITY_META[selected.type].icon; return <I className="w-6 h-6" />; })()}
              </div>
            </div>
          </div>

          {/* KPIs */}
          {kpis && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {[
                { label: "مكالمات", value: kpis.callsTotal, sub: `~${Math.round(kpis.callsAvgDuration / 60)}د متوسط`, icon: PhoneCall, color: "text-info" },
                { label: "طلبات", value: kpis.ordersTotal, sub: `${kpis.ordersDelivered} ✓ · ${kpis.ordersCancelled} ✗`, icon: Package, color: "text-amber-400" },
                { label: "رحلات", value: kpis.tripsTotal, icon: Car, color: "text-cyan-400" },
                { label: "شكاوى/تذاكر", value: kpis.complaintsOpen + kpis.ticketsOpen, sub: "مفتوحة", icon: AlertTriangle, color: "text-destructive" },
                { label: "تقييم", value: kpis.ratingAvg || "—", sub: `${kpis.ratingCount} تقييم`, icon: Star, color: "text-yellow-400" },
              ].map((k, i) => {
                const Icon = k.icon;
                return (
                  <div key={i} className="glass-card rounded-xl p-3 border border-white/[0.06] text-right">
                    <div className="flex items-center justify-between mb-1">
                      <Icon className={`w-4 h-4 ${k.color}`} />
                      <p className="text-[10px] text-muted-foreground/70 font-bold">{k.label}</p>
                    </div>
                    <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
                    {k.sub && <p className="text-[9px] text-muted-foreground/60 mt-0.5">{k.sub}</p>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick note */}
          <div className="glass-card rounded-2xl p-4 border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <Button size="sm" onClick={handleAddNote} disabled={!noteText.trim() || savingNote} className="gap-2">
                {savingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                حفظ
              </Button>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-warning" />ملاحظة سريعة
              </h3>
            </div>
            <Textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="اكتب ملاحظتك حول هذا الطرف… (تُحفظ في السجل وتظهر في الخط الزمني)"
              className="min-h-[70px] text-right bg-secondary/40"
            />
          </div>

          {/* Timeline */}
          <div className="glass-card rounded-2xl p-4 border border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="outline" className="text-[10px]">{timeline.length} حدث</Badge>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />الخط الزمني الكامل
              </h3>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : timeline.length === 0 ? (
              <p className="text-center py-12 text-sm text-muted-foreground/70">لا توجد أحداث مسجلة لهذا الطرف</p>
            ) : (
              <Tabs defaultValue="all" dir="rtl">
                <TabsList className="grid grid-cols-4 md:grid-cols-8 mb-3">
                  <TabsTrigger value="all" className="text-[10px]">الكل</TabsTrigger>
                  {Object.entries(TIMELINE_META).map(([k, m]) => (
                    <TabsTrigger key={k} value={k} className="text-[10px]">
                      <m.icon className={`w-3 h-3 ${m.color}`} />
                    </TabsTrigger>
                  ))}
                </TabsList>

                {(["all", ...Object.keys(TIMELINE_META)] as const).map(tab => (
                  <TabsContent key={tab} value={tab} className="space-y-1.5 max-h-[500px] overflow-auto">
                    {timeline
                      .filter(e => tab === "all" || e.type === tab)
                      .map(e => {
                        const meta = TIMELINE_META[e.type];
                        const Icon = meta.icon;
                        return (
                          <div key={e.id} className="flex items-start gap-3 p-2.5 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                            <div className="flex-1 text-right min-w-0">
                              <div className="flex items-center justify-end gap-2">
                                {e.status && <Badge variant="outline" className="text-[9px]">{e.status}</Badge>}
                                {e.ref && <span className="text-[9px] text-muted-foreground/60 font-mono">{e.ref}</span>}
                                <span className="text-xs font-semibold text-foreground">{e.title}</span>
                              </div>
                              {e.subtitle && <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">{e.subtitle}</p>}
                              <p className="text-[9px] text-muted-foreground/50 mt-0.5">{formatDate(e.date)}</p>
                            </div>
                            <div className={`w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0`}>
                              <Icon className={`w-4 h-4 ${meta.color}`} />
                            </div>
                          </div>
                        );
                      })}
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Relations360;
