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
      onClick={onClick}
      whileHover={{ scale: 1.02, x: -2 }}
      whileTap={{ scale: 0.97 }}
      title={collapsed ? label : undefined}
      className={`
        w-full flex items-center ${collapsed ? "justify-center" : "justify-between"} 
        px-3 py-2.5 rounded-xl transition-all duration-300 group relative overflow-hidden
        ${isActive
          ? "bg-gradient-to-l from-[hsl(var(--primary))] via-[hsl(var(--primary)/0.85)] to-[hsl(var(--primary)/0.7)] text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.4),inset_0_1px_0_hsl(0_0%_100%/0.15)] border border-[hsl(var(--primary)/0.5)]"
          : "bg-[hsl(220_15%_13%)] hover:bg-[hsl(220_15%_18%)] text-[hsl(210_20%_60%)] hover:text-foreground border border-[hsl(220_15%_18%)] hover:border-[hsl(var(--primary)/0.3)] hover:shadow-[0_0_12px_hsl(var(--primary)/0.15)]"
        }
      `}
    >
      {/* Glow overlay for active */}
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-white/5 to-transparent pointer-events-none" />
      )}

      <div className="flex items-center gap-3 relative z-10">
        <div className={`
          w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300
          ${isActive
            ? "bg-white/20 shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
            : "bg-[hsl(220_15%_18%)] group-hover:bg-[hsl(220_15%_22%)] group-hover:shadow-[0_0_6px_hsl(var(--primary)/0.2)]"
          }
        `}>
          <Icon className={`w-4 h-4 flex-shrink-0 transition-all duration-300 ${isActive ? "drop-shadow-[0_0_4px_rgba(255,255,255,0.5)]" : "group-hover:text-[hsl(var(--primary))]"}`} />
        </div>
        {!collapsed && (
          <span className={`text-sm font-medium transition-all duration-300 ${isActive ? "font-semibold drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" : ""}`}>
            {label}
          </span>
        )}
      </div>

      {/* Badge */}
      {!collapsed && badge && badge > 0 ? (
        <span className={`
          text-xs px-2 py-0.5 rounded-full font-semibold relative z-10
          ${isActive
            ? "bg-white/20 text-primary-foreground"
            : "bg-destructive/20 text-destructive animate-pulse"
          }
        `}>
          {badge}
        </span>
      ) : null}

      {/* Left edge indicator for active */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-white/60 shadow-[0_0_6px_white]" />
      )}
    </motion.button>
  );
};

export default SidebarNavButton;
