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
  { icon: Clock, labelKey: "history", path: "/customer/history" },
  { icon: MapPin, labelKey: "booking", path: "/customer/ride" },
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

  const centerIndex = items.length === 5 ? 2 : -1;

  return (
    <nav
      className="shrink-0 border-t border-border/60 bg-background/95 backdrop-blur-xl safe-area-bottom shadow-[0_-10px_30px_-20px_hsl(var(--foreground)/0.45)]"
      dir={dir}
    >
      <div className="flex items-center justify-around gap-1 px-2" style={{ height: 72 }}>
        {items.map((item, index) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== rootPath && location.pathname.startsWith(item.path));
          const isCenter = index === centerIndex;

          return (
            <motion.button
              data-active={isActive}
              key={item.path}
              onClick={() => navigate(item.path)}
              whileTap={{ scale: 0.92 }}
              className="relative flex flex-col items-center justify-center gap-1"
              style={{ width: 60, height: 60, touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              <span
                className={`flex items-center justify-center transition-all ${
                  isCenter
                    ? "h-11 w-11 -mt-4 rounded-full border-2 border-warning/80 bg-background"
                    : "h-8 w-8 rounded-xl"
                }`}
                style={isCenter ? { boxShadow: "0 0 18px -2px hsl(var(--warning) / 0.85), inset 0 0 10px -6px hsl(var(--warning) / 0.9)" } : undefined}
              >
                <item.icon
                  className={`transition-colors ${isCenter ? "h-5 w-5 text-warning" : "h-[18px] w-[18px]"} ${
                    !isCenter ? (isActive ? "text-info" : "text-muted-foreground") : ""
                  }`}
                />
              </span>


              <span
                className={`text-[10px] transition-colors ${
                  isCenter
                    ? "font-bold text-warning"
                    : isActive
                      ? "font-bold text-info"
                      : "font-medium text-muted-foreground"
                }`}
              >
                {getLabel(item.labelKey)}
              </span>
              {isActive && !isCenter && <span className="h-1 w-1 rounded-full bg-info" />}
            </motion.button>

          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
