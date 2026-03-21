import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { sanitizePlainText } from "@/lib/inputSecurity";

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected: (address: string, lat: number, lng: number) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Simple address input (no external API dependency).
 * Users type an address manually; geocoding can be added later if needed.
 */
const PlacesAutocomplete = ({
  value,
  onChange,
  onPlaceSelected,
  placeholder = "إلى أين تريد الذهاب؟",
}: PlacesAutocompleteProps) => {
  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(sanitizePlainText(e.target.value, 200))}
        className="bg-secondary/80 border-border text-foreground h-14 rounded-2xl pr-12 pl-4 text-right text-base placeholder:text-muted-foreground"
      />
      <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary pointer-events-none" />
    </div>
  );
};

export default PlacesAutocomplete;
