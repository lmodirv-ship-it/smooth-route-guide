import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, Phone, Globe, MapPin, Clock, Sparkles, ImageOff, UtensilsCrossed, Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

type RichProspect = {
  id: string;
  name: string;
  phone: string;
  city: string;
  category: string;
  rating: number;
  user_ratings_total: number | null;
  website: string | null;
  photo_url: string | null;
  photos: { url: string; thumb: string }[] | null;
  opening_hours: { weekday_text?: string[]; open_now?: boolean } | null;
  description: string | null;
  price_level: number | null;
  business_status: string | null;
  enriched_at: string | null;
  address: string;
};

const categoryEmoji: Record<string, string> = {
  restaurant: "🍽️", cafe: "☕", bakery: "🥐", grocery_or_supermarket: "🛒",
  pharmacy: "💊", clothing_store: "👗", electronics_store: "📱", florist: "💐",
  store: "🏬", courier: "📦", moving_company: "🚚",
};

export default function ProspectsGallery() {
  const [items, setItems] = useState<RichProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyWithPhotos, setOnlyWithPhotos] = useState(true);
  const [selected, setSelected] = useState<RichProspect | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [enriching, setEnriching] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("prospects")
      .select("id,name,phone,city,category,rating,user_ratings_total,website,photo_url,photos,opening_hours,description,price_level,business_status,enriched_at,address")
      .order("rating", { ascending: false })
      .limit(200);
    if (onlyWithPhotos) q = q.not("photo_url", "is", null);
    const { data, error } = await q;
    if (error) toast.error("خطأ في التحميل");
    else setItems((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, [onlyWithPhotos]);

  const filtered = useMemo(() => {
    if (!search) return items;
    const s = search.toLowerCase();
    return items.filter(p => `${p.name} ${p.city} ${p.category} ${p.address}`.toLowerCase().includes(s));
  }, [items, search]);

  const openDetail = async (p: RichProspect) => {
    setSelected(p);
    setPhotoIdx(0);
    const { data } = await supabase
      .from("prospect_menu_items")
      .select("*")
      .eq("prospect_id", p.id)
      .order("sort_order", { ascending: true });
    setMenuItems(data || []);
  };

  const enrichBatch = async () => {
    setEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-prospects", { body: { limit: 50 } });
      if (error) throw error;
      toast.success(`تم إثراء ${data?.enriched || 0} شريك`);
      load();
    } catch (e: any) {
      toast.error("فشل الإثراء: " + (e.message || ""));
    } finally {
      setEnriching(false);
    }
  };

  const stats = useMemo(() => ({
    total: items.length,
    withPhotos: items.filter(p => p.photo_url).length,
    enriched: items.filter(p => p.enriched_at).length,
    avgRating: items.length ? (items.reduce((s, p) => s + (p.rating || 0), 0) / items.length).toFixed(1) : "0",
  }), [items]);

  return (
    <div dir="rtl" className="space-y-4">
      {/* Header & stats */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          <Badge variant="secondary" className="text-sm py-1 px-3">📊 {stats.total} شريك</Badge>
          <Badge variant="secondary" className="text-sm py-1 px-3 bg-green-500/10 text-green-700">📸 {stats.withPhotos} بصور</Badge>
          <Badge variant="secondary" className="text-sm py-1 px-3 bg-blue-500/10 text-blue-700">✨ {stats.enriched} مُثرى</Badge>
          <Badge variant="secondary" className="text-sm py-1 px-3 bg-yellow-500/10 text-yellow-700">⭐ {stats.avgRating}</Badge>
        </div>
        <Button onClick={enrichBatch} disabled={enriching} variant="default" className="gap-2">
          {enriching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          إثراء 50 شريك (صور + بيانات)
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ابحث بالاسم، المدينة، الفئة..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10" />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={onlyWithPhotos} onChange={e => setOnlyWithPhotos(e.target.checked)} />
          فقط الذين لديهم صور
        </label>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-16"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          لا توجد بيانات بعد. اضغط "إثراء" لجلب الصور والبيانات من Google.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.4) }}
            >
              <Card
                className="group overflow-hidden cursor-pointer hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/40"
                onClick={() => openDetail(p)}
              >
                {/* Image */}
                <div className="relative h-44 bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
                  {p.photo_url ? (
                    <img
                      src={p.photo_url}
                      alt={p.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl opacity-40">
                      {categoryEmoji[p.category] || "🏪"}
                    </div>
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                  {/* Top badges */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    {p.business_status === "OPERATIONAL" && (
                      <Badge className="bg-green-500/90 text-white text-[10px] backdrop-blur">نشط</Badge>
                    )}
                    {p.opening_hours?.open_now && (
                      <Badge className="bg-emerald-500/90 text-white text-[10px] backdrop-blur">مفتوح الآن</Badge>
                    )}
                  </div>

                  {/* Rating */}
                  {p.rating > 0 && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 text-yellow-400 text-xs px-2 py-1 rounded-full backdrop-blur">
                      <Star className="w-3 h-3 fill-yellow-400" />
                      <span className="font-bold">{p.rating.toFixed(1)}</span>
                      {p.user_ratings_total ? <span className="text-white/70">({p.user_ratings_total})</span> : null}
                    </div>
                  )}

                  {/* Bottom title */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="flex items-center gap-1 text-white text-xs mb-1 opacity-90">
                      <span>{categoryEmoji[p.category] || "🏪"}</span>
                      <span>{p.category}</span>
                      {p.price_level ? <span>· {"💵".repeat(p.price_level)}</span> : null}
                    </div>
                    <h3 className="text-white font-bold text-sm leading-tight line-clamp-2 drop-shadow-lg">
                      {p.name}
                    </h3>
                  </div>
                </div>

                {/* Body */}
                <div className="p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{p.city}</span>
                  </div>
                  {p.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3 shrink-0" />
                      <span className="truncate" dir="ltr">{p.phone}</span>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <span>{categoryEmoji[selected.category] || "🏪"}</span>
                  {selected.name}
                  {selected.rating > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 ml-1" />
                      {selected.rating.toFixed(1)} ({selected.user_ratings_total || 0})
                    </Badge>
                  )}
                </DialogTitle>
              </DialogHeader>

              {/* Photo gallery */}
              {selected.photos && selected.photos.length > 0 && (
                <div className="relative">
                  <img
                    src={selected.photos[photoIdx]?.url || selected.photo_url || ""}
                    alt={selected.name}
                    className="w-full h-72 object-cover rounded-lg"
                  />
                  {selected.photos.length > 1 && (
                    <>
                      <Button
                        size="icon" variant="secondary"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
                        onClick={() => setPhotoIdx((photoIdx + 1) % selected.photos!.length)}
                      ><ChevronRight /></Button>
                      <Button
                        size="icon" variant="secondary"
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full"
                        onClick={() => setPhotoIdx((photoIdx - 1 + selected.photos!.length) % selected.photos!.length)}
                      ><ChevronLeft /></Button>
                      <div className="flex gap-1.5 mt-2 overflow-x-auto pb-2">
                        {selected.photos.map((ph, i) => (
                          <img
                            key={i}
                            src={ph.thumb}
                            alt=""
                            onClick={() => setPhotoIdx(i)}
                            className={`h-14 w-20 object-cover rounded cursor-pointer shrink-0 ${i === photoIdx ? "ring-2 ring-primary" : "opacity-70"}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {selected.address && (
                  <div className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" /><span>{selected.address}</span></div>
                )}
                {selected.phone && (
                  <a href={`tel:${selected.phone}`} className="flex items-center gap-2 hover:text-primary"><Phone className="w-4 h-4 text-primary" /><span dir="ltr">{selected.phone}</span></a>
                )}
                {selected.website && (
                  <a href={selected.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-primary truncate"><Globe className="w-4 h-4 text-primary" /><span className="truncate">{selected.website}</span></a>
                )}
                {selected.opening_hours?.weekday_text && (
                  <div className="md:col-span-2 flex items-start gap-2">
                    <Clock className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                    <div className="text-xs space-y-0.5">
                      {selected.opening_hours.weekday_text.map((d, i) => <div key={i}>{d}</div>)}
                    </div>
                  </div>
                )}
              </div>

              {selected.description && (
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">{selected.description}</p>
              )}

              {/* Menu */}
              <div>
                <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4" />
                  قائمة الأطعمة والأسعار ({menuItems.length})
                </h4>
                {menuItems.length === 0 ? (
                  <div className="text-xs text-muted-foreground bg-muted/30 p-4 rounded-lg text-center">
                    لا توجد أطعمة مسجلة بعد. أضف يدوياً أو شغّل سحب القائمة.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {menuItems.map((m: any) => (
                      <Card key={m.id} className="p-2 flex gap-2">
                        {m.image_url ? (
                          <img src={m.image_url} alt={m.name} className="w-14 h-14 rounded object-cover" />
                        ) : (
                          <div className="w-14 h-14 rounded bg-muted flex items-center justify-center"><ImageOff className="w-5 h-5 opacity-40" /></div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate">{m.name}</div>
                          {m.price && <div className="text-xs text-primary font-bold">{m.price} {m.currency || "MAD"}</div>}
                          {m.category && <div className="text-[10px] text-muted-foreground">{m.category}</div>}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
