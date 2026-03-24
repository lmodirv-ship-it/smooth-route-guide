import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import { I18nProvider } from "@/i18n/context";
import RequireRole from "@/components/RequireRole";
import GlobalLogoutButton from "@/components/GlobalLogoutButton";
import GlobalNotificationListener from "@/components/GlobalNotificationListener";
import LandingPage from "@/pages/LandingPage";

// ─── Core (public) pages ───
import Splash from "./pages/Splash";
import Welcome from "./pages/Welcome";
import AuthPage from "./pages/AuthPage";
import CompleteProfile from "./pages/CompleteProfile";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

// ─── Driver pages ───
import DriverPage from "./pages/DriverPage";
import DriverTracking from "./pages/DriverTracking";
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

// ─── Client pages ───
import CustomerPage from "./pages/CustomerPage";
import CustomerTracking from "./pages/CustomerTracking";
import ClientBooking from "./pages/client/ClientBooking";
import ClientPayment from "./pages/client/ClientPayment";
import ClientWallet from "./pages/client/ClientWallet";
import ClientHistory from "./pages/client/ClientHistory";
import ClientProfile from "./pages/client/ClientProfile";
import ClientSupport from "./pages/client/ClientSupport";

// ─── Delivery pages ───
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

// ─── AI ───
import AgentHub from "./pages/ai/AgentHub";
import AIAssistant from "./pages/AIAssistant";

