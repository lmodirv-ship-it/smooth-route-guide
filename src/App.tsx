import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";

// Core pages
import Splash from "./pages/Splash";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
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

// Client pages
import ClientHome from "./pages/ClientHome";
import ClientBooking from "./pages/client/ClientBooking";
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
        <Routes>
          {/* Core */}
          <Route path="/" element={<Splash />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/login" element={<Login />} />

          {/* Driver App */}
          <Route path="/driver" element={<DriverDashboard />} />
          <Route path="/driver/history" element={<DriverHistory />} />
          <Route path="/driver/notifications" element={<DriverNotifications />} />
          <Route path="/driver/settings" element={<DriverSettings />} />
          <Route path="/driver/documents" element={<DocumentUpload />} />
          <Route path="/driver/trip" element={<ActiveTrip />} />
          <Route path="/driver/profile" element={<DriverProfile />} />
          <Route path="/driver/wallet" element={<DriverWallet />} />
          <Route path="/driver/car-info" element={<CarInfo />} />
          <Route path="/driver/promotions" element={<DriverPromotions />} />
          <Route path="/driver/support" element={<DriverSupport />} />
          <Route path="/driver/status" element={<DriverStatus />} />
          <Route path="/driver/earnings" element={<DriverEarnings />} />

          {/* Client App */}
          <Route path="/client" element={<ClientHome />} />
          <Route path="/client/booking" element={<ClientBooking />} />
          <Route path="/client/tracking" element={<RideTracking />} />
          <Route path="/client/payment" element={<ClientPayment />} />
          <Route path="/client/wallet" element={<ClientWallet />} />
          <Route path="/client/history" element={<ClientHistory />} />
          <Route path="/client/profile" element={<ClientProfile />} />
          <Route path="/client/support" element={<ClientSupport />} />

          {/* Delivery App */}
          <Route path="/delivery" element={<DeliveryHome />} />
          <Route path="/delivery/tracking" element={<DeliveryTracking />} />
          <Route path="/delivery/history" element={<DeliveryHistory />} />
          <Route path="/delivery/courier/send" element={<CourierSend />} />
          <Route path="/delivery/courier/address" element={<CourierAddress />} />
          <Route path="/delivery/courier/track" element={<CourierTrack />} />
          <Route path="/delivery/support" element={<DeliverySupport />} />
          <Route path="/delivery/:category" element={<DeliveryCategory />} />

          {/* Admin Dashboard */}
          <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="requests" element={<AdminRideRequests />} />
            <Route path="drivers" element={<AdminDrivers />} />
            <Route path="clients" element={<AdminClients />} />
            <Route path="earnings" element={<AdminEarnings />} />
            <Route path="map" element={<AdminLiveMap />} />
            <Route path="alerts" element={<AdminAlerts />} />
            <Route path="documents" element={<AdminDocuments />} />
            <Route path="delivery" element={<AdminDeliveryOrders />} />
            <Route path="call-center" element={<AdminCallCenter />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Call Center */}
          <Route path="/call-center" element={<CallCenterLayout />}>
            <Route index element={<CCDashboard />} />
            <Route path="incoming" element={<IncomingCalls />} />
            <Route path="manual-booking" element={<ManualBooking />} />
            <Route path="ride-assign" element={<RideAssign />} />
            <Route path="customers" element={<CustomerSearch />} />
            <Route path="drivers" element={<DriverSearchCC />} />
            <Route path="complaints" element={<Complaints />} />
            <Route path="tickets" element={<Tickets />} />
            <Route path="delivery" element={<DeliveryOrdersCC />} />
            <Route path="emergency" element={<Emergency />} />
            <Route path="history" element={<CallHistory />} />
            <Route path="reports" element={<CCReports />} />
          </Route>

          {/* AI Agents */}
          <Route path="/ai" element={<AgentHub />} />
          <Route path="/assistant" element={<AIAssistant />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
