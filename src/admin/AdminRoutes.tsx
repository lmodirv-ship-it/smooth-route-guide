/**
 * Admin Panel — self-contained module.
 * All admin dashboard (/admin/*) and call-center (/call-center/*) routes.
 * Shares the same Supabase database as the main app.
 *
 * ⚡ Performance: All pages are lazy-loaded to keep the initial bundle tiny.
 */
import { Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import RequireRole from "@/components/RequireRole";

// ─── Lazy wrapper ───
const Loading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);
const L = (Comp: React.LazyExoticComponent<any>) => (
  <Suspense fallback={<Loading />}><Comp /></Suspense>
);

// Admin layout & pages — lazy
const AdminLayout = lazy(() => import("@/admin/layouts/AdminLayout"));
const AdminDashboardPage = lazy(() => import("@/admin/pages/Dashboard"));
const RegisteredUsers = lazy(() => import("@/admin/pages/RegisteredUsers"));
const AdminRideRequests = lazy(() => import("@/admin/pages/RideRequests"));
const AdminDrivers = lazy(() => import("@/admin/pages/Drivers"));
const DriverPipeline = lazy(() => import("@/admin/pages/DriverPipeline"));
const AdminClients = lazy(() => import("@/admin/pages/Clients"));
const AdminEarnings = lazy(() => import("@/admin/pages/Earnings"));
const AdminLiveMap = lazy(() => import("@/admin/pages/LiveMap"));
const AdminAlerts = lazy(() => import("@/admin/pages/Alerts"));
const AdminDocuments = lazy(() => import("@/admin/pages/Documents"));
const AdminDeliveryOrders = lazy(() => import("@/admin/pages/DeliveryOrders"));
const AdminCallCenter = lazy(() => import("@/admin/pages/AdminCallCenter"));
const AdminRestaurants = lazy(() => import("@/admin/pages/AdminRestaurants"));
const AdminRestaurantMenu = lazy(() => import("@/admin/pages/AdminRestaurantMenu"));
const CCRestaurantMenu = lazy(() => import("@/admin/pages/callcenter/CCRestaurantMenu"));
const ZonesManagement = lazy(() => import("@/admin/pages/ZonesManagement"));
const AdminSettings = lazy(() => import("@/admin/pages/Settings"));
const CommissionRatesPage = lazy(() => import("@/admin/pages/CommissionRates"));
const SmartAssistantPage = lazy(() => import("@/admin/pages/SmartAssistant"));
const SubAssistantsPage = lazy(() => import("@/admin/pages/SubAssistants"));
const SupervisorsPage = lazy(() => import("@/admin/pages/Supervisors"));
const SetupAdmin = lazy(() => import("@/admin/pages/SetupAdmin"));
const DriverPackages = lazy(() => import("@/admin/pages/DriverPackages"));
const AdminCommunityChat = lazy(() => import("@/admin/pages/AdminCommunityChat"));
const CityActivation = lazy(() => import("@/admin/pages/CityActivation"));
const ThemesPage = lazy(() => import("@/admin/pages/Themes"));
const AdsManagement = lazy(() => import("@/admin/pages/AdsManagement"));
const VisitorAnalytics = lazy(() => import("@/admin/pages/VisitorAnalytics"));
const GrowthAnalytics = lazy(() => import("@/admin/pages/GrowthAnalytics"));
const VersionManager = lazy(() => import("@/admin/pages/VersionManager"));
const PageManagement = lazy(() => import("@/admin/pages/PageManagement"));
const DatabaseManager = lazy(() => import("@/admin/pages/DatabaseManager"));
const PermissionsManagement = lazy(() => import("@/admin/pages/PermissionsManagement"));
const SystemHealthCheck = lazy(() => import("@/admin/pages/SystemHealthCheck"));
const PaymentManagement = lazy(() => import("@/admin/pages/PaymentManagement"));
const PayPalSettings = lazy(() => import("@/admin/pages/PayPalSettings"));
const PayPalLivePayments = lazy(() => import("@/admin/pages/PayPalLivePayments"));
const CouponsManagement = lazy(() => import("@/admin/pages/CouponsManagement"));
const Prospecting = lazy(() => import("@/admin/pages/Prospecting"));
const MailBlusterTemplates = lazy(() => import("@/admin/pages/MailBlusterTemplates"));
const ApiKeysPage = lazy(() => import("@/admin/pages/ApiKeys"));
const PartnerSitesManagement = lazy(() => import("@/admin/pages/PartnerSitesManagement"));
const UtmBuilder = lazy(() => import("@/admin/pages/UtmBuilder"));
const CampaignsDashboard = lazy(() => import("@/admin/pages/CampaignsDashboard"));

