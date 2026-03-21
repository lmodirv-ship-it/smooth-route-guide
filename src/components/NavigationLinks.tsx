import { Navigation, ExternalLink, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { launchNavigation, launchSpecificNavApp, NAV_APPS, type NavApp } from "@/lib/navigationLauncher";

interface NavigationLinksProps {
  lat: number;
  lng: number;
  label?: string;
  className?: string;
  /** If true, shows a single "Navigate" button that auto-falls through apps */
  compact?: boolean;
}

const appEmoji: Record<NavApp, string> = {
  waze: "🟢",
  google_maps: "🔴",
  here_wego: "🔵",
  browser: "🌐",
};

const NavigationLinks = ({ lat, lng, label, className = "", compact = false }: NavigationLinksProps) => {
  const target = { lat, lng, label };

  if (compact) {
    return (
      <div className={`flex gap-2 ${className}`} dir="rtl">
        <Button
          onClick={() => launchNavigation(target)}
          className="flex-1 gap-2 gradient-primary text-primary-foreground rounded-xl h-11"
        >
          <Navigation className="h-4 w-4" />
          <span className="font-bold">ابدأ الملاحة</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-11 w-11 border-border rounded-xl shrink-0">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[160px]">
            {NAV_APPS.map((app) => (
              <DropdownMenuItem
                key={app.id}
                onClick={() => launchSpecificNavApp(app.id, target)}
                className="gap-2 cursor-pointer"
              >
                <span>{appEmoji[app.id]}</span>
                <span>{app.name}</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground mr-auto" />
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Expanded view: show all apps as buttons
  return (
    <div className={`flex gap-2 ${className}`} dir="rtl">
      {NAV_APPS.filter((a) => a.id !== "browser").map((app) => (
        <Button
          key={app.id}
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 border-border text-xs"
          onClick={() => launchSpecificNavApp(app.id, target)}
        >
          <span>{appEmoji[app.id]}</span>
          <span>{app.name}</span>
          <ExternalLink className="h-3 w-3 text-muted-foreground" />
        </Button>
      ))}
    </div>
  );
};

export default NavigationLinks;
