import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import HNStockLayout from "./layouts/HNStockLayout";
import StockDashboard from "./pages/StockDashboard";
import StockProducts from "./pages/StockProducts";
import StockOrders from "./pages/StockOrders";
import StockShipments from "./pages/StockShipments";
import StockMerchants from "./pages/StockMerchants";
import StockWarehouses from "./pages/StockWarehouses";
import StockDrivers from "./pages/StockDrivers";
import StockCallCenter from "./pages/StockCallCenter";
import StockTransactions from "./pages/StockTransactions";
import StockLogin from "./pages/StockLogin";
import StockLanding from "./pages/StockLanding";

const queryClient = new QueryClient();

const HNStockApp = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<StockLanding />} />
          <Route path="/landing" element={<Navigate to="/" replace />} />
          <Route path="/login" element={<StockLogin />} />
          <Route path="/dashboard" element={<HNStockLayout />}>
            <Route index element={<StockDashboard />} />
            <Route path="products" element={<StockProducts />} />
            <Route path="orders" element={<StockOrders />} />
            <Route path="shipments" element={<StockShipments />} />
            <Route path="merchants" element={<StockMerchants />} />
            <Route path="warehouses" element={<StockWarehouses />} />
            <Route path="drivers" element={<StockDrivers />} />
            <Route path="call-center" element={<StockCallCenter />} />
            <Route path="transactions" element={<StockTransactions />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
      <Sonner />
    </QueryClientProvider>
  );
};

export default HNStockApp;
