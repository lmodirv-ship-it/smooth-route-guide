/**
 * Standalone Admin application shell.
 * Used when admin is deployed independently on its own domain.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import RequireRole from "@/components/RequireRole";

// Admin layout & pages
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboardPage from "./pages/Dashboard";
import RegisteredUsers from "./pages/RegisteredUsers";
import AdminRideRequests from "./pages/RideRequests";
import AdminDrivers from "./pages/Drivers";
import AdminClients from "./pages/Clients";
import AdminEarnings from "./pages/Earnings";
import AdminLiveMap from "./pages/LiveMap";
import AdminAlerts from "./pages/Alerts";
import AdminDocuments from "./pages/Documents";
import AdminDeliveryOrders from "./pages/DeliveryOrders";
import AdminCallCenter from "./pages/AdminCallCenter";
import AdminRestaurants from "./pages/AdminRestaurants";
import ZonesManagement from "./pages/ZonesManagement";
import AdminSettings from "./pages/Settings";
import SetupAdmin from "./pages/SetupAdmin";

// Call Center layout & pages
import CallCenterLayout from "./layouts/CallCenterLayout";
import CCDashboard from "./pages/callcenter/CCDashboard";
import IncomingCalls from "./pages/callcenter/IncomingCalls";
import ManualBooking from "./pages/callcenter/ManualBooking";
import RideAssign from "./pages/callcenter/RideAssign";
import CustomerSearch from "./pages/callcenter/CustomerSearch";
import DriverSearchCC from "./pages/callcenter/DriverSearchCC";
import Complaints from "./pages/callcenter/Complaints";
import Tickets from "./pages/callcenter/Tickets";
import Emergency from "./pages/callcenter/Emergency";
import CallHistory from "./pages/callcenter/CallHistory";
import CCReports from "./pages/callcenter/CCReports";
import DeliveryOrdersCC from "./pages/callcenter/DeliveryOrdersCC";
import RestaurantsCC from "./pages/callcenter/RestaurantsCC";
import AutoImport from "./pages/callcenter/AutoImport";
import GoogleMapsImport from "./pages/callcenter/GoogleMapsImport";

// Auth page (needed for login within admin domain)
import AuthPage from "@/pages/AuthPage";

const queryClient = new QueryClient();

const AdminApp = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Login for standalone admin */}
          <Route path="/login" element={<AuthPage />} />

          {/* Setup admin */}
          <Route path="/setup-admin" element={<RequireRole><SetupAdmin /></RequireRole>} />

          {/* Admin panel — root of standalone deployment */}
          <Route path="/" element={<RequireRole allowed={["admin"]}><AdminLayout /></RequireRole>}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="users" element={<RegisteredUsers />} />
            <Route path="requests" element={<AdminRideRequests />} />
            <Route path="drivers" element={<AdminDrivers />} />
            <Route path="clients" element={<AdminClients />} />
            <Route path="earnings" element={<AdminEarnings />} />
            <Route path="map" element={<AdminLiveMap />} />
            <Route path="alerts" element={<AdminAlerts />} />
            <Route path="documents" element={<AdminDocuments />} />
            <Route path="delivery" element={<AdminDeliveryOrders />} />
            <Route path="call-center" element={<AdminCallCenter />} />
            <Route path="restaurants" element={<AdminRestaurants />} />
            <Route path="zones" element={<ZonesManagement />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Redirect /admin/* to root (standalone mode) */}
          <Route path="/admin/*" element={<Navigate to="/" replace />} />

          {/* Call Center */}
          <Route path="/call-center" element={<RequireRole allowed={["admin", "agent"]}><CallCenterLayout /></RequireRole>}>
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
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default AdminApp;
