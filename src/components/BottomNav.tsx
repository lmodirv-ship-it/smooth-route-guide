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
      className="shrink-0 border-t border-border/40 bg-background/90 backdrop-blur-xl safe-area-bottom"
      dir={dir}
    >
      <div className={`flex items-end justify-around gap-1 px-2 pt-2 pb-2`}>
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
              className="relative flex flex-1 flex-col items-center justify-end gap-1 py-1"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              <span
                className={`flex items-center justify-center transition-all ${
                  isCenter
                    ? `h-11 w-11 rounded-full border ${isActive ? "border-primary/40 bg-primary/15" : "border-border/60 bg-secondary/40"}`
                    : "h-8 w-8 rounded-xl"
                }`}
                style={isCenter && isActive ? { boxShadow: "0 0 18px -4px hsl(var(--primary) / 0.7)" } : undefined}
              >
                <item.icon
                  className={`transition-colors ${isCenter ? "h-5 w-5" : "h-5 w-5"} ${
                    isActive ? (isCenter ? "text-primary" : "text-info") : "text-muted-foreground"
                  }`}
                />
              </span>
              <span
                className={`text-[10px] transition-colors ${
                  isActive ? (isCenter ? "font-bold text-primary" : "font-bold text-foreground") : "font-medium text-muted-foreground"
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
