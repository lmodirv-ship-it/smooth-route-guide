import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface Ad {
  id: string;
  slot_number: number;
  title: string;
  content_type: string;
  content_text: string | null;
  image_url: string | null;
  link_url: string | null;
  duration_seconds: number;
  is_active: boolean;
  sort_order: number;
  start_date: string | null;
  end_date: string | null;
}

const isAdScheduledNow = (ad: Ad): boolean => {
  const now = new Date();
  if (ad.start_date && new Date(ad.start_date) > now) return false;
  if (ad.end_date && new Date(ad.end_date) < now) return false;
  return true;
};

const AdSlot = ({ ads, slotNumber }: { ads: Ad[]; slotNumber: number }) => {
  const slotAds = ads
    .filter(a => a.slot_number === slotNumber && a.is_active && isAdScheduledNow(a))
    .sort((a, b) => a.sort_order - b.sort_order);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (slotAds.length <= 1) return;
    const current = slotAds[currentIndex % slotAds.length];
    const duration = (current?.duration_seconds || 5) * 1000;
    const timer = setTimeout(() => setCurrentIndex(i => (i + 1) % slotAds.length), duration);
    return () => clearTimeout(timer);
  }, [currentIndex, slotAds.length]);

  const current = slotAds.length > 0 ? slotAds[currentIndex % slotAds.length] : null;

  const content = current ? (
    <AnimatePresence mode="wait">
      <motion.div
        key={current.id + currentIndex}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.5 }}
        className="w-full h-full flex items-center justify-center"
      >
        {current.content_type === "image" && current.image_url ? (
          current.link_url ? (
            <a href={current.link_url} target="_blank" rel="noopener noreferrer" className="w-full h-full">
              <img src={current.image_url} alt={current.title} className="w-full h-full object-cover rounded-lg" />
            </a>
          ) : (
            <img src={current.image_url} alt={current.title} className="w-full h-full object-cover rounded-lg" />
          )
        ) : (
          <div className="text-center space-y-2">
            {current.title && <h4 className="text-sm font-bold text-foreground">{current.title}</h4>}
            {current.content_text && <p className="text-xs text-muted-foreground leading-relaxed">{current.content_text}</p>}
            {current.link_url && (
              <a href={current.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                المزيد →
              </a>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  ) : (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center space-y-1">
        <span className="text-2xl">📺</span>
        <p className="text-xs text-muted-foreground/50">Ad {slotNumber}</p>
      </div>
    </div>
  );

  return (
    <div className="relative group" style={{ perspective: "800px" }}>
      {/* Outer 3D box shadow layers */}
      <div className="absolute inset-0 rounded-2xl bg-primary/10 translate-x-3 translate-y-3 blur-[1px]" />
      <div className="absolute inset-0 rounded-2xl bg-primary/5 translate-x-5 translate-y-5 blur-[2px]" />

      {/* Outer frame */}
      <div className="relative rounded-2xl p-[3px] bg-gradient-to-br from-primary/60 via-primary/20 to-primary/60 shadow-[0_8px_32px_hsl(var(--primary)/0.2),inset_0_1px_0_hsl(var(--primary)/0.3)] group-hover:shadow-[0_12px_48px_hsl(var(--primary)/0.35)] transition-all duration-500"
        style={{ transform: "rotateX(2deg) rotateY(-1deg)", transformStyle: "preserve-3d" }}>

        {/* Inner frame with depth */}
        <div className="rounded-xl p-[3px] bg-gradient-to-br from-card via-background to-card">
          <div className="relative rounded-lg border border-border/60 bg-card/90 backdrop-blur-sm overflow-hidden aspect-video min-h-[200px] shadow-[inset_0_2px_8px_rgba(0,0,0,0.3),inset_0_-1px_4px_hsl(var(--primary)/0.1)]">
            {/* Screen glare */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none z-[2]" />
            <div className="absolute top-0 left-0 right-0 h-[30%] bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none z-[2]" />

            {/* Dots indicator */}
            {slotAds.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {slotAds.map((_, i) => (
                  <span key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${i === (currentIndex % slotAds.length) ? "bg-primary scale-125 shadow-[0_0_6px_hsl(var(--primary)/0.6)]" : "bg-muted-foreground/30"}`} />
                ))}
              </div>
            )}
            {content}
          </div>
        </div>
      </div>

      {/* Bottom "stand" */}
      <div className="mx-auto w-[40%] h-1.5 rounded-b-full bg-gradient-to-r from-transparent via-primary/20 to-transparent mt-1" />
    </div>
  );
};

const AdsSection = () => {
  const [ads, setAds] = useState<Ad[]>([]);

  const loadAds = useCallback(async () => {
    const { data } = await supabase.from("ads").select("*");
    if (data) setAds(data as unknown as Ad[]);
  }, []);

  useEffect(() => {
    loadAds();
    const channel = supabase
      .channel("ads-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "ads" }, loadAds)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadAds]);

  return (
    <section className="py-20 relative overflow-hidden" id="ads-section">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/20 to-background" />
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold font-display">
            <span className="text-gradient-primary glow-text">📺 شاشات إعلانية</span>
          </h2>
          <p className="text-muted-foreground mt-2">Advertising Screens</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {[1, 2, 3, 4].map(slot => (
            <AdSlot key={slot} ads={ads} slotNumber={slot} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default AdsSection;