// Supervisor
const SupervisorLayout = lazy(() => import("@/admin/layouts/SupervisorLayout"));
const SupervisorDashboard = lazy(() => import("@/admin/pages/supervisor/SupervisorDashboard"));
const SupervisorDrivers = lazy(() => import("@/admin/pages/supervisor/SupervisorDrivers"));
const SupervisorDelivery = lazy(() => import("@/admin/pages/supervisor/SupervisorDelivery"));
const SupervisorCallCenter = lazy(() => import("@/admin/pages/supervisor/SupervisorCallCenter"));
const SupervisorAgentDetail = lazy(() => import("@/admin/pages/supervisor/SupervisorAgentDetail"));
const SupervisorRestaurants = lazy(() => import("@/admin/pages/supervisor/SupervisorRestaurants"));

// Call Center
const CallCenterLayout = lazy(() => import("@/admin/layouts/CallCenterLayout"));
const CCDashboard = lazy(() => import("@/admin/pages/callcenter/CCDashboard"));
const IncomingCalls = lazy(() => import("@/admin/pages/callcenter/IncomingCalls"));
const ManualBooking = lazy(() => import("@/admin/pages/callcenter/ManualBooking"));
const RideAssign = lazy(() => import("@/admin/pages/callcenter/RideAssign"));
const CustomerSearch = lazy(() => import("@/admin/pages/callcenter/CustomerSearch"));
const DriverSearchCC = lazy(() => import("@/admin/pages/callcenter/DriverSearchCC"));
const Complaints = lazy(() => import("@/admin/pages/callcenter/Complaints"));
const Tickets = lazy(() => import("@/admin/pages/callcenter/Tickets"));
const Emergency = lazy(() => import("@/admin/pages/callcenter/Emergency"));
const CallHistory = lazy(() => import("@/admin/pages/callcenter/CallHistory"));
const CCReports = lazy(() => import("@/admin/pages/callcenter/CCReports"));
const DeliveryOrdersCC = lazy(() => import("@/admin/pages/callcenter/DeliveryOrdersCC"));
const RestaurantsCC = lazy(() => import("@/admin/pages/callcenter/RestaurantsCC"));
const AutoImport = lazy(() => import("@/admin/pages/callcenter/AutoImport"));
const GoogleMapsImport = lazy(() => import("@/admin/pages/callcenter/GoogleMapsImport"));
const AssistantKnowledge = lazy(() => import("@/admin/pages/callcenter/AssistantKnowledge"));
const InternalMessaging = lazy(() => import("@/admin/pages/callcenter/InternalMessaging"));
const Relations360 = lazy(() => import("@/admin/pages/callcenter/Relations360"));
const WalletRechargeRequests = lazy(() => import("@/admin/pages/callcenter/WalletRechargeRequests"));
const CallCenterLogin = lazy(() => import("@/admin/pages/CallCenterLogin"));
const AdminLogin = lazy(() => import("@/admin/pages/AdminLogin"));
const CommunityChat = lazy(() => import("@/pages/CommunityChat"));

