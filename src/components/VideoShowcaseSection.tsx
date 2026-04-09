import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, Car, Package, Smartphone } from "lucide-react";
import { useI18n } from "@/i18n/context";
import promoHn from "@/assets/promo-video-hn.mp4";
import promoDelivery from "@/assets/promo-video-delivery.mp4";
import promoRide from "@/assets/promo-video-ride-youtube.mp4";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.15, duration: 0.6 } }),
};

interface VideoCardProps {
  src: string;
  title: string;
  desc: string;
  icon: React.ElementType;
  iconColor: string;
  index: number;
}

const VideoCard = ({ src, title, desc, icon: Icon, iconColor, index }: VideoCardProps) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);

  const togglePlay = () => {
    if (!ref.current) return;
    if (ref.current.paused) { ref.current.play(); setPlaying(true); }
    else { ref.current.pause(); setPlaying(false); }
  };

  const toggleMute = () => {
    if (!ref.current) return;
    ref.current.muted = !ref.current.muted;
    setMuted(ref.current.muted);
  };

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeUp}
      custom={index + 1}
      className="group relative rounded-2xl overflow-hidden glass-card hover:border-primary/40 transition-all duration-500"
    >
      {/* Video */}
      <div className="relative aspect-video bg-black/50">
        <video
          ref={ref}
          src={src}
          className="w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

        {/* Controls */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10">
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-black/70 transition-all"
          >
            {playing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
          </button>
          <button
            onClick={toggleMute}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-black/70 transition-all"
          >
            {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
};

const VideoShowcaseSection = () => {
  const { dir } = useI18n();

  const videos = [
    {
      src: promoHn,
      title: dir === "rtl" ? "منصة HN Driver" : "HN Driver Platform",
      desc: dir === "rtl" ? "اكتشف المنصة الأقوى للنقل والتوصيل في طنجة — تسجيل سهل، رحلة أولى مجانية، وخدمة 24/7" : "Discover the most powerful ride & delivery platform in Tangier",
      icon: Smartphone,
      iconColor: "bg-primary/20 text-primary",
    },
    {
      src: promoDelivery,
      title: dir === "rtl" ? "خدمة التوصيل السريع" : "Express Delivery",
      desc: dir === "rtl" ? "توصيل الطلبات من المطاعم والمتاجر في أقل من 30 دقيقة — عمولة 0% للسائقين الجدد" : "Orders delivered from restaurants & stores in under 30 minutes",
      icon: Package,
      iconColor: "bg-success/20 text-success",
    },
    {
      src: promoRide,
      title: dir === "rtl" ? "خدمة النقل الخاص" : "Private Rides",
      desc: dir === "rtl" ? "سيارة خاصة بأسعار منافسة — احجز رحلتك الآن واحصل على رصيد 50 درهم" : "Private car at competitive prices — book now & get 50 MAD credit",
      icon: Car,
      iconColor: "bg-info/20 text-info",
    },
  ];

  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/10 to-background" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="text-center mb-14"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.2em] border border-primary/30 text-primary bg-primary/5 mb-4">
            {dir === "rtl" ? "شاهد بالفيديو" : "Watch Videos"}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-3">
            <span className="text-gradient-primary">
              {dir === "rtl" ? "شوف كيفاش خدامة HN Driver" : "See HN Driver in Action"}
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {dir === "rtl"
              ? "مقاطع قصيرة تعرّفك على خدماتنا — النقل، التوصيل، والمنصة الكاملة"
              : "Short clips showcasing our services — rides, delivery, and the full platform"}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {videos.map((v, i) => (
            <VideoCard key={i} {...v} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default VideoShowcaseSection;
