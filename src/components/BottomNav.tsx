import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home, MapPin, Clock, Wallet, User,
  Car, TrendingUp, FileText, Settings,
  ShoppingBag, UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

const clientNav: NavItem[] = [
  { icon: Home, label: "الرئيسية", path: "/customer" },
  { icon: MapPin, label: "حجز", path: "/customer/booking" },
  { icon: Clock, label: "السجل", path: "/customer/history" },
  { icon: Wallet, label: "المحفظة", path: "/customer/wallet" },
  { icon: User, label: "حسابي", path: "/customer/profile" },
];

const driverNav: NavItem[] = [
  { icon: Car, label: "الرئيسية", path: "/driver-panel" },
  { icon: TrendingUp, label: "الأرباح", path: "/driver-panel/earnings" },
  { icon: Clock, label: "السجل", path: "/driver-panel/history" },
  { icon: FileText, label: "الوثائق", path: "/driver-panel/documents" },
  { icon: Settings, label: "الإعدادات", path: "/driver-panel/settings" },
];

const deliveryNav: NavItem[] = [
  { icon: Home, label: "الرئيسية", path: "/delivery" },
  { icon: UtensilsCrossed, label: "مطاعم", path: "/delivery/restaurants" },
  { icon: ShoppingBag, label: "السلة", path: "/delivery/cart" },
  { icon: Clock, label: "السجل", path: "/delivery/history" },
  { icon: User, label: "حسابي", path: "/customer/profile" },
];

type Role = "client" | "driver" | "delivery";

const navMap: Record<Role, NavItem[]> = {
  client: clientNav,
  driver: driverNav,
  delivery: deliveryNav,
};

interface BottomNavProps {
  role: Role;
}

const BottomNav = ({ role }: BottomNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const items = navMap[role];

  // Determine the root path for this role (used for exact-match on home)
  const rootPath = items[0]?.path || "/";

  return (
    <nav
      className="shrink-0 border-t border-border/30 bg-card/95 backdrop-blur-xl safe-area-bottom"
      dir="rtl"
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
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
