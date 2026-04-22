import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Car, Store, Clock, Star, ArrowRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageMeta from "@/components/PageMeta";
import { trackEvent } from "@/components/TrackingScripts";

interface CityInfo {
  slug: string;
  name_ar: string;
  name_en: string;
  country: string;
  population: string;
  description_ar: string;
  description_en: string;
  zones: string[];
}

// Static city data — easy to extend
const CITIES: Record<string, CityInfo> = {
  tangier: {
    slug: "tangier",
    name_ar: "طنجة",
    name_en: "Tangier",
    country: "Morocco",
    population: "1,065,000",
    description_ar: "خدمة نقل وتوصيل احترافية في طنجة. سائقون متاحون 24/7 في كل أحياء المدينة.",
    description_en: "Professional ride and delivery service in Tangier. Drivers available 24/7 across all neighborhoods.",
    zones: ["المركز", "مالاباطا", "بني مكادة", "كاب سبارتيل", "إبردا", "الشرف"],
  },
  casablanca: {
    slug: "casablanca",
    name_ar: "الدار البيضاء",
    name_en: "Casablanca",
    country: "Morocco",
    population: "3,360,000",
    description_ar: "أكبر مدن المغرب. تغطية شاملة لجميع الأحياء بأسعار تنافسية.",
    description_en: "Largest city in Morocco. Full coverage across all neighborhoods at competitive prices.",
    zones: ["المعاريف", "عين الذياب", "بوسكورة", "الحي الحسني", "سيدي مومن", "كاليفورنيا"],
  },
  rabat: {
    slug: "rabat",
    name_ar: "الرباط",
    name_en: "Rabat",
    country: "Morocco",
    population: "1,932,000",
    description_ar: "العاصمة المغربية. خدمات نقل وتوصيل سريعة وآمنة.",
    description_en: "The Moroccan capital. Fast and safe ride and delivery services.",
    zones: ["أكدال", "حسان", "الرياض", "السويسي", "يعقوب المنصور", "تمارة"],
  },
  marrakech: {
    slug: "marrakech",
    name_ar: "مراكش",
    name_en: "Marrakech",
    country: "Morocco",
    population: "928,000",
    description_ar: "المدينة الحمراء. خدمة موجهة للسياح والمقيمين.",
    description_en: "The Red City. Service tailored for tourists and residents.",
    zones: ["جامع الفنا", "كليز", "النخيل", "حي محمد السادس", "الحوز"],
  },
  paris: {
    slug: "paris",
    name_ar: "باريس",
    name_en: "Paris",
    country: "France",
    population: "2,165,000",
    description_ar: "خدمة موجهة للجالية المغربية والعربية في باريس وضواحيها.",
    description_en: "Service for Moroccan and Arab community in Paris and suburbs.",
    zones: ["18ème", "19ème", "20ème", "Saint-Denis", "Aubervilliers", "Bobigny"],
  },
  brussels: {
    slug: "brussels",
    name_ar: "بروكسل",
    name_en: "Brussels",
    country: "Belgium",
    population: "1,222,000",
    description_ar: "خدمة للجالية في بروكسل والمناطق المحيطة.",
    description_en: "Service for the community in Brussels and surrounding areas.",
    zones: ["Molenbeek", "Schaerbeek", "Anderlecht", "Saint-Josse", "Forest"],
  },
  dubai: {
    slug: "dubai",
    name_ar: "دبي",
    name_en: "Dubai",
    country: "UAE",
    population: "3,490,000",
    description_ar: "خدمة فاخرة في دبي. سائقون محترفون وسيارات حديثة.",
    description_en: "Premium service in Dubai. Professional drivers and modern vehicles.",
    zones: ["Downtown", "Marina", "JBR", "Deira", "Bur Dubai", "Business Bay"],
  },
  riyadh: {
    slug: "riyadh",
    name_ar: "الرياض",
    name_en: "Riyadh",
    country: "Saudi Arabia",
    population: "7,231,000",
    description_ar: "خدمة شاملة في عاصمة المملكة العربية السعودية.",
    description_en: "Comprehensive service in the capital of Saudi Arabia.",
    zones: ["العليا", "الملز", "النخيل", "الياسمين", "الورود", "الملقا"],
  },
};

