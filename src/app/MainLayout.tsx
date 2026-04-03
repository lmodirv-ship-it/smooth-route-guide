/**
 * Main Application Layout — wraps customer, driver, and delivery interfaces.
 */
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import GlobalLogoutButton from "@/components/GlobalLogoutButton";
import GlobalNotificationListener from "@/components/GlobalNotificationListener";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import FloatingChatButton from "@/components/FloatingChatButton";
import VoiceOrderButton from "@/components/VoiceOrderButton";
import TopNavLinks from "@/components/TopNavLinks";

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
  const navigate = useNavigate();
  const isDriverPage = location.pathname.startsWith("/driver");
  const isTrackingPage = location.pathname.includes("tracking");
  const isCommunityPage = location.pathname.includes("community");

  return (
    <>
      {isVisible("notification_listener") && <GlobalNotificationListener />}
      <div className="fixed top-0 left-0 right-0 z-[60] h-11 bg-background/90 backdrop-blur-xl border-b border-border/40 overflow-x-auto overflow-y-hidden scrollbar-hide">
        <div className="flex items-center h-full min-w-max px-3 gap-2">
          {/* Logo */}
          <img src={logo} alt="HN" className="w-8 h-8 rounded-full shadow-md shrink-0" />
          <div className="w-px h-5 bg-border/40 shrink-0" />
          
          {/* Visitor counter */}
          <VisitorCounter />
          <div className="w-px h-5 bg-border/40 shrink-0" />
          
          {/* Logout + Language */}
          {isVisible("logout_btn") && <GlobalLogoutButton />}
          {isVisible("language_switcher") && <LanguageSwitcher />}
          {isVisible("community_btn") && !isCommunityPage && (
            <button
              onClick={() => navigate("/community")}
              className="p-1.5 rounded-full border border-border bg-secondary text-foreground hover:bg-emerald-500 hover:text-white transition-all shrink-0"
              title="مجتمع HN"
            >
              <Users className="w-3.5 h-3.5" />
            </button>
          )}
          {isVisible("floating_chat_btn") && <FloatingChatButton />}
          {isVisible("voice_order_btn") && <VoiceOrderButton />}
          <div className="w-px h-5 bg-border/40 shrink-0" />
          
          {/* Nav links */}
          <TopNavLinks />
          <div className="w-px h-5 bg-border/40 shrink-0" />

          {/* Partner bar */}
          {isVisible("partner_bar") && (
            <div className="flex items-center gap-0 shrink-0">
              {PARTNER_SITES.map((site, i) => (
                <a
                  key={i}
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center shrink-0 -ml-1.5 first:ml-0 hover:z-10 group"
                >
                  <div className="w-7 h-7 rounded-full border-2 border-background group-hover:border-primary/60 transition-all duration-300 overflow-hidden flex items-center justify-center bg-secondary shadow-md group-hover:shadow-[0_0_10px_hsl(32,95%,55%,0.4)] group-hover:scale-110">
                    <img src={site.logo} alt={site.name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                </a>
              ))}
            </div>
          )}
          <div className="w-px h-5 bg-border/40 shrink-0" />

          {/* Driver controls */}
          <div className="shrink-0">
            {(isDriverPage || isTrackingPage) ? <DriverTopBarControlsWithContext /> : (
              <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" />
            )}
          </div>
        </div>
      </div>
      {/* Spacer for fixed bar */}
      <div className="h-11" />
      
      
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
