import { useMemo, useState } from "react";
import { useRoutes, type Route as RouteRow } from "@/hooks/useRoutes";
import { useReservations } from "@/hooks/useReservations";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useI18n } from "@/i18n/context";
import { Plus, Pencil, Trash2, Users, Power, MapPin, Clock, Ticket, Loader2 } from "lucide-react";

const DAYS = [
  { key: "mon", label: { ar: "إثنين", fr: "Lun", en: "Mon", es: "Lun" } },
  { key: "tue", label: { ar: "ثلاثاء", fr: "Mar", en: "Tue", es: "Mar" } },
  { key: "wed", label: { ar: "أربعاء", fr: "Mer", en: "Wed", es: "Mié" } },
  { key: "thu", label: { ar: "خميس", fr: "Jeu", en: "Thu", es: "Jue" } },
  { key: "fri", label: { ar: "جمعة", fr: "Ven", en: "Fri", es: "Vie" } },
  { key: "sat", label: { ar: "سبت", fr: "Sam", en: "Sat", es: "Sáb" } },
  { key: "sun", label: { ar: "أحد", fr: "Dim", en: "Sun", es: "Dom" } },
];

const emptyForm = {
  origin_address: "",
  destination_address: "",
  city: "",
  departure_time: "08:00",
  days_of_week: [] as string[],
  seats_total: 4,
  price_per_seat: 20,
  notes: "",
};

type FormState = typeof emptyForm;

