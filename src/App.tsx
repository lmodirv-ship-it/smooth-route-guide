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

// ─── Module route elements ───
import { mainRouteElements } from "./app";
import { adminRouteElements } from "./admin";

const queryClient = new QueryClient();

const AppInner = () => {
  usePresenceHeartbeat();
  useTheme(); // Load and apply active theme from DB
  return (
    <BrowserRouter>
      <Routes>
        {mainRouteElements}
        {adminRouteElements}
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <CartProvider>
          <AppInner />
        </CartProvider>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
