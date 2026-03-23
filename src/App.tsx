import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import AuthGuard from "@/components/AuthGuard";
import CallCenterGuard from "@/components/CallCenterGuard";
import SessionGuard from "@/components/SessionGuard";
import GlobalLogoutButton from "@/components/GlobalLogoutButton";

// Core pages
import Splash from "./pages/Splash";
import Welcome from "./pages/Welcome";
import AuthPage from "./pages/AuthPage";
import CompleteProfile from "./pages/CompleteProfile";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

// Driver pages
import DriverDashboard from "./pages/DriverDashboard";
import DriverHistory from "./pages/DriverHistory";
import DriverNotifications from "./pages/DriverNotifications";
import DriverSettings from "./pages/DriverSettings";
import DocumentUpload from "./pages/DocumentUpload";
import ActiveTrip from "./pages/ActiveTrip";
import DriverProfile from "./pages/driver/DriverProfile";
import DriverWallet from "./pages/driver/DriverWallet";
import CarInfo from "./pages/driver/CarInfo";
import DriverPromotions from "./pages/driver/DriverPromotions";
import DriverSupport from "./pages/driver/DriverSupport";
import DriverStatus from "./pages/driver/DriverStatus";
import DriverEarnings from "./pages/driver/DriverEarnings";
import DriverDelivery from "./pages/driver/DriverDelivery";

// Client pages
import ClientHome from "./pages/ClientHome";
import ClientBooking from "./pages/client/ClientBooking";
import CustomerPage from "./pages/CustomerPage";
import CustomerTracking from "./pages/CustomerTracking";
import DriverPage from "./pages/DriverPage";
import DriverTracking from "./pages/DriverTracking";
import RideTracking from "./pages/client/RideTracking";
import ClientPayment from "./pages/client/ClientPayment";
import ClientWallet from "./pages/client/ClientWallet";
import ClientHistory from "./pages/client/ClientHistory";
import ClientProfile from "./pages/client/ClientProfile";
import ClientSupport from "./pages/client/ClientSupport";

// Delivery pages
import DeliveryHome from "./pages/delivery/DeliveryHome";
import DeliveryCategory from "./pages/delivery/DeliveryCategory";
import DeliveryTracking from "./pages/delivery/DeliveryTracking";
import DeliveryHistory from "./pages/delivery/DeliveryHistory";
import CourierSend from "./pages/delivery/CourierSend";
import CourierAddress from "./pages/delivery/CourierAddress";
import CourierTrack from "./pages/delivery/CourierTrack";
import DeliverySupport from "./pages/delivery/DeliverySupport";
import RestaurantsList from "./pages/delivery/RestaurantsList";
import RestaurantMenu from "./pages/delivery/RestaurantMenu";
import Cart from "./pages/delivery/Cart";
import OrderTracking from "./pages/delivery/OrderTracking";

// Admin
import AdminLayout from "./components/AdminLayout";
import AdminGuard from "./components/AdminGuard";
import AdminDashboardPage from "./pages/admin/Dashboard";
import AdminRideRequests from "./pages/admin/RideRequests";
import AdminDrivers from "./pages/admin/Drivers";
import AdminClients from "./pages/admin/Clients";
import AdminEarnings from "./pages/admin/Earnings";
import AdminLiveMap from "./pages/admin/LiveMap";
import AdminAlerts from "./pages/admin/Alerts";
import AdminDocuments from "./pages/admin/Documents";
import AdminCallCenter from "./pages/admin/AdminCallCenter";
import AdminDeliveryOrders from "./pages/admin/DeliveryOrders";
import AdminSettings from "./pages/admin/Settings";
import AdminRestaurants from "./pages/admin/AdminRestaurants";
import RegisteredUsers from "./pages/admin/RegisteredUsers";
import SetupAdmin from "./pages/admin/SetupAdmin";

// Call Center
import CallCenterLayout from "./components/CallCenterLayout";
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

