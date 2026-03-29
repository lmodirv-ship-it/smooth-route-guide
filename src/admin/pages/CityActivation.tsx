import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Globe, Building2, MapPin, Search, ChevronRight, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type ZoneRow = {
  id: string;
  name_ar: string;
  name_fr: string;
  city: string;
  country: string;
  is_active: boolean;
  zone_code?: string | null;
};

const CityActivation = () => {
  const [zones, setZones] = useState<ZoneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);
  const [expandedCity, setExpandedCity] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchZones = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("zones")
      .select("id, name_ar, name_fr, city, country, is_active, zone_code")
      .order("country")
      .order("city")
      .order("name_ar");
    setZones((data as ZoneRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchZones(); }, []);

  const hierarchy = useMemo(() => {
    const map: Record<string, Record<string, ZoneRow[]>> = {};
    for (const z of zones) {
      const c = z.country || "غير محدد";
      const city = z.city || "غير محدد";
      if (!map[c]) map[c] = {};
      if (!map[c][city]) map[c][city] = [];
      map[c][city].push(z);
    }
    return map;
  }, [zones]);

  const filteredCountries = useMemo(() => {
    const countries = Object.keys(hierarchy).sort();
    if (!search.trim()) return countries;
    const s = search.toLowerCase();
    return countries.filter(c => {
      if (c.toLowerCase().includes(s)) return true;
      const cities = Object.keys(hierarchy[c]);
      return cities.some(city => city.toLowerCase().includes(s));
    });
  }, [hierarchy, search]);

  const toggleZone = async (zone: ZoneRow) => {
    setToggling(zone.id);
    const { error } = await supabase.from("zones").update({ is_active: !zone.is_active }).eq("id", zone.id);
    if (error) toast.error("خطأ في تحديث الحالة");
    else {
      setZones(prev => prev.map(z => z.id === zone.id ? { ...z, is_active: !z.is_active } : z));
      toast.success(zone.is_active ? "تم إلغاء التنشيط" : "تم التنشيط ✅");
    }
    setToggling(null);
  };

  const toggleCity = async (country: string, city: string, activate: boolean) => {
    const cityZones = hierarchy[country]?.[city] || [];
    const ids = cityZones.map(z => z.id);
    setToggling(`${country}-${city}`);
    const { error } = await supabase.from("zones").update({ is_active: activate }).in("id", ids);
    if (error) toast.error("خطأ في تحديث المدينة");
    else {
      setZones(prev => prev.map(z => ids.includes(z.id) ? { ...z, is_active: activate } : z));
      toast.success(activate ? `تم تنشيط ${city} ✅` : `تم إلغاء تنشيط ${city}`);
    }
    setToggling(null);
  };

  const toggleCountry = async (country: string, activate: boolean) => {
    const cities = hierarchy[country] || {};
    const ids = Object.values(cities).flat().map(z => z.id);
    setToggling(country);
    const { error } = await supabase.from("zones").update({ is_active: activate }).in("id", ids);
    if (error) toast.error("خطأ في تحديث الدولة");
    else {
      setZones(prev => prev.map(z => ids.includes(z.id) ? { ...z, is_active: activate } : z));
      toast.success(activate ? `تم تنشيط ${country} ✅` : `تم إلغاء تنشيط ${country}`);
    }
    setToggling(null);
  };

  const countActive = (items: ZoneRow[]) => items.filter(z => z.is_active).length;
  const totalActive = zones.filter(z => z.is_active).length;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-sm px-3 py-1">
          {totalActive} / {zones.length} منطقة نشطة
        </Badge>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">تنشيط المدن والمناطق</h1>
          <Globe className="w-6 h-6 text-primary" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-4 text-center">
          <Globe className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{filteredCountries.length}</p>
          <p className="text-xs text-muted-foreground">دولة</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <Building2 className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">
            {Object.values(hierarchy).reduce((sum, cities) => sum + Object.keys(cities).length, 0)}
          </p>
          <p className="text-xs text-muted-foreground">مدينة</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <MapPin className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{totalActive}</p>
          <p className="text-xs text-muted-foreground">منطقة نشطة</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="بحث عن دولة أو مدينة..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Hierarchy */}
      <div className="space-y-2">
        {filteredCountries.map(country => {
          const cities = hierarchy[country];
          const allZonesInCountry = Object.values(cities).flat();
          const activeCount = countActive(allZonesInCountry);
          const isExpanded = expandedCountry === country;
          const allActive = activeCount === allZonesInCountry.length;

          return (
            <div key={country} className="glass-card rounded-xl overflow-hidden">
              {/* Country row */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedCountry(isExpanded ? null : country)}
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={allActive}
                    disabled={toggling === country}
                    onCheckedChange={(val) => {
                      toggleCountry(country, val);
                    }}
                    onClick={e => e.stopPropagation()}
                  />
                  <Badge variant={activeCount > 0 ? "default" : "secondary"} className="text-xs">
                    {activeCount}/{allZonesInCountry.length}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  <span className="font-semibold text-foreground">{country}</span>
                  <Globe className="w-4 h-4 text-primary" />
                </div>
              </div>

              {/* Cities */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    {Object.keys(cities).sort().map(city => {
                      const cityZones = cities[city];
                      const cityActive = countActive(cityZones);
                      const cityExpanded = expandedCity === `${country}|${city}`;
                      const cityAllActive = cityActive === cityZones.length;

                      return (
                        <div key={city} className="border-t border-border/50">
                          {/* City row */}
                          <div
                            className="flex items-center justify-between px-8 py-3 cursor-pointer hover:bg-muted/20 transition-colors"
                            onClick={() => setExpandedCity(cityExpanded ? null : `${country}|${city}`)}
                          >
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={cityAllActive}
                                disabled={toggling === `${country}-${city}`}
                                onCheckedChange={(val) => toggleCity(country, city, val)}
                                onClick={e => e.stopPropagation()}
                              />
                              <Badge variant={cityActive > 0 ? "outline" : "secondary"} className="text-xs">
                                {cityActive}/{cityZones.length}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              {cityExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                              <span className="text-sm font-medium text-foreground">{city}</span>
                              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                          </div>

                          {/* Zones */}
                          <AnimatePresence>
                            {cityExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="overflow-hidden"
                              >
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="text-center w-20">الحالة</TableHead>
                                      <TableHead className="text-right">الرمز</TableHead>
                                      <TableHead className="text-right">المنطقة (عربي)</TableHead>
                                      <TableHead className="text-right">المنطقة (فرنسي)</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {cityZones.map(zone => (
                                      <TableRow key={zone.id} className={zone.is_active ? "" : "opacity-50"}>
                                        <TableCell className="text-center">
                                          <Switch
                                            checked={zone.is_active}
                                            disabled={toggling === zone.id}
                                            onCheckedChange={() => toggleZone(zone)}
                                          />
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                          {zone.zone_code || "—"}
                                        </TableCell>
                                        <TableCell className="text-right text-sm">{zone.name_ar}</TableCell>
                                        <TableCell className="text-right text-sm text-muted-foreground">{zone.name_fr}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {filteredCountries.length === 0 && (
          <p className="text-center text-muted-foreground py-8">لا توجد نتائج</p>
        )}
      </div>
    </div>
  );
};

export default CityActivation;
