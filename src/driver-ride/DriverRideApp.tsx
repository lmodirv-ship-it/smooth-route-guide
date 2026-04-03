/**
 * Standalone Ride Driver App
 * Independent entry point for ride-hailing drivers only.
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

import DriverPage from "@/pages/DriverPage";
import DriverTracking from "@/pages/DriverTracking";
import DriverHistory from "@/pages/DriverHistory";
import DriverNotifications from "@/pages/DriverNotifications";
import DriverSettings from "@/pages/DriverSettings";
import DocumentUpload from "@/pages/DocumentUpload";
import ActiveTrip from "@/pages/ActiveTrip";
import DriverProfile from "@/pages/driver/DriverProfile";
import DriverWallet from "@/pages/driver/DriverWallet";
import CarInfo from "@/pages/driver/CarInfo";
import DriverPromotions from "@/pages/driver/DriverPromotions";
import DriverSupport from "@/pages/driver/DriverSupport";
import DriverStatus from "@/pages/driver/DriverStatus";
import DriverEarnings from "@/pages/driver/DriverEarnings";
import DriverSubscription from "@/pages/driver/DriverSubscription";
import CommunityChat from "@/pages/CommunityChat";

import GlobalLogoutButton from "@/components/GlobalLogoutButton";
import GlobalNotificationListener from "@/components/GlobalNotificationListener";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import RequireRole from "@/components/RequireRole";
import { Users } from "lucide-react";
import FloatingChatButton from "@/components/FloatingChatButton";
import ThemeLoader from "@/components/ThemeLoader";
import TopNavLinks from "@/components/TopNavLinks";

const queryClient = new QueryClient();

const RideDriverLayout = () => {
  return (
    <>
      <GlobalNotificationListener />
      <div className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-between h-12 bg-background/95 backdrop-blur-xl border-b border-border/40 px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="text-lg">🚗</span>
            </div>
            <span className="text-base font-bold bg-gradient-to-r from-primary to-[hsl(40,100%,65%)] bg-clip-text text-transparent">HN Driver</span>
          </div>
          <div className="text-xs text-muted-foreground bg-primary/10 px-2 py-0.5 rounded-full">سائق ركاب</div>
        </div>
        <div className="flex items-center gap-2">
          <FloatingChatButton />
          <button
            onClick={() => window.location.href = "/community"}
            className="p-1.5 rounded-full border border-border bg-secondary text-foreground hover:bg-emerald-500 hover:text-white transition-all"
            title="مجتمع HN"
          >
            <Users className="w-3.5 h-3.5" />
          </button>
          <LanguageSwitcher />
          <GlobalLogoutButton />
        </div>
      </div>
      <div className="h-12" />
    </>
  );
};

const DriverRideApp = () => (
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

            {/* Driver pages */}
            <Route path="/driver" element={<RequireRole allowed={["driver"]}><><RideDriverLayout /><DriverPage /></></RequireRole>} />
            <Route path="/driver/tracking" element={<RequireRole allowed={["driver"]}><><RideDriverLayout /><DriverTracking /></></RequireRole>} />
            <Route path="/driver/history" element={<RequireRole allowed={["driver"]}><><RideDriverLayout /><DriverHistory /></></RequireRole>} />
            <Route path="/driver/notifications" element={<RequireRole allowed={["driver"]}><><RideDriverLayout /><DriverNotifications /></></RequireRole>} />
            <Route path="/driver/settings" element={<RequireRole allowed={["driver"]}><><RideDriverLayout /><DriverSettings /></></RequireRole>} />
            <Route path="/driver/documents" element={<RequireRole allowed={["driver"]}><><RideDriverLayout /><DocumentUpload /></></RequireRole>} />
            <Route path="/driver/trip" element={<RequireRole allowed={["driver"]}><><RideDriverLayout /><ActiveTrip /></></RequireRole>} />
            <Route path="/driver/profile" element={<RequireRole allowed={["driver"]}><><RideDriverLayout /><DriverProfile /></></RequireRole>} />
            <Route path="/driver/wallet" element={<RequireRole allowed={["driver"]}><><RideDriverLayout /><DriverWallet /></></RequireRole>} />
            <Route path="/driver/car-info" element={<RequireRole allowed={["driver"]}><><RideDriverLayout /><CarInfo /></></RequireRole>} />
            <Route path="/driver/promotions" element={<RequireRole allowed={["driver"]}><><RideDriverLayout /><DriverPromotions /></></RequireRole>} />
            <Route path="/driver/support" element={<RequireRole allowed={["driver"]}><><RideDriverLayout /><DriverSupport /></></RequireRole>} />
            <Route path="/driver/status" element={<RequireRole allowed={["driver"]}><><RideDriverLayout /><DriverStatus /></></RequireRole>} />
            <Route path="/driver/earnings" element={<RequireRole allowed={["driver"]}><><RideDriverLayout /><DriverEarnings /></></RequireRole>} />
            <Route path="/driver/subscription" element={<RequireRole allowed={["driver"]}><><RideDriverLayout /><DriverSubscription /></></RequireRole>} />
            <Route path="/community" element={<RequireRole allowed={["driver"]}><><RideDriverLayout /><CommunityChat /></></RequireRole>} />

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/driver" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default DriverRideApp;