// AI
import AgentHub from "./pages/ai/AgentHub";
import AIAssistant from "./pages/AIAssistant";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CartProvider>
      <BrowserRouter>
        <GlobalLogoutButton />
        <Routes>
          {/* Core */}
          <Route path="/" element={<Splash />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/auth/:role" element={<AuthPage />} />
          <Route path="/complete-profile" element={<SessionGuard><CompleteProfile /></SessionGuard>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/setup-admin" element={<SessionGuard><SetupAdmin /></SessionGuard>} />

          {/* New Clean Customer/Driver Pages (Supabase only) */}
          <Route path="/customer" element={<SessionGuard><CustomerPage /></SessionGuard>} />
          <Route path="/customer-tracking" element={<SessionGuard><CustomerTracking /></SessionGuard>} />
          <Route path="/driver-panel" element={<SessionGuard><DriverPage /></SessionGuard>} />
          <Route path="/driver-tracking" element={<SessionGuard><DriverTracking /></SessionGuard>} />

          {/* Driver App - Protected */}
          <Route path="/driver" element={<AuthGuard requiredRole="driver"><DriverDashboard /></AuthGuard>} />
          <Route path="/driver/history" element={<AuthGuard requiredRole="driver"><DriverHistory /></AuthGuard>} />
          <Route path="/driver/notifications" element={<AuthGuard requiredRole="driver"><DriverNotifications /></AuthGuard>} />
          <Route path="/driver/settings" element={<AuthGuard requiredRole="driver"><DriverSettings /></AuthGuard>} />
          <Route path="/driver/documents" element={<AuthGuard requiredRole="driver"><DocumentUpload /></AuthGuard>} />
          <Route path="/driver/trip" element={<AuthGuard requiredRole="driver"><ActiveTrip /></AuthGuard>} />
          <Route path="/driver/profile" element={<AuthGuard requiredRole="driver"><DriverProfile /></AuthGuard>} />
          <Route path="/driver/wallet" element={<AuthGuard requiredRole="driver"><DriverWallet /></AuthGuard>} />
          <Route path="/driver/car-info" element={<AuthGuard requiredRole="driver"><CarInfo /></AuthGuard>} />
          <Route path="/driver/promotions" element={<AuthGuard requiredRole="driver"><DriverPromotions /></AuthGuard>} />
          <Route path="/driver/support" element={<AuthGuard requiredRole="driver"><DriverSupport /></AuthGuard>} />
          <Route path="/driver/status" element={<AuthGuard requiredRole="driver"><DriverStatus /></AuthGuard>} />
          <Route path="/driver/earnings" element={<AuthGuard requiredRole="driver"><DriverEarnings /></AuthGuard>} />
          <Route path="/driver/delivery" element={<AuthGuard requiredRole="driver"><DriverDelivery /></AuthGuard>} />

          {/* Client App - Protected */}
          <Route path="/client" element={<AuthGuard requiredRole="client"><ClientHome /></AuthGuard>} />
          <Route path="/client/booking" element={<AuthGuard requiredRole="client"><ClientBooking /></AuthGuard>} />
          <Route path="/client/tracking" element={<AuthGuard requiredRole="client"><RideTracking /></AuthGuard>} />
          <Route path="/client/payment" element={<AuthGuard requiredRole="client"><ClientPayment /></AuthGuard>} />
          <Route path="/client/wallet" element={<AuthGuard requiredRole="client"><ClientWallet /></AuthGuard>} />
          <Route path="/client/history" element={<AuthGuard requiredRole="client"><ClientHistory /></AuthGuard>} />
          <Route path="/client/profile" element={<AuthGuard requiredRole="client"><ClientProfile /></AuthGuard>} />
          <Route path="/client/support" element={<AuthGuard requiredRole="client"><ClientSupport /></AuthGuard>} />

          {/* Delivery App - Protected */}
          <Route path="/delivery" element={<AuthGuard requiredRole="delivery"><DeliveryHome /></AuthGuard>} />
          <Route path="/delivery/tracking" element={<AuthGuard requiredRole="delivery"><DeliveryTracking /></AuthGuard>} />
          <Route path="/delivery/history" element={<AuthGuard requiredRole="delivery"><DeliveryHistory /></AuthGuard>} />
          <Route path="/delivery/courier/send" element={<AuthGuard requiredRole="delivery"><CourierSend /></AuthGuard>} />
          <Route path="/delivery/courier/address" element={<AuthGuard requiredRole="delivery"><CourierAddress /></AuthGuard>} />
          <Route path="/delivery/courier/track" element={<AuthGuard requiredRole="delivery"><CourierTrack /></AuthGuard>} />
          <Route path="/delivery/support" element={<AuthGuard requiredRole="delivery"><DeliverySupport /></AuthGuard>} />
          <Route path="/delivery/restaurants" element={<AuthGuard requiredRole="delivery"><RestaurantsList /></AuthGuard>} />
          <Route path="/delivery/restaurant/:id" element={<AuthGuard requiredRole="delivery"><RestaurantMenu /></AuthGuard>} />
          <Route path="/delivery/cart" element={<AuthGuard requiredRole="delivery"><Cart /></AuthGuard>} />
          <Route path="/delivery/order/:id" element={<AuthGuard requiredRole="delivery"><OrderTracking /></AuthGuard>} />
          <Route path="/delivery/order" element={<AuthGuard requiredRole="delivery"><OrderTracking /></AuthGuard>} />
          <Route path="/delivery/:category" element={<AuthGuard requiredRole="delivery"><DeliveryCategory /></AuthGuard>} />

          {/* Admin Dashboard */}
          <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
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
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Call Center */}
          <Route path="/call-center" element={<CallCenterGuard><CallCenterLayout /></CallCenterGuard>}>
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

          {/* AI Agents */}
          <Route path="/ai" element={<SessionGuard><AgentHub /></SessionGuard>} />
          <Route path="/assistant" element={<SessionGuard><AIAssistant /></SessionGuard>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
