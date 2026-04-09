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
const StoreSubscription = lazy(() => import("@/pages/delivery/StoreSubscription"));

// ─── All other pages — lazy loaded for performance ───
const DriverPage = lazy(() => import("@/pages/DriverPage"));
const DriverHistory = lazy(() => import("@/pages/DriverHistory"));
const DriverNotifications = lazy(() => import("@/pages/DriverNotifications"));
const DriverSettings = lazy(() => import("@/pages/DriverSettings"));
const DocumentUpload = lazy(() => import("@/pages/DocumentUpload"));
const DriverProfile = lazy(() => import("@/pages/driver/DriverProfile"));
const DriverWallet = lazy(() => import("@/pages/driver/DriverWallet"));
const CarInfo = lazy(() => import("@/pages/driver/CarInfo"));
const DriverPromotions = lazy(() => import("@/pages/driver/DriverPromotions"));
const DriverSupport = lazy(() => import("@/pages/driver/DriverSupport"));
const DriverStatus = lazy(() => import("@/pages/driver/DriverStatus"));
const DriverEarnings = lazy(() => import("@/pages/driver/DriverEarnings"));
const DriverDelivery = lazy(() => import("@/pages/driver/DriverDelivery"));
const DeliveryDriverTracking = lazy(() => import("@/pages/driver/DeliveryDriverTracking"));
const DriverSubscription = lazy(() => import("@/pages/driver/DriverSubscription"));

const CustomerHub = lazy(() => import("@/pages/CustomerHub"));
const CustomerPage = lazy(() => import("@/pages/CustomerPage"));
const ClientBooking = lazy(() => import("@/pages/client/ClientBooking"));
const ClientPayment = lazy(() => import("@/pages/client/ClientPayment"));
const ClientWallet = lazy(() => import("@/pages/client/ClientWallet"));
const ClientHistory = lazy(() => import("@/pages/client/ClientHistory"));
const ClientProfile = lazy(() => import("@/pages/client/ClientProfile"));
const ClientSupport = lazy(() => import("@/pages/client/ClientSupport"));

const DeliveryHome = lazy(() => import("@/pages/delivery/DeliveryHome"));
const DeliveryCategory = lazy(() => import("@/pages/delivery/DeliveryCategory"));
const DeliveryHistory = lazy(() => import("@/pages/delivery/DeliveryHistory"));
const CourierSend = lazy(() => import("@/pages/delivery/CourierSend"));
const CourierAddress = lazy(() => import("@/pages/delivery/CourierAddress"));
const DeliverySupport = lazy(() => import("@/pages/delivery/DeliverySupport"));
const Cart = lazy(() => import("@/pages/delivery/Cart"));

const DynamicPage = lazy(() => import("@/pages/DynamicPage"));
const HNGroupePortal = lazy(() => import("@/pages/HNGroupePortal"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const Unsubscribe = lazy(() => import("@/pages/Unsubscribe"));

export const mainRouteElements = (
  <>
    {/* ─── Public pages (no layout wrapper needed) ─── */}
    <Route path="/" element={<LandingPage />} />
    <Route path="/hn-groupe" element={<LazyPage component={HNGroupePortal} />} />
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

      {/* ─── Customer /customer/* — hub is PUBLIC for browsing ─── */}
      <Route path="/customer" element={<LazyPage component={CustomerHub} />} />
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
      <Route path="/driver/delivery/tracking" element={<RequireRole allowed={["driver", "delivery"]}><LazyPage component={DeliveryDriverTracking} /></RequireRole>} />
      <Route path="/driver/subscription" element={<RequireRole allowed={["driver", "delivery"]}><LazyPage component={DriverSubscription} /></RequireRole>} />

      {/* ─── Delivery /delivery/* — browsing is PUBLIC, actions require auth ─── */}
      <Route path="/delivery" element={<LazyPage component={DeliveryHome} />} />
      <Route path="/delivery/restaurants" element={<LazyPage component={RestaurantsList} />} />
      <Route path="/delivery/restaurant/:id" element={<LazyPage component={RestaurantMenu} />} />
      <Route path="/delivery/store/:id" element={<LazyPage component={StoreDetail} />} />
      <Route path="/delivery/:category" element={<LazyPage component={DeliveryCategory} />} />
      {/* Actions require login */}
      <Route path="/delivery/tracking" element={<RequireRole allowed={["client"]}><LazyPage component={DeliveryTracking} /></RequireRole>} />
      <Route path="/delivery/history" element={<RequireRole allowed={["client"]}><LazyPage component={DeliveryHistory} /></RequireRole>} />
      <Route path="/delivery/courier/send" element={<RequireRole allowed={["client"]}><LazyPage component={CourierSend} /></RequireRole>} />
      <Route path="/delivery/courier/address" element={<RequireRole allowed={["client"]}><LazyPage component={CourierAddress} /></RequireRole>} />
      <Route path="/delivery/courier/track" element={<RequireRole allowed={["client"]}><LazyPage component={CourierTrack} /></RequireRole>} />
      <Route path="/delivery/support" element={<RequireRole allowed={["client"]}><LazyPage component={DeliverySupport} /></RequireRole>} />
      <Route path="/delivery/cart" element={<RequireRole allowed={["client"]}><LazyPage component={Cart} /></RequireRole>} />
      <Route path="/delivery/my-store" element={<RequireRole allowed={["store_owner"]}><LazyPage component={MyStore} /></RequireRole>} />
      <Route path="/delivery/store-subscription" element={<RequireRole allowed={["store_owner"]}><LazyPage component={StoreSubscription} /></RequireRole>} />
      <Route path="/delivery/order/:id" element={<RequireRole allowed={["client"]}><LazyPage component={OrderTracking} /></RequireRole>} />
      <Route path="/delivery/order" element={<RequireRole allowed={["client"]}><LazyPage component={OrderTracking} /></RequireRole>} />

      {/* ─── AI ─── */}
      <Route path="/ai" element={<RequireRole><LazyPage component={AgentHub} /></RequireRole>} />
      <Route path="/assistant" element={<RequireRole><LazyPage component={AIAssistant} /></RequireRole>} />
    </Route>

    {/* ─── Privacy Policy ─── */}
    <Route path="/privacy" element={<LazyPage component={PrivacyPolicy} />} />

    {/* ─── Unsubscribe ─── */}
    <Route path="/unsubscribe" element={<LazyPage component={Unsubscribe} />} />

    {/* ─── Dynamic CMS Pages ─── */}
    <Route path="/p/:slug" element={<LazyPage component={DynamicPage} />} />

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