export const CITY_LIST = Object.values(CITIES);

const CityPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [city, setCity] = useState<CityInfo | null>(null);

  useEffect(() => {
    if (slug && CITIES[slug]) {
      setCity(CITIES[slug]);
      trackEvent("ViewContent", { content_name: `City: ${CITIES[slug].name_en}`, content_category: "city_landing" });
    }
  }, [slug]);

  if (!city) return (
    <div className="min-h-screen gradient-dark flex items-center justify-center" dir="rtl">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">المدينة غير موجودة</h1>
        <Link to="/cities" className="text-primary">عرض جميع المدن</Link>
      </div>
    </div>
  );

  // JSON-LD for local business
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": `HN Driver ${city.name_en}`,
    "description": city.description_en,
    "address": { "@type": "PostalAddress", "addressLocality": city.name_en, "addressCountry": city.country },
    "areaServed": city.name_en,
    "priceRange": "$$",
  };

  return (
    <div className="min-h-screen gradient-dark" dir="rtl">
      <PageMeta
        title={`HN Driver ${city.name_ar} - خدمة نقل وتوصيل في ${city.name_ar}`}
        description={city.description_ar}
        keywords={`${city.name_ar}, ${city.name_en}, taxi ${city.name_en}, نقل ${city.name_ar}, توصيل ${city.name_ar}`}
      />
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>

      <section className="relative px-6 pt-16 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto text-center">
          <MapPin className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
            HN Driver في <span className="text-primary">{city.name_ar}</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-2">{city.description_ar}</p>
          <p className="text-sm text-muted-foreground">{city.country} • {city.population} نسمة</p>
        </motion.div>
      </section>

      <section className="px-6 pb-12">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to={`/auth/client?ref=city-${city.slug}`}>
            <div className="glass-card rounded-2xl p-6 hover:border-primary transition-all cursor-pointer">
              <Car className="w-10 h-10 text-primary mb-3" />
              <h2 className="text-xl font-bold text-foreground mb-2">احجز رحلة في {city.name_ar}</h2>
              <p className="text-sm text-muted-foreground mb-4">سائقون محترفون متاحون فوراً</p>
              <div className="flex items-center text-primary text-sm font-bold">
                ابدأ الآن <ArrowRight className="w-4 h-4 mr-1" />
              </div>
            </div>
          </Link>
          <Link to={`/delivery?ref=city-${city.slug}`}>
            <div className="glass-card rounded-2xl p-6 hover:border-warning transition-all cursor-pointer">
              <Store className="w-10 h-10 text-warning mb-3" />
              <h2 className="text-xl font-bold text-foreground mb-2">اطلب توصيل في {city.name_ar}</h2>
              <p className="text-sm text-muted-foreground mb-4">مطاعم ومتاجر بالقرب منك</p>
              <div className="flex items-center text-warning text-sm font-bold">
                تصفح <ArrowRight className="w-4 h-4 mr-1" />
              </div>
            </div>
          </Link>
        </div>
      </section>

      <section className="px-6 py-12 bg-secondary/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">المناطق المخدومة في {city.name_ar}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {city.zones.map(z => (
              <div key={z} className="glass-card rounded-xl p-4 text-center">
                <MapPin className="w-4 h-4 text-primary mx-auto mb-2" />
                <span className="text-sm text-foreground">{z}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="glass-card rounded-xl p-4">
            <Clock className="w-6 h-6 text-info mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">متاح</p>
            <p className="font-bold text-foreground text-sm">24/7</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <Star className="w-6 h-6 text-warning mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">تقييم</p>
            <p className="font-bold text-foreground text-sm">4.8/5</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <Car className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">سائقون</p>
            <p className="font-bold text-foreground text-sm">+200</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <Phone className="w-6 h-6 text-success mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">دعم</p>
            <p className="font-bold text-foreground text-sm">فوري</p>
          </div>
        </div>
      </section>

      <section className="px-6 py-12 text-center">
        <Link to="/cities">
          <Button variant="outline" className="bg-secondary border-border">عرض جميع المدن</Button>
        </Link>
      </section>
    </div>
  );
};

export default CityPage;
