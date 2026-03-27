/**
 * Standalone Supervisor App
 * Independent entry point for supervisors (moderators).
 * Shares the same Supabase database as the main platform.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/i18n/context";
import RequireRole from "@/components/RequireRole";

// Supervisor Login (reuse admin login with redirect)
import SupervisorLogin from "./SupervisorLogin";

// Supervisor Layout & Pages
import SupervisorLayout from "@/admin/layouts/SupervisorLayout";
import SupervisorDashboard from "@/admin/pages/supervisor/SupervisorDashboard";
import SupervisorDrivers from "@/admin/pages/supervisor/SupervisorDrivers";
import SupervisorDelivery from "@/admin/pages/supervisor/SupervisorDelivery";
import SupervisorCallCenter from "@/admin/pages/supervisor/SupervisorCallCenter";
import SupervisorRestaurants from "@/admin/pages/supervisor/SupervisorRestaurants";

const queryClient = new QueryClient();

const SupervisorApp = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Login */}
            <Route path="/login" element={<SupervisorLogin />} />

            {/* Supervisor pages */}
            <Route path="/" element={<RequireRole allowed={["moderator"]}><SupervisorLayout /></RequireRole>}>
              <Route index element={<SupervisorDashboard />} />
              <Route path="drivers" element={<SupervisorDrivers />} />
              <Route path="delivery" element={<SupervisorDelivery />} />
              <Route path="call-center" element={<SupervisorCallCenter />} />
              <Route path="restaurants" element={<SupervisorRestaurants />} />
            </Route>

            {/* Redirects */}
            <Route path="/supervisor/*" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default SupervisorApp;
