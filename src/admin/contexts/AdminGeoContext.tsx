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

      if (zones) {
        const uniqueCountries = [...new Set(zones.map(z => z.country))].sort();
        setCountries(uniqueCountries);
      }

      // Load geo settings from app_settings
      const { data: settings } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("key", "geo_settings")
        .maybeSingle();

      if (settings?.value) {
        const geo = settings.value as any;
        const defCountry = geo.defaultCountry || "all";
        const defCity = geo.defaultCity || "all";
        const active = geo.activeCountries || [];
        setDefaultCountry(defCountry);
        setDefaultCity(defCity);
        setActiveCountries(active);
        setSelectedCountry(defCountry);
        setSelectedCity(defCity);
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
