/**
 * Standalone Delivery Driver App
 * Independent entry point for delivery drivers only.
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

import DriverDelivery from "@/pages/driver/DriverDelivery";
import DeliveryDriverTracking from "@/pages/driver/DeliveryDriverTracking";
import DriverHistory from "@/pages/DriverHistory";
import DriverNotifications from "@/pages/DriverNotifications";
import DriverSettings from "@/pages/DriverSettings";
import DocumentUpload from "@/pages/DocumentUpload";
import DriverProfile from "@/pages/driver/DriverProfile";
import DriverWallet from "@/pages/driver/DriverWallet";
import DriverSupport from "@/pages/driver/DriverSupport";
import DriverEarnings from "@/pages/driver/DriverEarnings";
import DriverSubscription from "@/pages/driver/DriverSubscription";
import CommunityChat from "@/pages/CommunityChat";

import GlobalLogoutButton from "@/components/GlobalLogoutButton";
import GlobalNotificationListener from "@/components/GlobalNotificationListener";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import RequireRole from "@/components/RequireRole";
import FloatingCommunityButton from "@/components/FloatingCommunityButton";
import FloatingChatButton from "@/components/FloatingChatButton";
import ThemeLoader from "@/components/ThemeLoader";

const queryClient = new QueryClient();

const DeliveryDriverLayout = () => {
  return (
    <>
      <GlobalNotificationListener />
      <div className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-between h-12 bg-background/95 backdrop-blur-xl border-b border-border/40 px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <span className="text-lg">🛵</span>
            </div>
            <span className="text-base font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">HN Delivery</span>
          </div>
          <div className="text-xs text-muted-foreground bg-emerald-500/10 px-2 py-0.5 rounded-full">سائق توصيل</div>
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

const DriverDeliveryApp = () => (
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

            {/* Delivery Driver pages */}
            <Route path="/delivery" element={<RequireRole allowed={["delivery"]}><><DeliveryDriverLayout /><DriverDelivery /></></RequireRole>} />
            <Route path="/delivery/tracking" element={<RequireRole allowed={["delivery"]}><DeliveryDriverTracking /></RequireRole>} />
            <Route path="/driver/delivery" element={<RequireRole allowed={["delivery"]}><><DeliveryDriverLayout /><DriverDelivery /></></RequireRole>} />
            <Route path="/driver/delivery/tracking" element={<RequireRole allowed={["delivery"]}><DeliveryDriverTracking /></RequireRole>} />
            <Route path="/delivery/history" element={<RequireRole allowed={["delivery"]}><><DeliveryDriverLayout /><DriverHistory /></></RequireRole>} />
            <Route path="/delivery/notifications" element={<RequireRole allowed={["delivery"]}><><DeliveryDriverLayout /><DriverNotifications /></></RequireRole>} />
            <Route path="/delivery/settings" element={<RequireRole allowed={["delivery"]}><><DeliveryDriverLayout /><DriverSettings /></></RequireRole>} />
            <Route path="/delivery/documents" element={<RequireRole allowed={["delivery"]}><><DeliveryDriverLayout /><DocumentUpload /></></RequireRole>} />
            <Route path="/delivery/profile" element={<RequireRole allowed={["delivery"]}><><DeliveryDriverLayout /><DriverProfile /></></RequireRole>} />
            <Route path="/delivery/wallet" element={<RequireRole allowed={["delivery"]}><><DeliveryDriverLayout /><DriverWallet /></></RequireRole>} />
            <Route path="/delivery/support" element={<RequireRole allowed={["delivery"]}><><DeliveryDriverLayout /><DriverSupport /></></RequireRole>} />
            <Route path="/delivery/earnings" element={<RequireRole allowed={["delivery"]}><><DeliveryDriverLayout /><DriverEarnings /></></RequireRole>} />
            <Route path="/delivery/subscription" element={<RequireRole allowed={["delivery"]}><><DeliveryDriverLayout /><DriverSubscription /></></RequireRole>} />
            <Route path="/community" element={<RequireRole allowed={["delivery"]}><><DeliveryDriverLayout /><CommunityChat /></></RequireRole>} />

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/delivery" replace />} />
            <Route path="/driver/delivery" element={<Navigate to="/delivery" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default DriverDeliveryApp;
