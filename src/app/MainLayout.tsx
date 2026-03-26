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
    <div className="fixed top-3 left-3 z-[60] flex items-center gap-2">
      <GlobalLogoutButton />
      <LanguageSwitcher />
    </div>
    <Outlet />
  </>
);

export default MainLayout;
