import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Splash from "./pages/Splash";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import DriverDashboard from "./pages/DriverDashboard";
import DriverHistory from "./pages/DriverHistory";
import DriverNotifications from "./pages/DriverNotifications";
import DriverSettings from "./pages/DriverSettings";
import DocumentUpload from "./pages/DocumentUpload";
import ActiveTrip from "./pages/ActiveTrip";
import ClientHome from "./pages/ClientHome";
import AdminDashboard from "./pages/AdminDashboard";
import CallCenter from "./pages/CallCenter";
import AIAssistant from "./pages/AIAssistant";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/driver" element={<DriverDashboard />} />
          <Route path="/driver/history" element={<DriverHistory />} />
          <Route path="/driver/notifications" element={<DriverNotifications />} />
          <Route path="/driver/settings" element={<DriverSettings />} />
          <Route path="/driver/documents" element={<DocumentUpload />} />
          <Route path="/driver/trip" element={<ActiveTrip />} />
          <Route path="/client" element={<ClientHome />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/call-center" element={<CallCenter />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
