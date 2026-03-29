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
}

const AdSlot = ({ ads, slotNumber }: { ads: Ad[]; slotNumber: number }) => {
  const slotAds = ads.filter(a => a.slot_number === slotNumber && a.is_active).sort((a, b) => a.sort_order - b.sort_order);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (slotAds.length <= 1) return;
    const current = slotAds[currentIndex];
    const duration = (current?.duration_seconds || 5) * 1000;
    const timer = setTimeout(() => setCurrentIndex(i => (i + 1) % slotAds.length), duration);
    return () => clearTimeout(timer);
  }, [currentIndex, slotAds.length]);

  const current = slotAds[currentIndex];

  const content = current ? (
    <AnimatePresence mode="wait">
      <motion.div
        key={current.id + currentIndex}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.5 }}
        className="w-full h-full flex items-center justify-center p-3"
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
      <span className="text-xs text-muted-foreground/50">AD {slotNumber}</span>
    </div>
  );

  return (
    <div className="relative group">
      {/* EDGE-style TV frame */}
      <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-br from-primary/40 via-primary/10 to-primary/40 opacity-60 group-hover:opacity-100 transition-opacity" />
      <div className="relative rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden aspect-video min-h-[140px] shadow-lg shadow-primary/5">
        {/* Screen glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        {/* Dot indicators */}
        {slotAds.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {slotAds.map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentIndex ? "bg-primary" : "bg-muted-foreground/30"}`} />
            ))}
          </div>
        )}
        {content}
      </div>
    </div>
  );
};

const AdsSection = () => {
  const [ads, setAds] = useState<Ad[]>([]);

  const loadAds = useCallback(async () => {
    const { data } = await supabase.from("ads" as any).select("*").eq("is_active", true);
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
    <section className="py-16 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/10 to-background" />
      <div className="container mx-auto px-4 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold font-display">
            <span className="text-gradient-primary glow-text">شاشات إعلانية</span>
          </h2>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {[1, 2, 3, 4].map(slot => (
            <motion.div key={slot} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: slot * 0.1 }}>
              <AdSlot ads={ads} slotNumber={slot} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AdsSection;
