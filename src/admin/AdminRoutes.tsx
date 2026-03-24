/**
 * Admin Panel — logically separated from the main app.
 *
 * Contains all admin dashboard routes (/admin/*) and
 * call-center routes (/call-center/*).
 *
 * Both share the same Supabase database as the main app
 * but are organised as an independent module.
 */
import { Route } from "react-router-dom";
import RequireRole from "@/components/RequireRole";

// Admin layout & pages
import AdminLayout from "@/components/AdminLayout";
import AdminDashboardPage from "@/pages/admin/Dashboard";
import RegisteredUsers from "@/pages/admin/RegisteredUsers";
import AdminRideRequests from "@/pages/admin/RideRequests";
import AdminDrivers from "@/pages/admin/Drivers";
import AdminClients from "@/pages/admin/Clients";
import AdminEarnings from "@/pages/admin/Earnings";
import AdminLiveMap from "@/pages/admin/LiveMap";
import AdminAlerts from "@/pages/admin/Alerts";
import AdminDocuments from "@/pages/admin/Documents";
import AdminDeliveryOrders from "@/pages/admin/DeliveryOrders";
import AdminCallCenter from "@/pages/admin/AdminCallCenter";
import AdminRestaurants from "@/pages/admin/AdminRestaurants";
import ZonesManagement from "@/pages/admin/ZonesManagement";
import AdminSettings from "@/pages/admin/Settings";
import SetupAdmin from "@/pages/admin/SetupAdmin";

// Call Center layout & pages
import CallCenterLayout from "@/components/CallCenterLayout";
import CCDashboard from "@/pages/callcenter/CCDashboard";
import IncomingCalls from "@/pages/callcenter/IncomingCalls";
import ManualBooking from "@/pages/callcenter/ManualBooking";
import RideAssign from "@/pages/callcenter/RideAssign";
import CustomerSearch from "@/pages/callcenter/CustomerSearch";
import DriverSearchCC from "@/pages/callcenter/DriverSearchCC";
import Complaints from "@/pages/callcenter/Complaints";
import Tickets from "@/pages/callcenter/Tickets";
import Emergency from "@/pages/callcenter/Emergency";
import CallHistory from "@/pages/callcenter/CallHistory";
import CCReports from "@/pages/callcenter/CCReports";
import DeliveryOrdersCC from "@/pages/callcenter/DeliveryOrdersCC";
import RestaurantsCC from "@/pages/callcenter/RestaurantsCC";
import AutoImport from "@/pages/callcenter/AutoImport";
import GoogleMapsImport from "@/pages/callcenter/GoogleMapsImport";

/**
 * All admin-panel routes as a React fragment.
 * Drop into <Routes> in App.tsx.
 */
const AdminRoutes = () => (
  <>
    {/* Setup */}
    <Route path="/setup-admin" element={<RequireRole><SetupAdmin /></RequireRole>} />

    {/* ═══ Admin Dashboard  /admin/* ═══ */}
    <Route path="/admin" element={<RequireRole allowed={["admin"]}><AdminLayout /></RequireRole>}>
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

    {/* ═══ Call Center  /call-center/* ═══ */}
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
  </>
);

export default AdminRoutes;
