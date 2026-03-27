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
  { name: "Hiba Eco", url: "https://www.hiba-eco.com" },
  { name: "Lavage Nizar", url: "https://www.lavagenizar.com" },
  { name: "Tanja Print", url: "https://www.tanjaprint.com" },
  { name: "Slava Call Hiba", url: "https://slavacall-hiba.com" },
];

const MainLayout = () => (
  <>
    <GlobalNotificationListener />
    <div className="fixed top-0 left-0 right-0 z-[60] flex items-center h-10 bg-background/80 backdrop-blur-md border-b border-border/50">
      {/* Left: Logout + Language */}
      <div className="flex items-center gap-1.5 px-2 shrink-0">
        <GlobalLogoutButton />
        <LanguageSwitcher />
      </div>

      {/* Center: Scrolling partner sites */}
      <div className="flex-1 overflow-hidden mx-2">
        <div className="flex animate-marquee whitespace-nowrap gap-6">
          {[...PARTNER_SITES, ...PARTNER_SITES].map((site, i) => (
            <a
              key={i}
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              {site.name}
            </a>
          ))}
        </div>
      </div>
    </div>
    {/* Spacer for fixed bar */}
    <div className="h-10" />
    <Outlet />
  </>
);

export default MainLayout;
