/**
 * Standalone Call Center App
 * Independent entry point for call center agents.
 * Shares the same Supabase database as the main platform.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/i18n/context";
import RequireRole from "@/components/RequireRole";
import { useAgentSession } from "./hooks/useAgentSession";

// Call Center Login
import CallCenterLogin from "@/admin/pages/CallCenterLogin";

/** Wrapper that activates agent session tracking */
const SessionTracker = ({ children }: { children: React.ReactNode }) => {
  useAgentSession();
  return <>{children}</>;
};

// Call Center Layout & Pages
import CallCenterLayout from "@/admin/layouts/CallCenterLayout";
import CCDashboard from "@/admin/pages/callcenter/CCDashboard";
import IncomingCalls from "@/admin/pages/callcenter/IncomingCalls";
import ManualBooking from "@/admin/pages/callcenter/ManualBooking";
import RideAssign from "@/admin/pages/callcenter/RideAssign";
import CustomerSearch from "@/admin/pages/callcenter/CustomerSearch";
import DriverSearchCC from "@/admin/pages/callcenter/DriverSearchCC";
import Complaints from "@/admin/pages/callcenter/Complaints";
import Tickets from "@/admin/pages/callcenter/Tickets";
import Emergency from "@/admin/pages/callcenter/Emergency";
import CallHistory from "@/admin/pages/callcenter/CallHistory";
import CCReports from "@/admin/pages/callcenter/CCReports";
import DeliveryOrdersCC from "@/admin/pages/callcenter/DeliveryOrdersCC";
import RestaurantsCC from "@/admin/pages/callcenter/RestaurantsCC";
import AutoImport from "@/admin/pages/callcenter/AutoImport";
import GoogleMapsImport from "@/admin/pages/callcenter/GoogleMapsImport";
import AssistantKnowledge from "@/admin/pages/callcenter/AssistantKnowledge";
import InternalMessaging from "@/admin/pages/callcenter/InternalMessaging";
import AdminLiveMap from "@/admin/pages/LiveMap";
import AdminAlerts from "@/admin/pages/Alerts";
import CommunityChat from "@/pages/CommunityChat";

import ThemeLoader from "@/components/ThemeLoader";
import TrackingScripts from "@/components/TrackingScripts";

const queryClient = new QueryClient();

const CallCenterApp = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ThemeLoader />
        <TrackingScripts />
        <BrowserRouter>
          <Routes>
            {/* Login */}
            <Route path="/login" element={<CallCenterLogin />} />

            {/* Call Center pages */}
            <Route path="/" element={<RequireRole allowed={["admin", "agent", "smart_admin_assistant"]}><SessionTracker><CallCenterLayout /></SessionTracker></RequireRole>}>
              <Route index element={<CCDashboard />} />
              <Route path="incoming" element={<IncomingCalls />} />
              <Route path="manual-booking" element={<ManualBooking />} />
              <Route path="ride-assign" element={<RideAssign />} />
              <Route path="customers" element={<CustomerSearch />} />
              <Route path="drivers" element={<DriverSearchCC />} />
              <Route path="complaints" element={<Complaints />} />
              <Route path="tickets" element={<Tickets />} />
              <Route path="delivery" element={<DeliveryOrdersCC />} />
              <Route path="restaurants" element={<RestaurantsCC />} />
              <Route path="auto-import" element={<AutoImport />} />
              <Route path="google-import" element={<GoogleMapsImport />} />
              <Route path="emergency" element={<Emergency />} />
              <Route path="history" element={<CallHistory />} />
              <Route path="reports" element={<CCReports />} />
              <Route path="map" element={<AdminLiveMap />} />
              <Route path="alerts" element={<AdminAlerts />} />
              <Route path="knowledge" element={<AssistantKnowledge />} />
              <Route path="messaging" element={<InternalMessaging />} />
              <Route path="community" element={<CommunityChat />} />
            </Route>

            {/* Redirects */}
            <Route path="/call-center/*" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default CallCenterApp;
