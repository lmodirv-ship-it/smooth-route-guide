import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavigationLinksProps {
  lat: number;
  lng: number;
  label?: string;
  className?: string;
}

const apps = [
  {
    name: "Waze",
    icon: "🟢",
    getUrl: (lat: number, lng: number) =>
      `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
  },
  {
    name: "HERE WeGo",
    icon: "🔵",
    getUrl: (lat: number, lng: number, label?: string) =>
      `https://share.here.com/r/${lat},${lng}${label ? `?title=${encodeURIComponent(label)}` : ""}`,
  },
  {
    name: "Google Maps",
    icon: "🔴",
    getUrl: (lat: number, lng: number) =>
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
  },
];

const NavigationLinks = ({ lat, lng, label, className = "" }: NavigationLinksProps) => {
  return (
    <div className={`flex gap-2 ${className}`} dir="rtl">
      {apps.map((app) => (
        <Button
          key={app.name}
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 border-border text-xs"
          onClick={() => window.open(app.getUrl(lat, lng, label), "_blank")}
        >
          <span>{app.icon}</span>
          <span>{app.name}</span>
          <ExternalLink className="h-3 w-3 text-muted-foreground" />
        </Button>
      ))}
    </div>
  );
};

export default NavigationLinks;
