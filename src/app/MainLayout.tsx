/**
 * Main Application Layout — wraps customer, driver, and delivery interfaces.
 */
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import GlobalLogoutButton from "@/components/GlobalLogoutButton";
import GlobalNotificationListener from "@/components/GlobalNotificationListener";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import FloatingChatButton from "@/components/FloatingChatButton";
import VoiceOrderButton from "@/components/VoiceOrderButton";
import FloatingCommunityButton from "@/components/FloatingCommunityButton";
import GlobalContactFooter from "@/components/GlobalContactFooter";
import { useVisibility } from "@/hooks/useVisibility";
import VisitorCounter from "@/components/VisitorCounter";
import DriverTopBarControls from "@/components/driver/DriverTopBarControls";
import { DriverMapControlsProvider, useDriverMapControls } from "@/contexts/DriverMapControlsContext";
import logo from "@/assets/hn-driver-badge.png";
import partnerHibaEco from "@/assets/partner-hiba-eco.png";
import partnerLavageNizar from "@/assets/partner-lavage-nizar.png";
import partnerTanjaPrint from "@/assets/partner-tanja-print.png";
import partnerSlavacall from "@/assets/partner-slavacall.png";

const PARTNER_SITES = [
  { name: "Hiba Eco", url: "https://www.hiba-eco.com", logo: partnerHibaEco },
  { name: "Lavage Nizar", url: "https://www.lavagenizar.com", logo: partnerLavageNizar },
  { name: "Tanja Print", url: "https://www.tanjaprint.com", logo: partnerTanjaPrint },
  { name: "Slava Call Hiba", url: "https://slavacall-hiba.com", logo: partnerSlavacall },
];

const DriverTopBarControlsWithContext = () => {
  const { mapTheme, setMapTheme, mapExpanded, toggleMapExpanded } = useDriverMapControls();
  return (
    <DriverTopBarControls
      mapTheme={mapTheme}
      onMapThemeChange={setMapTheme}
      mapExpanded={mapExpanded}
      onMapExpandToggle={toggleMapExpanded}
    />
  );
};

const MainLayoutInner = () => {
  const { isVisible } = useVisibility();
  const location = useLocation();
  const isDriverPage = location.pathname.startsWith("/driver");

  return (
    <>
      {isVisible("notification_listener") && <GlobalNotificationListener />}
      <div className="fixed top-0 left-0 right-0 z-[60] flex items-center h-11 bg-background/90 backdrop-blur-xl border-b border-border/40">
        {/* Left: Logo + Logout + Language */}
        <div className="flex items-center gap-2 px-3 shrink-0">
          <img src={logo} alt="HN" className="w-8 h-8 rounded-full shadow-md" />
          <div className="w-px h-5 bg-border/40" />
          <VisitorCounter />
          <div className="w-px h-5 bg-border/40" />
          {isVisible("logout_btn") && <GlobalLogoutButton />}
          {isVisible("language_switcher") && <LanguageSwitcher />}
        </div>

        {/* Separator */}
        <div className="w-px h-6 bg-border/50 shrink-0" />

        {/* Center: Scrolling partner sites with logos */}
        {isVisible("partner_bar") && (
          <div className="flex-1 overflow-hidden mx-3 relative">
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background/90 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background/90 to-transparent z-10 pointer-events-none" />
            
            <div className="flex animate-marquee whitespace-nowrap items-center">
              {[...PARTNER_SITES, ...PARTNER_SITES, ...PARTNER_SITES].map((site, i) => (
                <a
                  key={i}
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs text-muted-foreground hover:text-primary transition-all duration-300 group shrink-0 -ml-2 first:ml-0 hover:z-10"
                >
                  <div className="w-8 h-8 rounded-full border-2 border-background group-hover:border-primary/60 transition-all duration-300 overflow-hidden flex items-center justify-center bg-secondary shadow-md group-hover:shadow-[0_0_12px_hsl(32,95%,55%,0.4)] group-hover:scale-125">
                    <img src={site.logo} alt={site.name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
        {!isVisible("partner_bar") && <div className="flex-1" />}

        {/* Separator */}
        <div className="w-px h-6 bg-border/50 shrink-0" />

        {/* Right: Driver controls or accent dot */}
        <div className="px-3 shrink-0">
          {isDriverPage ? <DriverTopBarControlsWithContext /> : (
            <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" />
          )}
        </div>
      </div>
      {/* Spacer for fixed bar */}
      <div className="h-11" />
      {isVisible("floating_chat_btn") && <FloatingChatButton />}
      {isVisible("voice_order_btn") && <VoiceOrderButton />}
      {isVisible("community_btn") && <FloatingCommunityButton />}
      <Outlet />
      {isVisible("contact_footer") && <GlobalContactFooter />}
    </>
  );
};

const MainLayout = () => (
  <DriverMapControlsProvider>
    <MainLayoutInner />
  </DriverMapControlsProvider>
);

export default MainLayout;
