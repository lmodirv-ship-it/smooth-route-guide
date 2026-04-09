/**
 * Root Application — composes two independent modules:
 *   1. Main App (src/app/)   → Customer, Driver, Delivery, Public pages
 *   2. Admin Panel (src/admin/) → Dashboard, Users, Settings, Call Center, etc.
 *
 * Both share the same Supabase database.
 * Admin also has a standalone build (vite.config.admin.ts) for separate deployment.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import { I18nProvider } from "@/i18n/context";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
import { useTheme } from "@/hooks/useTheme";
import SmartErrorBoundary from "@/components/SmartErrorBoundary";
import TrackingScripts from "@/components/TrackingScripts";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import HNChatbot from "@/components/HNChatbot";

// ─── Module route elements ───
import { mainRouteElements } from "./app/index";
import { adminRouteElements } from "./admin/index";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 min — avoid refetching fresh data
      gcTime: 10 * 60 * 1000,         // 10 min cache
      refetchOnWindowFocus: false,    // prevent redundant fetches on tab switch
      retry: 2,
    },
  },
});

const AppInner = () => {
  usePresenceHeartbeat();
  useTheme(); // Load and apply active theme from DB
  return (
    <BrowserRouter>
      <Routes>
        {mainRouteElements}
        {adminRouteElements}
      </Routes>
      <HNChatbot />
    </BrowserRouter>
  );
};

const App = () => (
  <SmartErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <CartProvider>
            <TrackingScripts />
            <CookieConsentBanner />
            <SmartErrorBoundary>
              <AppInner />
            </SmartErrorBoundary>
          </CartProvider>
        </TooltipProvider>
      </I18nProvider>
    </QueryClientProvider>
  </SmartErrorBoundary>
);

export default App;
