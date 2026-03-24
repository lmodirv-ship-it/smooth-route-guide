/**
 * Main Application Routes — customer, driver, delivery, and public pages.
 * Separated from Admin routes (src/admin/AdminRoutes.tsx).
 * Shares the same Supabase database.
 */
import { Route, Navigate } from "react-router-dom";
import RequireRole from "@/components/RequireRole";
import MainLayout from "./MainLayout";

// ─── Core (public) pages ───
import LandingPage from "@/pages/LandingPage";
import Splash from "@/pages/Splash";
import Welcome from "@/pages/Welcome";
import AuthPage from "@/pages/AuthPage";
import CompleteProfile from "@/pages/CompleteProfile";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";

// ─── Driver pages ───
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
import DriverDelivery from "@/pages/driver/DriverDelivery";

// ─── Client pages ───
import CustomerHub from "@/pages/CustomerHub";
import CustomerPage from "@/pages/CustomerPage";
import CustomerTracking from "@/pages/CustomerTracking";
import ClientBooking from "@/pages/client/ClientBooking";
import ClientPayment from "@/pages/client/ClientPayment";
import ClientWallet from "@/pages/client/ClientWallet";
import ClientHistory from "@/pages/client/ClientHistory";
import ClientProfile from "@/pages/client/ClientProfile";
import ClientSupport from "@/pages/client/ClientSupport";

// ─── Delivery pages ───
import DeliveryHome from "@/pages/delivery/DeliveryHome";
import DeliveryCategory from "@/pages/delivery/DeliveryCategory";
import DeliveryTracking from "@/pages/delivery/DeliveryTracking";
import DeliveryHistory from "@/pages/delivery/DeliveryHistory";
import CourierSend from "@/pages/delivery/CourierSend";
import CourierAddress from "@/pages/delivery/CourierAddress";
import CourierTrack from "@/pages/delivery/CourierTrack";
import DeliverySupport from "@/pages/delivery/DeliverySupport";
import RestaurantsList from "@/pages/delivery/RestaurantsList";
import RestaurantMenu from "@/pages/delivery/RestaurantMenu";
import Cart from "@/pages/delivery/Cart";
import OrderTracking from "@/pages/delivery/OrderTracking";
import StoreDetail from "@/pages/delivery/StoreDetail";
import MyStore from "@/pages/delivery/MyStore";

// ─── AI ───
import AgentHub from "@/pages/ai/AgentHub";
import AIAssistant from "@/pages/AIAssistant";

