/**
 * Main Application Layout — wraps customer, driver, and delivery interfaces.
 * Provides shared context (cart, i18n, notifications) and global UI elements.
 * Separated from Admin Panel which has its own layout in src/admin/.
 */
import { Outlet } from "react-router-dom";
import GlobalLogoutButton from "@/components/GlobalLogoutButton";
import GlobalNotificationListener from "@/components/GlobalNotificationListener";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const PARTNER_SITES = [
  { name: "Hiba Eco", url: "https://www.hiba-eco.com", initials: "HE", color: "from-emerald-400 to-green-600" },
  { name: "Lavage Nizar", url: "https://www.lavagenizar.com", initials: "LN", color: "from-blue-400 to-cyan-600" },
  { name: "Tanja Print", url: "https://www.tanjaprint.com", initials: "TP", color: "from-amber-400 to-orange-600" },
  { name: "Slava Call Hiba", url: "https://slavacall-hiba.com", initials: "SC", color: "from-purple-400 to-pink-600" },
];

const MainLayout = () => (
  <>
    <GlobalNotificationListener />
    <div className="fixed top-0 left-0 right-0 z-[60] flex items-center h-11 bg-background/90 backdrop-blur-xl border-b border-border/40">
      {/* Left: Logo + Logout + Language */}
      <div className="flex items-center gap-2 px-3 shrink-0">
        <span className="text-lg font-black tracking-tight bg-gradient-to-r from-primary to-[hsl(40,100%,65%)] bg-clip-text text-transparent drop-shadow-[0_0_8px_hsl(32,95%,55%,0.4)]">HN</span>
        <div className="w-px h-5 bg-border/40" />
        <GlobalLogoutButton />
        <LanguageSwitcher />
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-border/50 shrink-0" />

      {/* Center: Scrolling partner sites with logos */}
      <div className="flex-1 overflow-hidden mx-3 relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background/90 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background/90 to-transparent z-10 pointer-events-none" />
        
        <div className="flex animate-marquee whitespace-nowrap gap-8 items-center">
          {[...PARTNER_SITES, ...PARTNER_SITES, ...PARTNER_SITES].map((site, i) => (
            <a
              key={i}
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-all duration-300 group shrink-0"
            >
              <div className="w-6 h-6 rounded-full bg-secondary/80 border border-border/60 group-hover:border-primary/40 transition-all duration-300 overflow-hidden flex items-center justify-center p-0.5 group-hover:shadow-[0_0_8px_hsl(32,95%,55%,0.3)]">
                <img src={site.logo} alt={site.name} className="w-full h-full object-contain rounded-full" />
              </div>
              <span className="font-medium tracking-wide group-hover:text-primary transition-colors">{site.name}</span>
              <span className="text-[9px] text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors hidden sm:inline">
                {site.url.replace("https://", "").replace("www.", "")}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-border/50 shrink-0" />

      {/* Right accent dot */}
      <div className="px-3 shrink-0">
        <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" />
      </div>
    </div>
    {/* Spacer for fixed bar */}
    <div className="h-11" />
    <Outlet />
  </>
);

export default MainLayout;
