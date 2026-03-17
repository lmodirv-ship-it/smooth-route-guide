import { useRef, useCallback } from "react";
import { Autocomplete } from "@react-google-maps/api";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected: (address: string, lat: number, lng: number) => void;
  placeholder?: string;
  className?: string;
}

const PlacesAutocomplete = ({
  value,
  onChange,
  onPlaceSelected,
  placeholder = "إلى أين تريد الذهاب؟",
}: PlacesAutocompleteProps) => {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const onLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  const onPlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    if (place?.formatted_address && place.geometry?.location) {
      const address = place.formatted_address;
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      onChange(address);
      onPlaceSelected(address, lat, lng);
    }
  }, [onChange, onPlaceSelected]);

  return (
    <div className="relative">
      <Autocomplete
        onLoad={onLoad}
        onPlaceChanged={onPlaceChanged}
        options={{ types: ["geocode", "establishment"] }}
      >
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-secondary/80 border-border text-foreground h-14 rounded-2xl pr-12 pl-4 text-right text-base placeholder:text-muted-foreground"
        />
      </Autocomplete>
      <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary pointer-events-none" />
    </div>
  );
};

export default PlacesAutocomplete;