// ─── Admin Panel (logically separated module) ───
import { adminRouteElements } from "./admin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CartProvider>
      <BrowserRouter>
        <GlobalLogoutButton />
        <GlobalNotificationListener />
        <Routes>
          {/* ─── Core (public) ─── */}
          <Route path="/" element={<Splash />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/auth/:role" element={<AuthPage />} />
          <Route path="/complete-profile" element={<RequireRole><CompleteProfile /></RequireRole>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* ═══════════════════════════════════════════
              CANONICAL: Customer  /customer/*
             ═══════════════════════════════════════════ */}
          <Route path="/customer" element={<RequireRole allowed={["client"]}><CustomerPage /></RequireRole>} />
          <Route path="/customer/tracking" element={<RequireRole allowed={["client"]}><CustomerTracking /></RequireRole>} />
          <Route path="/customer/booking" element={<RequireRole allowed={["client"]}><ClientBooking /></RequireRole>} />
          <Route path="/customer/payment" element={<RequireRole allowed={["client"]}><ClientPayment /></RequireRole>} />
          <Route path="/customer/wallet" element={<RequireRole allowed={["client"]}><ClientWallet /></RequireRole>} />
          <Route path="/customer/history" element={<RequireRole allowed={["client"]}><ClientHistory /></RequireRole>} />
          <Route path="/customer/profile" element={<RequireRole allowed={["client"]}><ClientProfile /></RequireRole>} />
          <Route path="/customer/support" element={<RequireRole allowed={["client"]}><ClientSupport /></RequireRole>} />

          {/* ═══════════════════════════════════════════
              CANONICAL: Driver  /driver/*
             ═══════════════════════════════════════════ */}
          <Route path="/driver" element={<RequireRole allowed={["driver"]}><DriverPage /></RequireRole>} />
          <Route path="/driver/tracking" element={<RequireRole allowed={["driver"]}><DriverTracking /></RequireRole>} />
          <Route path="/driver/history" element={<RequireRole allowed={["driver"]}><DriverHistory /></RequireRole>} />
          <Route path="/driver/notifications" element={<RequireRole allowed={["driver"]}><DriverNotifications /></RequireRole>} />
          <Route path="/driver/settings" element={<RequireRole allowed={["driver"]}><DriverSettings /></RequireRole>} />
          <Route path="/driver/documents" element={<RequireRole allowed={["driver"]}><DocumentUpload /></RequireRole>} />
          <Route path="/driver/trip" element={<RequireRole allowed={["driver"]}><ActiveTrip /></RequireRole>} />
          <Route path="/driver/profile" element={<RequireRole allowed={["driver"]}><DriverProfile /></RequireRole>} />
          <Route path="/driver/wallet" element={<RequireRole allowed={["driver"]}><DriverWallet /></RequireRole>} />
          <Route path="/driver/car-info" element={<RequireRole allowed={["driver"]}><CarInfo /></RequireRole>} />
          <Route path="/driver/promotions" element={<RequireRole allowed={["driver"]}><DriverPromotions /></RequireRole>} />
          <Route path="/driver/support" element={<RequireRole allowed={["driver"]}><DriverSupport /></RequireRole>} />
          <Route path="/driver/status" element={<RequireRole allowed={["driver"]}><DriverStatus /></RequireRole>} />
          <Route path="/driver/earnings" element={<RequireRole allowed={["driver"]}><DriverEarnings /></RequireRole>} />
          <Route path="/driver/delivery" element={<RequireRole allowed={["driver"]}><DriverDelivery /></RequireRole>} />

          {/* ═══════════════════════════════════════════
              CANONICAL: Delivery  /delivery/*
             ═══════════════════════════════════════════ */}
          <Route path="/delivery" element={<RequireRole allowed={["delivery"]}><DeliveryHome /></RequireRole>} />
          <Route path="/delivery/tracking" element={<RequireRole allowed={["delivery"]}><DeliveryTracking /></RequireRole>} />
          <Route path="/delivery/history" element={<RequireRole allowed={["delivery"]}><DeliveryHistory /></RequireRole>} />
          <Route path="/delivery/courier/send" element={<RequireRole allowed={["delivery"]}><CourierSend /></RequireRole>} />
          <Route path="/delivery/courier/address" element={<RequireRole allowed={["delivery"]}><CourierAddress /></RequireRole>} />
          <Route path="/delivery/courier/track" element={<RequireRole allowed={["delivery"]}><CourierTrack /></RequireRole>} />
          <Route path="/delivery/support" element={<RequireRole allowed={["delivery"]}><DeliverySupport /></RequireRole>} />
          <Route path="/delivery/restaurants" element={<RequireRole allowed={["delivery"]}><RestaurantsList /></RequireRole>} />
          <Route path="/delivery/restaurant/:id" element={<RequireRole allowed={["delivery"]}><RestaurantMenu /></RequireRole>} />
          <Route path="/delivery/cart" element={<RequireRole allowed={["delivery"]}><Cart /></RequireRole>} />
          <Route path="/delivery/order/:id" element={<RequireRole allowed={["delivery"]}><OrderTracking /></RequireRole>} />
          <Route path="/delivery/order" element={<RequireRole allowed={["delivery"]}><OrderTracking /></RequireRole>} />
          <Route path="/delivery/:category" element={<RequireRole allowed={["delivery"]}><DeliveryCategory /></RequireRole>} />

          {/* ═══════════════════════════════════════════
              ADMIN PANEL (separated module)
             ═══════════════════════════════════════════ */}
          {adminRouteElements}

          {/* ─── AI ─── */}
          <Route path="/ai" element={<RequireRole><AgentHub /></RequireRole>} />
          <Route path="/assistant" element={<RequireRole><AIAssistant /></RequireRole>} />

          {/* ═══════════════════════════════════════════
              LEGACY REDIRECTS — backward compatibility
             ═══════════════════════════════════════════ */}
          {/* /client/* → /customer/* */}
          <Route path="/client" element={<Navigate to="/customer" replace />} />
          <Route path="/client/tracking" element={<Navigate to="/customer/tracking" replace />} />
          <Route path="/client/booking" element={<Navigate to="/customer/booking" replace />} />
          <Route path="/client/payment" element={<Navigate to="/customer/payment" replace />} />
          <Route path="/client/wallet" element={<Navigate to="/customer/wallet" replace />} />
          <Route path="/client/history" element={<Navigate to="/customer/history" replace />} />
          <Route path="/client/profile" element={<Navigate to="/customer/profile" replace />} />
          <Route path="/client/support" element={<Navigate to="/customer/support" replace />} />
          <Route path="/customer-tracking" element={<Navigate to="/customer/tracking" replace />} />

          {/* /driver-panel/* → /driver/* */}
          <Route path="/driver-panel" element={<Navigate to="/driver" replace />} />
          <Route path="/driver-panel/tracking" element={<Navigate to="/driver/tracking" replace />} />
          <Route path="/driver-panel/history" element={<Navigate to="/driver/history" replace />} />
          <Route path="/driver-panel/notifications" element={<Navigate to="/driver/notifications" replace />} />
          <Route path="/driver-panel/settings" element={<Navigate to="/driver/settings" replace />} />
          <Route path="/driver-panel/documents" element={<Navigate to="/driver/documents" replace />} />
          <Route path="/driver-panel/trip" element={<Navigate to="/driver/trip" replace />} />
          <Route path="/driver-panel/profile" element={<Navigate to="/driver/profile" replace />} />
          <Route path="/driver-panel/wallet" element={<Navigate to="/driver/wallet" replace />} />
          <Route path="/driver-panel/car-info" element={<Navigate to="/driver/car-info" replace />} />
          <Route path="/driver-panel/promotions" element={<Navigate to="/driver/promotions" replace />} />
          <Route path="/driver-panel/support" element={<Navigate to="/driver/support" replace />} />
          <Route path="/driver-panel/status" element={<Navigate to="/driver/status" replace />} />
          <Route path="/driver-panel/earnings" element={<Navigate to="/driver/earnings" replace />} />
          <Route path="/driver-panel/delivery" element={<Navigate to="/driver/delivery" replace />} />
          <Route path="/driver-tracking" element={<Navigate to="/driver/tracking" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
