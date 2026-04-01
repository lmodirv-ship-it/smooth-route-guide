/**
 * Main Application Routes — customer, driver, delivery, and public pages.
 * Separated from Admin routes (src/admin/AdminRoutes.tsx).
 * Shares the same Supabase database.
 *
 * Heavy pages use React.lazy for code-splitting.
 */
import { Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import RequireRole from "@/components/RequireRole";
import MainLayout from "./MainLayout";

// ─── Lazy loading wrapper ───
const LazyPage = ({ component: Component }: { component: React.LazyExoticComponent<any> }) => (
  <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
    <Component />
  </Suspense>
);

// ─── Core (public) pages — eagerly loaded ───
import LandingPage from "@/pages/LandingPage";
import Splash from "@/pages/Splash";
import Welcome from "@/pages/Welcome";
import AuthPage from "@/pages/AuthPage";
import CompleteProfile from "@/pages/CompleteProfile";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";

// ─── Heavy pages — lazy loaded ───
const CustomerTracking = lazy(() => import("@/pages/CustomerTracking"));
const DriverTracking = lazy(() => import("@/pages/DriverTracking"));
const ActiveTrip = lazy(() => import("@/pages/ActiveTrip"));
const RestaurantsList = lazy(() => import("@/pages/delivery/RestaurantsList"));
const RestaurantMenu = lazy(() => import("@/pages/delivery/RestaurantMenu"));
const StoreDetail = lazy(() => import("@/pages/delivery/StoreDetail"));
const DeliveryTracking = lazy(() => import("@/pages/delivery/DeliveryTracking"));
const OrderTracking = lazy(() => import("@/pages/delivery/OrderTracking"));
const CourierTrack = lazy(() => import("@/pages/delivery/CourierTrack"));
const AgentHub = lazy(() => import("@/pages/ai/AgentHub"));
const AIAssistant = lazy(() => import("@/pages/AIAssistant"));
const CommunityChat = lazy(() => import("@/pages/CommunityChat"));
const MyStore = lazy(() => import("@/pages/delivery/MyStore"));

// ─── Regular pages — eagerly loaded ───
import DriverPage from "@/pages/DriverPage";
import DriverHistory from "@/pages/DriverHistory";
import DriverNotifications from "@/pages/DriverNotifications";
import DriverSettings from "@/pages/DriverSettings";
import DocumentUpload from "@/pages/DocumentUpload";
import DriverProfile from "@/pages/driver/DriverProfile";
import DriverWallet from "@/pages/driver/DriverWallet";
import CarInfo from "@/pages/driver/CarInfo";
import DriverPromotions from "@/pages/driver/DriverPromotions";
import DriverSupport from "@/pages/driver/DriverSupport";
import DriverStatus from "@/pages/driver/DriverStatus";
import DriverEarnings from "@/pages/driver/DriverEarnings";
import DriverDelivery from "@/pages/driver/DriverDelivery";
import DriverSubscription from "@/pages/driver/DriverSubscription";

import CustomerHub from "@/pages/CustomerHub";
import CustomerPage from "@/pages/CustomerPage";
import ClientBooking from "@/pages/client/ClientBooking";
import ClientPayment from "@/pages/client/ClientPayment";
import ClientWallet from "@/pages/client/ClientWallet";
import ClientHistory from "@/pages/client/ClientHistory";
import ClientProfile from "@/pages/client/ClientProfile";
import ClientSupport from "@/pages/client/ClientSupport";

import DeliveryHome from "@/pages/delivery/DeliveryHome";
import DeliveryCategory from "@/pages/delivery/DeliveryCategory";
import DeliveryHistory from "@/pages/delivery/DeliveryHistory";
import CourierSend from "@/pages/delivery/CourierSend";
import CourierAddress from "@/pages/delivery/CourierAddress";
import DeliverySupport from "@/pages/delivery/DeliverySupport";
import Cart from "@/pages/delivery/Cart";

import DynamicPage from "@/pages/DynamicPage";

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
    <Route path="/community" element={<RequireRole><LazyPage component={CommunityChat} /></RequireRole>} />

    {/* ═══════════════════════════════════════════
        MAIN APP — wrapped in MainLayout
       ═══════════════════════════════════════════ */}
    <Route element={<MainLayout />}>

      {/* ─── Customer /customer/* ─── */}
      <Route path="/customer" element={<RequireRole allowed={["client"]}><LazyPage component={CustomerHub} /></RequireRole>} />
      <Route path="/customer/ride" element={<RequireRole allowed={["client"]}><LazyPage component={CustomerPage} /></RequireRole>} />
      <Route path="/customer/tracking" element={<RequireRole allowed={["client"]}><LazyPage component={CustomerTracking} /></RequireRole>} />
      <Route path="/customer/booking" element={<RequireRole allowed={["client"]}><LazyPage component={ClientBooking} /></RequireRole>} />
      <Route path="/customer/payment" element={<RequireRole allowed={["client"]}><LazyPage component={ClientPayment} /></RequireRole>} />
      <Route path="/customer/wallet" element={<RequireRole allowed={["client"]}><LazyPage component={ClientWallet} /></RequireRole>} />
      <Route path="/customer/history" element={<RequireRole allowed={["client"]}><LazyPage component={ClientHistory} /></RequireRole>} />
      <Route path="/customer/profile" element={<RequireRole allowed={["client"]}><LazyPage component={ClientProfile} /></RequireRole>} />
      <Route path="/customer/support" element={<RequireRole allowed={["client"]}><LazyPage component={ClientSupport} /></RequireRole>} />

      {/* ─── Driver /driver/* ─── */}
      <Route path="/driver" element={<RequireRole allowed={["driver"]}><LazyPage component={DriverPage} /></RequireRole>} />
      <Route path="/driver/tracking" element={<RequireRole allowed={["driver"]}><LazyPage component={DriverTracking} /></RequireRole>} />
      <Route path="/driver/history" element={<RequireRole allowed={["driver"]}><LazyPage component={DriverHistory} /></RequireRole>} />
      <Route path="/driver/notifications" element={<RequireRole allowed={["driver"]}><LazyPage component={DriverNotifications} /></RequireRole>} />
      <Route path="/driver/settings" element={<RequireRole allowed={["driver"]}><LazyPage component={DriverSettings} /></RequireRole>} />
      <Route path="/driver/documents" element={<RequireRole allowed={["driver"]}><LazyPage component={DocumentUpload} /></RequireRole>} />
      <Route path="/driver/trip" element={<RequireRole allowed={["driver"]}><LazyPage component={ActiveTrip} /></RequireRole>} />
      <Route path="/driver/profile" element={<RequireRole allowed={["driver"]}><LazyPage component={DriverProfile} /></RequireRole>} />
      <Route path="/driver/wallet" element={<RequireRole allowed={["driver"]}><LazyPage component={DriverWallet} /></RequireRole>} />
      <Route path="/driver/car-info" element={<RequireRole allowed={["driver"]}><LazyPage component={CarInfo} /></RequireRole>} />
      <Route path="/driver/promotions" element={<RequireRole allowed={["driver"]}><LazyPage component={DriverPromotions} /></RequireRole>} />
      <Route path="/driver/support" element={<RequireRole allowed={["driver"]}><LazyPage component={DriverSupport} /></RequireRole>} />
      <Route path="/driver/status" element={<RequireRole allowed={["driver"]}><LazyPage component={DriverStatus} /></RequireRole>} />
      <Route path="/driver/earnings" element={<RequireRole allowed={["driver"]}><LazyPage component={DriverEarnings} /></RequireRole>} />
      <Route path="/driver/delivery" element={<RequireRole allowed={["driver", "delivery"]}><LazyPage component={DriverDelivery} /></RequireRole>} />
      <Route path="/driver/subscription" element={<RequireRole allowed={["driver", "delivery"]}><LazyPage component={DriverSubscription} /></RequireRole>} />

      {/* ─── Delivery /delivery/* ─── */}
      <Route path="/delivery" element={<RequireRole allowed={["client"]}><LazyPage component={DeliveryHome} /></RequireRole>} />
      <Route path="/delivery/tracking" element={<RequireRole allowed={["client"]}><LazyPage component={DeliveryTracking} /></RequireRole>} />
      <Route path="/delivery/history" element={<RequireRole allowed={["client"]}><LazyPage component={DeliveryHistory} /></RequireRole>} />
      <Route path="/delivery/courier/send" element={<RequireRole allowed={["client"]}><LazyPage component={CourierSend} /></RequireRole>} />
      <Route path="/delivery/courier/address" element={<RequireRole allowed={["client"]}><LazyPage component={CourierAddress} /></RequireRole>} />
      <Route path="/delivery/courier/track" element={<RequireRole allowed={["client"]}><LazyPage component={CourierTrack} /></RequireRole>} />
      <Route path="/delivery/support" element={<RequireRole allowed={["client"]}><LazyPage component={DeliverySupport} /></RequireRole>} />
      <Route path="/delivery/restaurants" element={<RequireRole allowed={["client"]}><LazyPage component={RestaurantsList} /></RequireRole>} />
      <Route path="/delivery/restaurant/:id" element={<RequireRole allowed={["client"]}><LazyPage component={RestaurantMenu} /></RequireRole>} />
      <Route path="/delivery/cart" element={<RequireRole allowed={["client"]}><LazyPage component={Cart} /></RequireRole>} />
      <Route path="/delivery/store/:id" element={<RequireRole allowed={["client"]}><LazyPage component={StoreDetail} /></RequireRole>} />
      <Route path="/delivery/my-store" element={<RequireRole allowed={["store_owner"]}><LazyPage component={MyStore} /></RequireRole>} />
      <Route path="/delivery/order/:id" element={<RequireRole allowed={["client"]}><LazyPage component={OrderTracking} /></RequireRole>} />
      <Route path="/delivery/order" element={<RequireRole allowed={["client"]}><LazyPage component={OrderTracking} /></RequireRole>} />
      <Route path="/delivery/:category" element={<RequireRole allowed={["client"]}><LazyPage component={DeliveryCategory} /></RequireRole>} />

      {/* ─── AI ─── */}
      <Route path="/ai" element={<RequireRole><LazyPage component={AgentHub} /></RequireRole>} />
      <Route path="/assistant" element={<RequireRole><LazyPage component={AIAssistant} /></RequireRole>} />
    </Route>

    {/* ─── Dynamic CMS Pages ─── */}
    <Route path="/p/:slug" element={<DynamicPage />} />

    {/* ═══════════════════════════════════════════
        SHORTCUT + LEGACY REDIRECTS
        Consolidated: /client/* → /customer/*, /driver-panel/* → /driver/*
       ═══════════════════════════════════════════ */}
    {[
      ["/restaurants", "/delivery/restaurants"],
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
