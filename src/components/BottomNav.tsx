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
  { icon: TrendingUp, labelKey: "earnings", path: "/driver/earnings" },
  { icon: Clock, labelKey: "history", path: "/driver/history" },
  { icon: FileText, labelKey: "documents", path: "/driver/documents" },
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
      <div className="flex items-center justify-around px-1 py-1.5">
        {items.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== rootPath && location.pathname.startsWith(item.path));

          return (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              whileTap={{ scale: 0.9 }}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors relative"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              {isActive && (
                <motion.div
                  layoutId={`bottomnav-${role}`}
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon
                className={`w-5 h-5 relative z-10 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[10px] font-medium relative z-10 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
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
