import { useLocation, useNavigate } from "react-router-dom";
import {
  Home, MapPin, Clock, Wallet, User,
  Car, Settings,
  UtensilsCrossed, ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/i18n/context";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

const clientNav: NavItem[] = [
  { icon: Home, label: "home", path: "/customer" },
  { icon: MapPin, label: "booking", path: "/customer/ride" },
  { icon: Clock, label: "history", path: "/customer/history" },
  { icon: Wallet, label: "wallet", path: "/customer/wallet" },
  { icon: User, label: "myAccount", path: "/customer/profile" },
];

const driverNav: NavItem[] = [
  { icon: Car, label: "home", path: "/driver" },
  { icon: Settings, label: "settings", path: "/driver/settings" },
];

const deliveryNav: NavItem[] = [
  { icon: Home, label: "home", path: "/delivery" },
  { icon: UtensilsCrossed, label: "restaurants", path: "/delivery/restaurants" },
  { icon: ShoppingBag, label: "cart", path: "/delivery/cart" },
  { icon: Clock, label: "history", path: "/delivery/history" },
  { icon: User, label: "myAccount", path: "/customer/profile" },
];

const TopNavLinks = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const path = location.pathname;

  let items: NavItem[] = [];
  let section: "customer" | "driver" = "customer";

  if (path.startsWith("/driver")) {
    items = driverNav;
    section = "driver";
  } else if (path.startsWith("/delivery")) {
    items = deliveryNav;
    section = "customer";
  } else if (path.startsWith("/customer") || path === "/") {
    items = clientNav;
    section = "customer";
  }

  if (items.length === 0) return null;

  const getLabel = (key: string): string => {
    const s = t[section] as Record<string, string>;
    return s[key] || key;
  };

  return (
    <div className="flex items-center gap-0.5">
      {items.map((item) => {
        const isActive =
          location.pathname === item.path ||
          (item.path !== items[0]?.path && location.pathname.startsWith(item.path));

        return (
          <Tooltip key={item.path}>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate(item.path)}
                className={`p-1.5 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <item.icon className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {getLabel(item.label)}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};

export default TopNavLinks;
