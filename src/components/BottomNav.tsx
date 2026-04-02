import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home, MapPin, Clock, Wallet, User,
  Car, TrendingUp, FileText, Settings,
  ShoppingBag, UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/i18n/context";

interface NavItem {
  icon: LucideIcon;
  labelKey: string;
  path: string;
}

const clientNav: NavItem[] = [
  { icon: Home, labelKey: "home", path: "/customer" },
  { icon: MapPin, labelKey: "booking", path: "/customer/ride" },
  { icon: Clock, labelKey: "history", path: "/customer/history" },
  { icon: Wallet, labelKey: "wallet", path: "/customer/wallet" },
  { icon: User, labelKey: "myAccount", path: "/customer/profile" },
];

const driverNav: NavItem[] = [
  { icon: Car, labelKey: "home", path: "/driver" },
  { icon: Settings, labelKey: "settings", path: "/driver/settings" },
];

const deliveryNav: NavItem[] = [
  { icon: Home, labelKey: "home", path: "/delivery" },
  { icon: UtensilsCrossed, labelKey: "restaurants", path: "/delivery/restaurants" },
  { icon: ShoppingBag, labelKey: "cart", path: "/delivery/cart" },
  { icon: Clock, labelKey: "history", path: "/delivery/history" },
  { icon: User, labelKey: "myAccount", path: "/customer/profile" },
];

type Role = "client" | "driver" | "delivery";

const navMap: Record<Role, NavItem[]> = {
  client: clientNav,
  driver: driverNav,
  delivery: deliveryNav,
};

// Map role to translation section
const labelSections: Record<Role, "customer" | "driver" | "customer"> = {
  client: "customer",
  driver: "driver",
  delivery: "customer",
};

interface BottomNavProps {
  role: Role;
}

const BottomNav = ({ role }: BottomNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const items = navMap[role];

  const section = labelSections[role];
  const getLabel = (key: string): string => {
    const s = t[section] as Record<string, string>;
    return s[key] || key;
  };

  const rootPath = items[0]?.path || "/";

  return (
    <nav
      className="shrink-0 border-t border-border/30 bg-card/95 backdrop-blur-xl safe-area-bottom"
      dir={dir}
    >
      <div className="grid grid-cols-5 gap-2 px-2 py-2">
        {items.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== rootPath && location.pathname.startsWith(item.path));

          return (
            <motion.button
              data-active={isActive}
              key={item.path}
              onClick={() => navigate(item.path)}
              whileTap={{ scale: 0.9 }}
              className="glass-nav-tile relative flex min-h-[4rem] flex-col items-center justify-center gap-1 px-2 py-2"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              {isActive ? (
                <motion.div layoutId={`bottomnav-${role}`} className="absolute inset-0 rounded-[1rem]" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
              ) : null}
              <item.icon
                className={`relative z-10 h-5 w-5 transition-colors ${isActive ? "text-primary-foreground" : "text-foreground"}`}
              />
              <span
                className={`relative z-10 text-[10px] transition-colors ${isActive ? "font-bold text-primary-foreground" : "font-medium text-muted-foreground"}`}
              >
                {getLabel(item.labelKey)}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
