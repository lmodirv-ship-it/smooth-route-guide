/**
 * Standalone Client App
 * Independent entry point for customers only.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/i18n/context";

import AuthPage from "@/pages/AuthPage";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import CompleteProfile from "@/pages/CompleteProfile";
import NotFound from "@/pages/NotFound";

import CustomerHub from "@/pages/CustomerHub";
import CustomerPage from "@/pages/CustomerPage";
import CustomerTracking from "@/pages/CustomerTracking";
import ClientBooking from "@/pages/client/ClientBooking";
import ClientHistory from "@/pages/client/ClientHistory";
import ClientPayment from "@/pages/client/ClientPayment";
import ClientProfile from "@/pages/client/ClientProfile";
import ClientSupport from "@/pages/client/ClientSupport";
import ClientWallet from "@/pages/client/ClientWallet";
import DeliveryHome from "@/pages/delivery/DeliveryHome";
import RestaurantsList from "@/pages/delivery/RestaurantsList";
import RestaurantMenu from "@/pages/delivery/RestaurantMenu";
import DeliveryTracking from "@/pages/delivery/DeliveryTracking";
import OrderTracking from "@/pages/delivery/OrderTracking";
import DeliveryHistory from "@/pages/delivery/DeliveryHistory";
import DeliverySupport from "@/pages/delivery/DeliverySupport";
import Cart from "@/pages/delivery/Cart";
import CommunityChat from "@/pages/CommunityChat";
import AIAssistant from "@/pages/AIAssistant";

import GlobalLogoutButton from "@/components/GlobalLogoutButton";
import GlobalNotificationListener from "@/components/GlobalNotificationListener";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import RequireRole from "@/components/RequireRole";
import FloatingCommunityButton from "@/components/FloatingCommunityButton";
import FloatingChatButton from "@/components/FloatingChatButton";
import ThemeLoader from "@/components/ThemeLoader";

const queryClient = new QueryClient();

const ClientLayout = () => {
  return (
    <>
      <GlobalNotificationListener />
      <div className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-between h-12 bg-background/95 backdrop-blur-xl border-b border-border/40 px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <span className="text-lg">👤</span>
            </div>
            <span className="text-base font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">HN Client</span>
          </div>
          <div className="text-xs text-muted-foreground bg-blue-500/10 px-2 py-0.5 rounded-full">زبون</div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <GlobalLogoutButton />
        </div>
      </div>
      <div className="h-12" />
      <FloatingChatButton />
      <FloatingCommunityButton />
    </>
  );
};

const ClientApp = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ThemeLoader />
        <BrowserRouter>
          <Routes>
            {/* Auth */}
            <Route path="/login" element={<AuthPage />} />
            <Route path="/auth/:role" element={<AuthPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/complete-profile" element={<RequireRole><CompleteProfile /></RequireRole>} />

            {/* Customer pages */}
            <Route path="/customer" element={<RequireRole allowed={["client"]}><><ClientLayout /><CustomerHub /></></RequireRole>} />
            <Route path="/customer/ride" element={<RequireRole allowed={["client"]}><><ClientLayout /><CustomerPage /></></RequireRole>} />
            <Route path="/customer/tracking" element={<RequireRole allowed={["client"]}><><ClientLayout /><CustomerTracking /></></RequireRole>} />
            <Route path="/customer/booking" element={<RequireRole allowed={["client"]}><><ClientLayout /><ClientBooking /></></RequireRole>} />
            <Route path="/customer/history" element={<RequireRole allowed={["client"]}><><ClientLayout /><ClientHistory /></></RequireRole>} />
            <Route path="/customer/payment" element={<RequireRole allowed={["client"]}><><ClientLayout /><ClientPayment /></></RequireRole>} />
            <Route path="/customer/profile" element={<RequireRole allowed={["client"]}><><ClientLayout /><ClientProfile /></></RequireRole>} />
            <Route path="/customer/support" element={<RequireRole allowed={["client"]}><><ClientLayout /><ClientSupport /></></RequireRole>} />
            <Route path="/customer/wallet" element={<RequireRole allowed={["client"]}><><ClientLayout /><ClientWallet /></></RequireRole>} />

            {/* Delivery ordering */}
            <Route path="/delivery" element={<RequireRole allowed={["client"]}><><ClientLayout /><DeliveryHome /></></RequireRole>} />
            <Route path="/delivery/restaurants" element={<RequireRole allowed={["client"]}><><ClientLayout /><RestaurantsList /></></RequireRole>} />
            <Route path="/delivery/restaurant/:id" element={<RequireRole allowed={["client"]}><><ClientLayout /><RestaurantMenu /></></RequireRole>} />
            <Route path="/delivery/tracking" element={<RequireRole allowed={["client"]}><><ClientLayout /><DeliveryTracking /></></RequireRole>} />
            <Route path="/delivery/order/:id" element={<RequireRole allowed={["client"]}><><ClientLayout /><OrderTracking /></></RequireRole>} />
            <Route path="/delivery/history" element={<RequireRole allowed={["client"]}><><ClientLayout /><DeliveryHistory /></></RequireRole>} />
            <Route path="/delivery/support" element={<RequireRole allowed={["client"]}><><ClientLayout /><DeliverySupport /></></RequireRole>} />
            <Route path="/cart" element={<RequireRole allowed={["client"]}><><ClientLayout /><Cart /></></RequireRole>} />

            {/* Community & AI */}
            <Route path="/community" element={<RequireRole allowed={["client"]}><><ClientLayout /><CommunityChat /></></RequireRole>} />
            <Route path="/ai" element={<RequireRole allowed={["client"]}><><ClientLayout /><AIAssistant /></></RequireRole>} />

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/customer" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default ClientApp;