const DriverMyRoutes = () => {
  const { locale } = useI18n();
  const { routes, loading } = useRoutes({ onlyMine: true, activeOnly: false });
  const { reservations, cancelReservation } = useReservations("driver-routes");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RouteRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [bookingsFor, setBookingsFor] = useState<RouteRow | null>(null);

  const stats = useMemo(() => {
    const active = routes.filter((r) => r.is_active);
    const seatsToday = active.reduce((s, r) => s + (r.seats_available ?? 0), 0);
    const pending = reservations.filter((r) => r.status === "pending").length;
    return { activeCount: active.length, seatsToday, pending };
  }, [routes, reservations]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (r: RouteRow) => {
    setEditing(r);
    setForm({
      origin_address: r.origin_address,
      destination_address: r.destination_address,
      city: r.city ?? "",
      departure_time: r.departure_time?.slice(0, 5) || "08:00",
      days_of_week: r.days_of_week ?? [],
      seats_total: r.seats_total,
      price_per_seat: Number(r.price_per_seat),
      notes: r.notes ?? "",
    });
    setFormOpen(true);
  };

  const toggleDay = (k: string) => {
    setForm((f) => ({
      ...f,
      days_of_week: f.days_of_week.includes(k)
        ? f.days_of_week.filter((d) => d !== k)
        : [...f.days_of_week, k],
    }));
  };

  const save = async () => {
    if (!form.origin_address.trim() || !form.destination_address.trim()) {
      toast.error(locale === "ar" ? "أدخل نقطة الانطلاق والوصول" : "Origin and destination required");
      return;
    }
    if (form.days_of_week.length === 0) {
      toast.error(locale === "ar" ? "اختر يوماً واحداً على الأقل" : "Pick at least one day");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { data: driver } = await supabase.from("drivers").select("id").eq("user_id", user.id).maybeSingle();
      if (!driver) throw new Error("driver profile missing");

      const payload = {
        driver_id: driver.id,
        origin_address: form.origin_address.trim(),
        destination_address: form.destination_address.trim(),
        city: form.city.trim() || null,
        departure_time: form.departure_time,
        days_of_week: form.days_of_week,
        seats_total: form.seats_total,
        price_per_seat: form.price_per_seat,
        notes: form.notes.trim() || null,
      };

      if (editing) {
        const { error } = await supabase.from("routes").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success(locale === "ar" ? "تم التحديث" : "Updated");
      } else {
        const { error } = await supabase.from("routes").insert({ ...payload, seats_available: form.seats_total });
        if (error) throw error;
        toast.success(locale === "ar" ? "تمت إضافة الرحلة" : "Route created");
      }
      setFormOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (r: RouteRow) => {
    const { error } = await supabase.from("routes").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) toast.error(error.message);
    else toast.success(!r.is_active ? (locale === "ar" ? "تم التفعيل" : "Activated") : (locale === "ar" ? "تم التعطيل" : "Disabled"));
  };

  const remove = async (r: RouteRow) => {
    if (!confirm(locale === "ar" ? "حذف هذه الرحلة؟" : "Delete this route?")) return;
    const { error } = await supabase.from("routes").delete().eq("id", r.id);
    if (error) toast.error(error.message);
    else toast.success(locale === "ar" ? "تم الحذف" : "Deleted");
  };

  const routeBookings = useMemo(
    () => (bookingsFor ? reservations.filter((r) => r.route_id === bookingsFor.id) : []),
    [reservations, bookingsFor]
  );

  const confirmBooking = async (id: string) => {
    const { error } = await supabase.from("reservations").update({ status: "confirmed" }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(locale === "ar" ? "تم التأكيد" : "Confirmed");
  };

  const T = (ar: string, fr: string, en: string) =>
    locale === "ar" ? ar : locale === "fr" ? fr : en;

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {T("رحلاتي المنتظمة", "Mes trajets réguliers", "My regular routes")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {T("أدر خطوط سيرك وحجوزاتها", "Gérez vos lignes et réservations", "Manage your lines and bookings")}
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            {T("إضافة رحلة", "Ajouter", "Add route")}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">{T("رحلات نشطة", "Actives", "Active")}</div>
            <div className="text-2xl font-bold text-foreground">{stats.activeCount}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">{T("مقاعد متاحة", "Places dispo", "Seats free")}</div>
            <div className="text-2xl font-bold text-primary">{stats.seatsToday}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">{T("حجوزات معلقة", "En attente", "Pending")}</div>
            <div className="text-2xl font-bold text-amber-500">{stats.pending}</div>
          </Card>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : routes.length === 0 ? (
          <Card className="p-8 text-center">
            <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">
              {T("لا توجد رحلات بعد. أضف أول خط سير.", "Aucun trajet. Ajoutez-en un.", "No routes yet. Add your first.")}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {routes.map((r) => {
              const pending = reservations.filter((x) => x.route_id === r.id && x.status === "pending").length;
              return (
                <Card key={r.id} className={`p-4 ${!r.is_active ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {r.route_code || r.id.slice(0, 8)}
                        </Badge>
                        {!r.is_active && (
                          <Badge variant="secondary">{T("معطلة", "Désactivée", "Disabled")}</Badge>
                        )}
                        {pending > 0 && (
                          <Badge className="bg-amber-500 text-white">{pending} {T("جديدة", "nouvelles", "new")}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-foreground font-medium">
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate">{r.origin_address}</span>
                        <span className="text-muted-foreground">←</span>
                        <span className="truncate">{r.destination_address}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {r.departure_time?.slice(0, 5)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {r.seats_available}/{r.seats_total} {T("مقعد", "places", "seats")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Ticket className="w-3 h-3" />
                          {r.price_per_seat} {r.currency}
                        </span>
                        <span>{(r.days_of_week ?? []).join(" · ")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => setBookingsFor(r)}>
                        <Users className="w-3.5 h-3.5 mr-1" />
                        {T("الحجوزات", "Réservations", "Bookings")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleActive(r)}>
                        <Power className={`w-3.5 h-3.5 ${r.is_active ? "text-emerald-500" : "text-muted-foreground"}`} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(r)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? T("تعديل الرحلة", "Modifier", "Edit route") : T("رحلة جديدة", "Nouveau trajet", "New route")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{T("من", "Départ", "From")}</Label>
              <Input value={form.origin_address} onChange={(e) => setForm({ ...form, origin_address: e.target.value })} placeholder="Tanger" />
            </div>
            <div>
              <Label>{T("إلى", "Arrivée", "To")}</Label>
              <Input value={form.destination_address} onChange={(e) => setForm({ ...form, destination_address: e.target.value })} placeholder="Tétouan" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{T("المدينة", "Ville", "City")}</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Tanger" />
              </div>
              <div>
                <Label>{T("وقت الانطلاق", "Heure", "Departure")}</Label>
                <Input type="time" value={form.departure_time} onChange={(e) => setForm({ ...form, departure_time: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>{T("الأيام", "Jours", "Days")}</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {DAYS.map((d) => {
                  const on = form.days_of_week.includes(d.key);
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => toggleDay(d.key)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                        on
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-foreground border-border hover:bg-secondary/70"
                      }`}
                    >
                      {d.label[locale as keyof typeof d.label] ?? d.label.en}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{T("عدد المقاعد", "Places", "Seats")}</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={form.seats_total}
                  onChange={(e) => setForm({ ...form, seats_total: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>{T("سعر المقعد", "Prix / place", "Price / seat")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.price_per_seat}
                  onChange={(e) => setForm({ ...form, price_per_seat: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label>{T("ملاحظات", "Notes", "Notes")}</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              {T("إلغاء", "Annuler", "Cancel")}
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {T("حفظ", "Enregistrer", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bookings dialog */}
      <Dialog open={!!bookingsFor} onOpenChange={(o) => !o && setBookingsFor(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {T("حجوزات الرحلة", "Réservations", "Bookings")} — {bookingsFor?.route_code}
            </DialogTitle>
          </DialogHeader>
          {routeBookings.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              {T("لا توجد حجوزات بعد", "Aucune réservation", "No bookings yet")}
            </div>
          ) : (
            <div className="space-y-2">
              {routeBookings.map((b) => (
                <Card key={b.id} className="p-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{b.reservation_code}</span>
                      <Badge
                        variant={
                          b.status === "confirmed"
                            ? "default"
                            : b.status === "cancelled"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {b.status}
                      </Badge>
                      <Badge variant="outline">
                        {b.payment_status}
                      </Badge>
                    </div>
                    <div className="text-sm text-foreground mt-1">
                      {b.seats_reserved} {T("مقعد", "places", "seats")} · {b.total_price} {b.currency} · {b.travel_date}
                    </div>
                    {b.pickup_address && (
                      <div className="text-xs text-muted-foreground truncate">📍 {b.pickup_address}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {b.status === "pending" && (
                      <Button size="sm" onClick={() => confirmBooking(b.id)}>
                        {T("تأكيد", "Confirmer", "Confirm")}
                      </Button>
                    )}
                    {b.status !== "cancelled" && (
                      <Button size="sm" variant="outline" onClick={() => cancelReservation(b.id)}>
                        {T("إلغاء", "Annuler", "Cancel")}
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverMyRoutes;