export const mainRouteElements = (
  <>
    {/* ─── Public pages (no layout wrapper needed) ─── */}
    <Route path="/" element={<LandingPage />} />
    <Route path="/splash" element={<Splash />} />
    <Route path="/welcome" element={<Welcome />} />
    <Route path="/login" element={<AuthPage />} />
    <Route path="/auth/:role" element={<AuthPage />} />
    <Route path="/complete-profile" element={<RequireRole><CompleteProfile /></RequireRole>} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />

    {/* ═══════════════════════════════════════════
        MAIN APP — wrapped in MainLayout
       ═══════════════════════════════════════════ */}
    <Route element={<MainLayout />}>

      {/* ─── Customer /customer/* ─── */}
      <Route path="/customer" element={<RequireRole allowed={["client"]}><CustomerHub /></RequireRole>} />
      <Route path="/customer/ride" element={<RequireRole allowed={["client"]}><CustomerPage /></RequireRole>} />
      <Route path="/customer/tracking" element={<RequireRole allowed={["client"]}><CustomerTracking /></RequireRole>} />
      <Route path="/customer/booking" element={<RequireRole allowed={["client"]}><ClientBooking /></RequireRole>} />
      <Route path="/customer/payment" element={<RequireRole allowed={["client"]}><ClientPayment /></RequireRole>} />
      <Route path="/customer/wallet" element={<RequireRole allowed={["client"]}><ClientWallet /></RequireRole>} />
      <Route path="/customer/history" element={<RequireRole allowed={["client"]}><ClientHistory /></RequireRole>} />
      <Route path="/customer/profile" element={<RequireRole allowed={["client"]}><ClientProfile /></RequireRole>} />
      <Route path="/customer/support" element={<RequireRole allowed={["client"]}><ClientSupport /></RequireRole>} />

      {/* ─── Driver /driver/* ─── */}
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
      <Route path="/driver/delivery" element={<RequireRole allowed={["driver", "delivery"]}><DriverDelivery /></RequireRole>} />

      {/* ─── Delivery /delivery/* ─── */}
      <Route path="/delivery" element={<RequireRole allowed={["client"]}><DeliveryHome /></RequireRole>} />
      <Route path="/delivery/tracking" element={<RequireRole allowed={["client"]}><DeliveryTracking /></RequireRole>} />
      <Route path="/delivery/history" element={<RequireRole allowed={["client"]}><DeliveryHistory /></RequireRole>} />
      <Route path="/delivery/courier/send" element={<RequireRole allowed={["client"]}><CourierSend /></RequireRole>} />
      <Route path="/delivery/courier/address" element={<RequireRole allowed={["client"]}><CourierAddress /></RequireRole>} />
      <Route path="/delivery/courier/track" element={<RequireRole allowed={["client"]}><CourierTrack /></RequireRole>} />
      <Route path="/delivery/support" element={<RequireRole allowed={["client"]}><DeliverySupport /></RequireRole>} />
      <Route path="/delivery/restaurants" element={<RequireRole allowed={["client"]}><RestaurantsList /></RequireRole>} />
      <Route path="/delivery/restaurant/:id" element={<RequireRole allowed={["client"]}><RestaurantMenu /></RequireRole>} />
      <Route path="/delivery/cart" element={<RequireRole allowed={["client"]}><Cart /></RequireRole>} />
      <Route path="/delivery/store/:id" element={<RequireRole allowed={["client"]}><StoreDetail /></RequireRole>} />
      <Route path="/delivery/my-store" element={<RequireRole allowed={["store_owner"]}><MyStore /></RequireRole>} />
      <Route path="/delivery/order/:id" element={<RequireRole allowed={["client"]}><OrderTracking /></RequireRole>} />
      <Route path="/delivery/order" element={<RequireRole allowed={["client"]}><OrderTracking /></RequireRole>} />
      <Route path="/delivery/:category" element={<RequireRole allowed={["client"]}><DeliveryCategory /></RequireRole>} />

      {/* ─── AI ─── */}
      <Route path="/ai" element={<RequireRole><AgentHub /></RequireRole>} />
      <Route path="/assistant" element={<RequireRole><AIAssistant /></RequireRole>} />
    </Route>

    {/* ═══════════════════════════════════════════
        SHORTCUT + LEGACY REDIRECTS
        Consolidated: /client/* → /customer/*, /driver-panel/* → /driver/*
       ═══════════════════════════════════════════ */}
    {[
      ["/client", "/customer"],
      ["/client/tracking", "/customer/tracking"],
      ["/client/booking", "/customer/booking"],
      ["/client/payment", "/customer/payment"],
      ["/client/wallet", "/customer/wallet"],
      ["/client/history", "/customer/history"],
      ["/client/profile", "/customer/profile"],
      ["/client/support", "/customer/support"],
      ["/customer-tracking", "/customer/tracking"],
      ["/driver-panel", "/driver"],
      ["/driver-tracking", "/driver/tracking"],
    ].map(([from, to]) => (
      <Route key={from} path={from} element={<Navigate to={to} replace />} />
    ))}

    {/* Catch-all driver-panel/* → driver/* */}
    <Route path="/driver-panel/*" element={<Navigate to="/driver" replace />} />

    <Route path="*" element={<NotFound />} />
  </>
);
