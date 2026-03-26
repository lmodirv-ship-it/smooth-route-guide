import { Globe, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminGeo } from "@/admin/contexts/AdminGeoContext";

const AdminGeoFilter = () => {
  const { selectedCountry, selectedCity, setSelectedCountry, setSelectedCity, countries, cities } = useAdminGeo();

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedCountry} onValueChange={setSelectedCountry}>
        <SelectTrigger className="w-44 h-9 text-sm bg-secondary/60 border-border">
          <Globe className="w-4 h-4 ml-1.5 text-primary flex-shrink-0" />
          <SelectValue placeholder="كل البلدان" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">🌍 كل البلدان</SelectItem>
          {countries.map(c => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedCountry !== "all" && (
        <Select value={selectedCity} onValueChange={setSelectedCity}>
          <SelectTrigger className="w-44 h-9 text-sm bg-secondary/60 border-border">
            <MapPin className="w-4 h-4 ml-1.5 text-primary flex-shrink-0" />
            <SelectValue placeholder="كل المدن" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">🏙️ كل المدن</SelectItem>
            {cities.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};

export default AdminGeoFilter;
