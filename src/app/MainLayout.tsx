/**
 * Main Application Layout — wraps customer, driver, and delivery interfaces.
 * Provides shared context (cart, i18n, notifications) and global UI elements.
 * Separated from Admin Panel which has its own layout in src/admin/.
 */
import { Outlet } from "react-router-dom";
import GlobalLogoutButton from "@/components/GlobalLogoutButton";
import GlobalNotificationListener from "@/components/GlobalNotificationListener";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const MainLayout = () => (
  <>
    <GlobalNotificationListener />
    <div className="fixed top-2 left-2 md:top-3 md:left-3 z-[60] flex items-center gap-1.5 md:gap-2 scale-90 md:scale-100 origin-top-left">
      <GlobalLogoutButton />
      <LanguageSwitcher />
    </div>
    <Outlet />
  </>
);

export default MainLayout;
