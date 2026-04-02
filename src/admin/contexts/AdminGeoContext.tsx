import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface GeoState {
  selectedCountry: string;
  selectedCity: string;
  setSelectedCountry: (c: string) => void;
  setSelectedCity: (c: string) => void;
  countries: string[];
  cities: string[];
  activeCountries: string[];
  defaultCountry: string;
  defaultCity: string;
  loading: boolean;
}

const AdminGeoContext = createContext<GeoState | null>(null);

export const useAdminGeo = (): GeoState => {
  const ctx = useContext(AdminGeoContext);
  if (!ctx) {
    // Return safe defaults when used outside provider
    return {
      selectedCountry: "all",
      selectedCity: "all",
      setSelectedCountry: () => {},
      setSelectedCity: () => {},
      countries: [],
      cities: [],
      activeCountries: [],
      defaultCountry: "all",
      defaultCity: "all",
      loading: false,
    };
  }
  return ctx;
};

export const AdminGeoProvider = ({ children }: { children: ReactNode }) => {
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedCity, setSelectedCity] = useState("all");
  const [countries, setCountries] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [activeCountries, setActiveCountries] = useState<string[]>([]);
  const [defaultCountry, setDefaultCountry] = useState("all");
  const [defaultCity, setDefaultCity] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Load zones for country/city lists
      const { data: zones } = await supabase
        .from("zones")
        .select("country, city")
        .eq("is_active", true);

      const allZones = zones || [];
      const uniqueCountries = [...new Set(allZones.map(z => z.country))].sort();
      setCountries(uniqueCountries);

      // Load geo settings from app_settings
      const { data: settings } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("key", "geo_settings")
        .maybeSingle();

      let active: string[] = [];
      if (settings?.value) {
        const geo = settings.value as any;
        setDefaultCountry(geo.defaultCountry || "all");
        setDefaultCity(geo.defaultCity || "all");
        active = geo.activeCountries || [];
        setActiveCountries(active);
      }

      // Try to auto-detect location via browser geolocation
      const detectLocation = async () => {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          );
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=ar&zoom=10`,
            { headers: { "User-Agent": "HN-Driver-Admin/1.0" } }
          );
          if (!res.ok) return null;
          const data = await res.json();
          const detectedCountry = data.address?.country || "";
          const detectedCity = data.address?.city || data.address?.town || data.address?.state || "";
          return { country: detectedCountry, city: detectedCity };
        } catch {
          return null;
        }
      };

      const detected = await detectLocation();
      const availableCountries = active.length > 0 ? uniqueCountries.filter(c => active.includes(c)) : uniqueCountries;

      if (detected) {
        // Match detected country to available zones
        const matchedCountry = availableCountries.find(c =>
          c === detected.country || detected.country.includes(c) || c.includes(detected.country)
        );
        if (matchedCountry) {
          setSelectedCountry(matchedCountry);
          // Try to match city
          const zoneCities = allZones.filter(z => z.country === matchedCountry).map(z => z.city);
          const matchedCity = zoneCities.find(c =>
            c === detected.city || detected.city.includes(c) || c.includes(detected.city)
          );
          setSelectedCity(matchedCity || "all");
        } else {
          // Fallback to settings default
          setSelectedCountry(settings?.value ? (settings.value as any).defaultCountry || "all" : "all");
          setSelectedCity(settings?.value ? (settings.value as any).defaultCity || "all" : "all");
        }
      } else {
        // No geolocation — use settings defaults
        setSelectedCountry(settings?.value ? (settings.value as any).defaultCountry || "all" : "all");
        setSelectedCity(settings?.value ? (settings.value as any).defaultCity || "all" : "all");
      }

      setLoading(false);
    };
    load();
  }, []);

  // Update cities when country changes
  useEffect(() => {
    if (selectedCountry === "all") {
      setCities([]);
      return;
    }
    const fetchCities = async () => {
      const { data } = await supabase
        .from("zones")
        .select("city")
        .eq("country", selectedCountry)
        .eq("is_active", true);
      if (data) {
        const unique = [...new Set(data.map(z => z.city))].sort();
        setCities(unique);
      }
    };
    fetchCities();
  }, [selectedCountry]);

  const handleSetCountry = (c: string) => {
    setSelectedCountry(c);
    setSelectedCity("all");
  };

  return (
    <AdminGeoContext.Provider
      value={{
        selectedCountry,
        selectedCity,
        setSelectedCountry: handleSetCountry,
        setSelectedCity,
        countries: activeCountries.length > 0 ? countries.filter(c => activeCountries.includes(c)) : countries,
        cities,
        activeCountries,
        defaultCountry,
        defaultCity,
        loading,
      }}
    >
      {children}
    </AdminGeoContext.Provider>
  );
};
