import { motion } from "framer-motion";
import { useI18n } from "@/i18n/context";
import { Headphones, DollarSign, Globe, MapPin, Shield, Users } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.6, ease: "easeOut" as const } }),
};

const TANGIER_CENTER: [number, number] = [35.7595, -5.834];

const coverageZones = [
  { name: "وسط المدينة", nameEn: "City Center", nameFr: "Centre-ville", nameEs: "Centro", lat: 35.7795, lng: -5.8135, radius: 2500, color: "hsl(32, 95%, 55%)" },
  { name: "مرجان", nameEn: "Marjane", nameFr: "Marjane", nameEs: "Marjane", lat: 35.7550, lng: -5.8050, radius: 1800, color: "hsl(205, 78%, 56%)" },
  { name: "ابن بطوطة", nameEn: "Ibn Battouta", nameFr: "Ibn Battouta", nameEs: "Ibn Battouta", lat: 35.7350, lng: -5.9000, radius: 2000, color: "hsl(142, 71%, 45%)" },
  { name: "مالاباطا", nameEn: "Malabata", nameFr: "Malabata", nameEs: "Malabata", lat: 35.7900, lng: -5.7800, radius: 1500, color: "hsl(280, 60%, 55%)" },
  { name: "بني مكادة", nameEn: "Beni Makada", nameFr: "Beni Makada", nameEs: "Beni Makada", lat: 35.7450, lng: -5.8300, radius: 2200, color: "hsl(0, 80%, 55%)" },
];

export default function TangierSocialProof() {
  const { t, dir, locale } = useI18n();
  const lt = t.landing;

  const features = [
    { icon: Headphones, title: lt.socialProof1Title, desc: lt.socialProof1Desc, color: "text-info" },
    { icon: DollarSign, title: lt.socialProof2Title, desc: lt.socialProof2Desc, color: "text-success" },
    { icon: Globe, title: lt.socialProof3Title, desc: lt.socialProof3Desc, color: "text-primary" },
    { icon: Shield, title: lt.socialProof4Title, desc: lt.socialProof4Desc, color: "text-[hsl(var(--warning))]" },
    { icon: Users, title: lt.socialProof5Title, desc: lt.socialProof5Desc, color: "text-destructive" },
    { icon: MapPin, title: lt.socialProof6Title, desc: lt.socialProof6Desc, color: "text-accent-foreground" },
  ];

  const getZoneName = (zone: typeof coverageZones[0]) => {
    if (locale === "ar") return zone.name;
    if (locale === "fr") return zone.nameFr;
    if (locale === "es") return zone.nameEs;
    return zone.nameEn;
  };

  return (
    <section className="py-20 md:py-28 relative overflow-hidden" id="social-proof">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/20 to-background" />
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.2em] border border-primary/30 text-primary bg-primary/5 mb-4">
            {lt.socialProofBadge}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-3">
            <span className="text-gradient-primary">{lt.socialProofTitle}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{lt.socialProofSubtitle}</p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
          {features.map((f, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1} className="group rounded-2xl p-6 glass-card hover:border-primary/30 transition-all duration-500">
              <div className={`w-14 h-14 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <f.icon className={`w-7 h-7 ${f.color}`} />
              </div>
              <h3 className="font-bold text-foreground mb-2 text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Coverage Map */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={7}>
          <h3 className="text-2xl md:text-3xl font-bold font-display text-center mb-8">
            <span className="text-gradient-primary">{lt.coverageMapTitle}</span>
          </h3>
          <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden border border-border shadow-lg shadow-primary/5" style={{ height: "400px" }}>
            <MapContainer center={TANGIER_CENTER} zoom={12} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }} attributionControl={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              {coverageZones.map((zone) => (
                <Circle key={zone.nameEn} center={[zone.lat, zone.lng]} radius={zone.radius} pathOptions={{ color: zone.color, fillColor: zone.color, fillOpacity: 0.2, weight: 2 }}>
                  <Popup>
                    <div className="text-center font-bold">{getZoneName(zone)}</div>
                  </Popup>
                </Circle>
              ))}
            </MapContainer>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">{lt.coverageMapDesc}</p>
        </motion.div>
      </div>
    </section>
  );
}