export const adminRouteElements = (
  <>
    <Route path="/admin/login" element={L(AdminLogin)} />
    <Route path="/call-center/login" element={L(CallCenterLogin)} />
    <Route path="/setup-admin" element={<RequireRole>{L(SetupAdmin)}</RequireRole>} />

    <Route path="/admin" element={<RequireRole allowed={["admin"]}>{L(AdminLayout)}</RequireRole>}>
      <Route index element={L(AdminDashboardPage)} />
      <Route path="supervisors" element={L(SupervisorsPage)} />
      <Route path="users" element={L(RegisteredUsers)} />
      <Route path="requests" element={L(AdminRideRequests)} />
      <Route path="drivers" element={L(AdminDrivers)} />
      <Route path="driver-pipeline" element={L(DriverPipeline)} />
      <Route path="clients" element={L(AdminClients)} />
      <Route path="earnings" element={L(AdminEarnings)} />
      <Route path="map" element={L(AdminLiveMap)} />
      <Route path="alerts" element={L(AdminAlerts)} />
      <Route path="documents" element={L(AdminDocuments)} />
      <Route path="delivery" element={L(AdminDeliveryOrders)} />
      <Route path="call-center" element={L(AdminCallCenter)} />
      <Route path="restaurants" element={L(AdminRestaurants)} />
      <Route path="restaurants/:id/menu" element={L(AdminRestaurantMenu)} />
      <Route path="zones" element={L(ZonesManagement)} />
      <Route path="city-activation" element={L(CityActivation)} />
      <Route path="commission-rates" element={L(CommissionRatesPage)} />
      <Route path="smart-assistant" element={L(SmartAssistantPage)} />
      <Route path="sub-assistants" element={L(SubAssistantsPage)} />
      <Route path="driver-packages" element={L(DriverPackages)} />
      <Route path="themes" element={L(ThemesPage)} />
      <Route path="ads" element={L(AdsManagement)} />
      <Route path="analytics" element={L(VisitorAnalytics)} />
      <Route path="growth" element={L(GrowthAnalytics)} />
      <Route path="utm-builder" element={L(UtmBuilder)} />
      <Route path="campaigns" element={L(CampaignsDashboard)} />
      <Route path="versions" element={L(VersionManager)} />
      <Route path="settings" element={L(AdminSettings)} />
      <Route path="pages" element={L(PageManagement)} />
      <Route path="database" element={L(DatabaseManager)} />
      <Route path="permissions" element={L(PermissionsManagement)} />
      <Route path="messaging" element={L(InternalMessaging)} />
      <Route path="community-chat" element={L(AdminCommunityChat)} />
      <Route path="health-check" element={L(SystemHealthCheck)} />
      <Route path="wallet-recharge" element={L(WalletRechargeRequests)} />
      <Route path="payments" element={L(PaymentManagement)} />
      <Route path="paypal-settings" element={L(PayPalSettings)} />
      <Route path="paypal-live" element={L(PayPalLivePayments)} />
      <Route path="coupons" element={L(CouponsManagement)} />
      <Route path="prospecting" element={L(Prospecting)} />
      <Route path="mailbluster" element={L(MailBlusterTemplates)} />
      <Route path="api-keys" element={L(ApiKeysPage)} />
      <Route path="partner-sites" element={L(PartnerSitesManagement)} />
    </Route>

    <Route path="/call-center" element={<RequireRole allowed={["admin", "agent", "smart_admin_assistant"]}>{L(CallCenterLayout)}</RequireRole>}>
      <Route index element={L(CCDashboard)} />
      <Route path="incoming" element={L(IncomingCalls)} />
      <Route path="manual-booking" element={L(ManualBooking)} />
      <Route path="ride-assign" element={L(RideAssign)} />
      <Route path="customers" element={L(CustomerSearch)} />
      <Route path="drivers" element={L(DriverSearchCC)} />
      <Route path="complaints" element={L(Complaints)} />
      <Route path="tickets" element={L(Tickets)} />
      <Route path="delivery" element={L(DeliveryOrdersCC)} />
      <Route path="restaurants" element={L(RestaurantsCC)} />
      <Route path="restaurants/:id/menu" element={L(CCRestaurantMenu)} />
      <Route path="auto-import" element={L(AutoImport)} />
      <Route path="google-import" element={L(GoogleMapsImport)} />
      <Route path="emergency" element={L(Emergency)} />
      <Route path="history" element={L(CallHistory)} />
      <Route path="reports" element={L(CCReports)} />
      <Route path="map" element={L(AdminLiveMap)} />
      <Route path="alerts" element={L(AdminAlerts)} />
      <Route path="knowledge" element={L(AssistantKnowledge)} />
      <Route path="messaging" element={L(InternalMessaging)} />
      <Route path="community" element={L(CommunityChat)} />
      <Route path="analytics" element={L(VisitorAnalytics)} />
      <Route path="wallet-recharge" element={L(WalletRechargeRequests)} />
      <Route path="payments" element={L(PaymentManagement)} />
      <Route path="prospecting" element={L(Prospecting)} />
      <Route path="relations" element={L(Relations360)} />
    </Route>

    {/* ═══ Supervisor Panel ═══ */}
    <Route path="/supervisor" element={<RequireRole allowed={["moderator"]}>{L(SupervisorLayout)}</RequireRole>}>
      <Route index element={L(SupervisorDashboard)} />
      <Route path="drivers" element={L(SupervisorDrivers)} />
      <Route path="delivery" element={L(SupervisorDelivery)} />
      <Route path="call-center" element={L(SupervisorCallCenter)} />
      <Route path="agent/:agentId" element={L(SupervisorAgentDetail)} />
      <Route path="restaurants" element={L(SupervisorRestaurants)} />
      <Route path="city-activation" element={L(CityActivation)} />
      <Route path="messaging" element={L(InternalMessaging)} />
      <Route path="community" element={L(CommunityChat)} />
      <Route path="analytics" element={L(VisitorAnalytics)} />
      <Route path="wallet-recharge" element={L(WalletRechargeRequests)} />
      <Route path="payments" element={L(PaymentManagement)} />
      <Route path="prospecting" element={L(Prospecting)} />
    </Route>
  </>
);
