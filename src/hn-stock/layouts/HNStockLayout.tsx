import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Package, ShoppingCart, Truck, Users, Warehouse,
  Car, Headphones, DollarSign, LogOut, Menu, X, ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "لوحة التحكم", labelFr: "Tableau de bord" },
  { to: "/dashboard/products", icon: Package, label: "المنتجات", labelFr: "Produits" },
  { to: "/dashboard/orders", icon: ShoppingCart, label: "الطلبات", labelFr: "Commandes" },
  { to: "/dashboard/shipments", icon: Truck, label: "الشحنات", labelFr: "Expéditions" },
  { to: "/dashboard/merchants", icon: Users, label: "التجار", labelFr: "Marchands" },
  { to: "/dashboard/warehouses", icon: Warehouse, label: "المستودعات", labelFr: "Entrepôts" },
  { to: "/dashboard/drivers", icon: Car, label: "السائقين", labelFr: "Chauffeurs" },
  { to: "/dashboard/call-center", icon: Headphones, label: "مركز الاتصال", labelFr: "Centre d'appels" },
  { to: "/dashboard/transactions", icon: DollarSign, label: "المعاملات", labelFr: "Transactions" },
];

const HNStockLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-background" dir="rtl">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 right-0 z-50 flex flex-col bg-sidebar border-l border-border transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Package className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground">HN Stock</span>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={() => {
            if (window.innerWidth < 1024) setMobileOpen(false);
            else setCollapsed(!collapsed);
          }}>
            {mobileOpen ? <X className="w-5 h-5" /> : <ChevronLeft className={cn("w-5 h-5 transition-transform", collapsed && "rotate-180")} />}
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/dashboard"}
                onClick={() => setMobileOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-border">
          <Button variant="ghost" className={cn("w-full justify-start gap-3", collapsed && "justify-center")}
            onClick={() => navigate("/login")}>
            <LogOut className="w-5 h-5" />
            {!collapsed && <span>خروج</span>}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <h2 className="text-sm font-medium text-muted-foreground">نظام التخزين والتوزيع</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">HN Stock v1.0</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default HNStockLayout;
