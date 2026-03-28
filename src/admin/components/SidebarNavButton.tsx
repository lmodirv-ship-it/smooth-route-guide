/**
 * Premium glowing sidebar navigation button.
 * Inspired by HN Video AI dashboard — each button is a luminous box
 * with neon glow on hover and active state color shift.
 */
import { type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface SidebarNavButtonProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  collapsed?: boolean;
  badge?: number;
  onClick: () => void;
}

const SidebarNavButton = ({ icon: Icon, label, isActive, collapsed, badge, onClick }: SidebarNavButtonProps) => {
  return (
    <motion.button
      data-active={isActive}
      onClick={onClick}
      whileHover={{ scale: 1.02, x: -2 }}
      whileTap={{ scale: 0.97 }}
      title={collapsed ? label : undefined}
      className={`glass-nav-tile w-full ${collapsed ? "justify-center px-2.5" : "justify-between px-3.5"} min-h-[3.5rem] flex items-center gap-3 group`}
    >
      <div className="flex items-center gap-3 relative z-10">
        <div className={`glass-icon-button h-10 w-10 flex-shrink-0 ${isActive ? "bg-background/10 text-primary-foreground border-background/20" : "text-foreground"}`}>
          <Icon className="w-4 h-4 flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
        </div>
        {!collapsed && (
          <span className={`text-sm transition-all duration-300 ${isActive ? "font-bold" : "font-medium"}`}>
            {label}
          </span>
        )}
      </div>

      {!collapsed && badge && badge > 0 ? (
        <span className={`relative z-10 rounded-full px-2 py-0.5 text-xs font-semibold ${isActive ? "bg-background/15 text-primary-foreground" : "bg-destructive/15 text-destructive animate-pulse"}`}>
          {badge}
        </span>
      ) : null}
    </motion.button>
  );
};

export default SidebarNavButton;
