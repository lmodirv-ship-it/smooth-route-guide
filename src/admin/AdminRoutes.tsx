/**
 * Admin Panel — self-contained module.
 * All admin dashboard (/admin/*) and call-center (/call-center/*) routes.
 * Shares the same Supabase database as the main app.
 */
import { Route } from "react-router-dom";
import RequireRole from "@/components/RequireRole";

// Admin layout & pages
import AdminLayout from "@/admin/layouts/AdminLayout";
import AdminDashboardPage from "@/admin/pages/Dashboard";
import RegisteredUsers from "@/admin/pages/RegisteredUsers";
import AdminRideRequests from "@/admin/pages/RideRequests";
import AdminDrivers from "@/admin/pages/Drivers";
import AdminClients from "@/admin/pages/Clients";
import AdminEarnings from "@/admin/pages/Earnings";
import AdminLiveMap from "@/admin/pages/LiveMap";
import AdminAlerts from "@/admin/pages/Alerts";
import AdminDocuments from "@/admin/pages/Documents";
import AdminDeliveryOrders from "@/admin/pages/DeliveryOrders";
import AdminCallCenter from "@/admin/pages/AdminCallCenter";
import AdminRestaurants from "@/admin/pages/AdminRestaurants";
import ZonesManagement from "@/admin/pages/ZonesManagement";
import AdminSettings from "@/admin/pages/Settings";
import CommissionRatesPage from "@/admin/pages/CommissionRates";
import SmartAssistantPage from "@/admin/pages/SmartAssistant";
import SubAssistantsPage from "@/admin/pages/SubAssistants";
import SupervisorsPage from "@/admin/pages/Supervisors";
import SetupAdmin from "@/admin/pages/SetupAdmin";
import DriverPackages from "@/admin/pages/DriverPackages";
import AdminCommunityChat from "@/admin/pages/AdminCommunityChat";
import CityActivation from "@/admin/pages/CityActivation";

// Supervisor layout & pages
import SupervisorLayout from "@/admin/layouts/SupervisorLayout";
import SupervisorDashboard from "@/admin/pages/supervisor/SupervisorDashboard";
import SupervisorDrivers from "@/admin/pages/supervisor/SupervisorDrivers";
import SupervisorDelivery from "@/admin/pages/supervisor/SupervisorDelivery";
import SupervisorCallCenter from "@/admin/pages/supervisor/SupervisorCallCenter";
import SupervisorRestaurants from "@/admin/pages/supervisor/SupervisorRestaurants";

// Call Center layout & pages
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
import CallCenterLogin from "@/admin/pages/CallCenterLogin";
import AdminLogin from "@/admin/pages/AdminLogin";

export const adminRouteElements = (
  <>
    <Route path="/admin/login" element={<AdminLogin />} />
    <Route path="/call-center/login" element={<CallCenterLogin />} />
    <Route path="/setup-admin" element={<RequireRole><SetupAdmin /></RequireRole>} />

    <Route path="/admin" element={<RequireRole allowed={["admin"]}><AdminLayout /></RequireRole>}>
      <Route index element={<AdminDashboardPage />} />
      <Route path="supervisors" element={<SupervisorsPage />} />
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
      <Route path="commission-rates" element={<CommissionRatesPage />} />
      <Route path="smart-assistant" element={<SmartAssistantPage />} />
      <Route path="sub-assistants" element={<SubAssistantsPage />} />
      <Route path="driver-packages" element={<DriverPackages />} />
      <Route path="settings" element={<AdminSettings />} />
      <Route path="messaging" element={<InternalMessaging />} />
      <Route path="community-chat" element={<AdminCommunityChat />} />
    </Route>

    <Route path="/call-center" element={<RequireRole allowed={["admin", "agent", "smart_admin_assistant"]}><CallCenterLayout /></RequireRole>}>
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
    </Route>

    {/* ═══ Supervisor Panel ═══ */}
    <Route path="/supervisor" element={<RequireRole allowed={["moderator"]}><SupervisorLayout /></RequireRole>}>
      <Route index element={<SupervisorDashboard />} />
      <Route path="drivers" element={<SupervisorDrivers />} />
      <Route path="delivery" element={<SupervisorDelivery />} />
      <Route path="call-center" element={<SupervisorCallCenter />} />
      <Route path="restaurants" element={<SupervisorRestaurants />} />
      <Route path="messaging" element={<InternalMessaging />} />
    </Route>
  </>
);
