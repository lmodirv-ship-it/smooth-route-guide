import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Globe, ArrowRight } from "lucide-react";
import PageMeta from "@/components/PageMeta";
import { CITY_LIST } from "./CityPage";

const CitiesIndex = () => {
  // Group by country
  const grouped = CITY_LIST.reduce((acc, c) => {
    (acc[c.country] = acc[c.country] || []).push(c);
    return acc;
  }, {} as Record<string, typeof CITY_LIST>);

  return (
    <div className="min-h-screen gradient-dark px-6 py-10" dir="rtl">
      <PageMeta
        title="مدن HN Driver - خدمة نقل وتوصيل في 8 مدن عالمية"
        description="اكتشف مدن HN Driver: طنجة، الدار البيضاء، الرباط، مراكش، باريس، بروكسل، دبي، الرياض. خدمة نقل وتوصيل محترفة في كل مدينة."
      />

      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <Globe className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-foreground mb-3">المدن المخدومة</h1>
          <p className="text-muted-foreground">{CITY_LIST.length} مدينة في {Object.keys(grouped).length} دول</p>
        </motion.div>

        <div className="space-y-8">
          {Object.entries(grouped).map(([country, cities]) => (
            <div key={country}>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" /> {country}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {cities.map(c => (
                  <Link key={c.slug} to={`/city/${c.slug}`}>
                    <motion.div whileHover={{ scale: 1.02 }}
                      className="glass-card rounded-xl p-4 cursor-pointer hover:border-primary transition-all">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-foreground">{c.name_ar}</h3>
                          <p className="text-xs text-muted-foreground">{c.name_en} • {c.population}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-primary" />
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CitiesIndex;
