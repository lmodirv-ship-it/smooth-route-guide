import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin, DollarSign, Star, Clock, TrendingUp,
  Bell, Menu, Power, ChevronLeft, Car, Navigation, BarChart3, User, Settings, Package, LogOut
} from "lucide-react";
import { useFirebaseLogout } from "@/hooks/useFirebaseAuth";
import RoleSwitcher from "@/components/RoleSwitcher";
import { Button } from "@/components/ui/button";
import GoogleMapWrapper from "@/components/GoogleMap";
import IncomingRideRequest from "@/components/IncomingRideRequest";
import { useIncomingRideRequests } from "@/hooks/useIncomingRideRequests";
import { useDriverGeolocation } from "@/hooks/useDriverGeolocation";
import { supabase } from "@/lib/firestoreClient";
import logo from "@/assets/hn-driver-logo.png";

const DriverDashboard = () => {
  const navigate = useNavigate();
  const logout = useFirebaseLogout();
  const [isOnline, setIsOnline] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const { requests, accepting, acceptRequest, rejectRequest } = useIncomingRideRequests(isOnline);
  const { location: driverLocation, permissionDenied, loading: gpsLoading } = useDriverGeolocation(isOnline);

  const [stats, setStats] = useState({ todayEarnings: 0, todayTrips: 0, rating: 0, hoursOnline: "0:00" });
  const [recentTrips, setRecentTrips] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Profile
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    setProfile(prof);

    // Driver record
    const { data: driverData } = await supabase.from("drivers").select("id, rating, status").eq("user_id", user.id).maybeSingle();
    if (!driverData) return;

    setIsOnline(driverData.status === "active");

    // Today's trips
    const today = new Date().toISOString().slice(0, 10);
    const { data: trips } = await supabase.from("trips")
      .select("*").eq("driver_id", driverData.id)
      .gte("created_at", today).order("created_at", { ascending: false });

    const todayTrips = trips || [];
    const todayEarnings = todayTrips.filter(t => t.status === "completed").reduce((s, t) => s + Number(t.fare || 0), 0);

    setStats({
      todayEarnings,
      todayTrips: todayTrips.length,
      rating: Number(driverData.rating) || 0,
      hoursOnline: "—",
    });

    // Recent trips (last 5)
    const { data: recent } = await supabase.from("trips")
      .select("*").eq("driver_id", driverData.id)
      .order("created_at", { ascending: false }).limit(5);
    setRecentTrips(recent || []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleOnline = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const newStatus = isOnline ? "inactive" : "active";
    const newOnline = !isOnline;
    
    // Update Supabase-compatible driver record
    await supabase.from("drivers").update({ status: newStatus }).eq("user_id", user.id);
    
    // Also update Firebase drivers collection with isOnline/isAvailable
    try {
      const { doc: fbDoc, updateDoc: fbUpdate } = await import("firebase/firestore");
      const { db: fbDb } = await import("@/lib/firebase");
      await fbUpdate(fbDoc(fbDb, "drivers", user.id), {
        isOnline: newOnline,
        isAvailable: newOnline,
        lastLocationUpdate: new Date().toISOString(),
      });
      console.log("[Driver] Firebase isOnline:", newOnline, "isAvailable:", newOnline);
    } catch (e) {
      console.warn("[Driver] Firebase update failed:", e);
    }
    
    setIsOnline(newOnline);
  };

  const statCards = [
    { icon: DollarSign, label: "أرباح اليوم", value: `${stats.todayEarnings} DH`, color: "text-primary", glow: "glow-ring-orange" },
    { icon: Car, label: "الرحلات", value: `${stats.todayTrips}`, color: "text-info", glow: "glow-ring-blue" },
    { icon: Star, label: "التقييم", value: stats.rating > 0 ? stats.rating.toFixed(1) : "—", color: "text-warning", glow: "" },
    { icon: Clock, label: "ساعات العمل", value: stats.hoursOnline, color: "text-success", glow: "" },
  ];

  const renderHome = () => (
    <>
      <div className="px-4 mt-4">
        <motion.button whileTap={{ scale: 0.98 }} onClick={toggleOnline}
          className={`w-full rounded-2xl p-4 flex items-center justify-between transition-all duration-500 ${isOnline ? "gradient-primary glow-primary" : "gradient-card border border-border"}`}>
          <div className="flex items-center gap-3">
            <div className={`icon-circle ${isOnline ? "!bg-primary-foreground/20" : ""}`}>
              <Power className={`w-6 h-6 ${isOnline ? "text-primary-foreground" : "text-muted-foreground"}`} />
            </div>
            <div className="text-right">
              <p className={`font-bold text-lg ${isOnline ? "text-primary-foreground" : "text-foreground"}`}>
                {isOnline ? "متصل - بانتظار الرحلات" : "غير متصل"}
              </p>
              <p className={`text-sm ${isOnline ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {isOnline ? "موقعك ظاهر للعملاء" : "اضغط للبدء"}
              </p>
            </div>
          </div>
          <div className={`w-14 h-7 rounded-full relative transition-colors ${isOnline ? "bg-primary-foreground/20" : "bg-secondary"}`}>
            <div className={`absolute top-0.5 w-6 h-6 rounded-full transition-all ${isOnline ? "right-0.5 bg-primary-foreground" : "right-7 bg-muted-foreground"}`} />
          </div>
        </motion.button>
      </div>

      <div className="mx-4 mt-4 rounded-2xl overflow-hidden border border-border h-44 relative">
        <GoogleMapWrapper zoom={15} driverLocation={driverLocation} panToDriver={isOnline} showMarker={!isOnline}>
          {isOnline && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-success/20 text-success px-3 py-1 rounded-full text-xs font-medium border border-success/20 backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />متصل
            </div>
          )}
        </GoogleMapWrapper>
      </div>

      <IncomingRideRequest requests={requests} accepting={accepting} onAccept={acceptRequest} onReject={rejectRequest} />

      {/* Delivery shortcut */}
      {isOnline && (
        <div className="px-4 mt-3">
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate("/driver/delivery")}
            className="w-full gradient-card rounded-xl p-3 border border-primary/20 flex items-center justify-between">
            <ChevronLeft className="w-5 h-5 text-primary" />
            <div className="flex items-center gap-3">
              <div>
                <p className="font-bold text-foreground text-sm text-right">طلبات التوصيل</p>
                <p className="text-xs text-muted-foreground text-right">اطلع على طلبات المطاعم</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
            </div>
          </motion.button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 px-4 mt-4">
        {statCards.map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="gradient-card rounded-xl p-4 border border-border hover:border-primary/20 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-secondary ${stat.glow}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigate("/driver/history")} className="text-primary text-sm flex items-center gap-1">
            عرض الكل <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="font-bold text-foreground">آخر الرحلات</h2>
        </div>
        <div className="flex flex-col gap-3">
          {recentTrips.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">لا توجد رحلات بعد</p>}
          {recentTrips.map((trip) => (
            <motion.div key={trip.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              className="gradient-card rounded-xl p-4 border border-border">
              <div className="flex justify-between items-start">
                <span className="text-primary font-bold">{trip.fare || 0} DH</span>
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-sm text-foreground">{trip.start_location || "—"}</span>
                    <div className="w-2 h-2 rounded-full bg-success" />
                  </div>
                  <div className="flex items-center gap-2 justify-end mt-1">
                    <span className="text-sm text-foreground">{trip.end_location || "—"}</span>
                    <div className="w-2 h-2 rounded-full bg-destructive" />
                  </div>
                </div>
              </div>
              <div className="flex justify-between mt-2 pt-2 border-t border-border">
                <span className={`text-xs px-2 py-0.5 rounded-full ${trip.status === "completed" ? "bg-success/10 text-success" : "bg-info/10 text-info"}`}>
                  {trip.status === "completed" ? "مكتمل" : "جارية"}
                </span>
                <span className="text-xs text-muted-foreground">{new Date(trip.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <>
    <div className="min-h-screen gradient-dark pb-24">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate("/driver/notifications")} className="p-2 relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
        </button>
        <div className="flex items-center gap-2">
          <img src={logo} alt="HN" className="w-8 h-8" />
          <span className="font-bold font-display text-gradient-primary text-lg">HN Driver</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={logout} className="p-2" title="تسجيل الخروج">
            <LogOut className="w-5 h-5 text-destructive" />
          </button>
          <button onClick={() => navigate("/driver/settings")} className="p-2">
            <Menu className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {activeTab === "home" && renderHome()}

      <div className="fixed bottom-0 left-0 right-0 glass-strong border-t border-border">
        <div className="flex justify-around py-2">
          {[
            { id: "home", icon: Navigation, label: "الرئيسية" },
            { id: "earnings", icon: BarChart3, label: "الأرباح", path: "/driver/earnings" },
            { id: "wallet", icon: DollarSign, label: "المحفظة", path: "/driver/wallet" },
            { id: "profile", icon: User, label: "حسابي", path: "/driver/profile" },
          ].map((tab) => (
            <button key={tab.id}
              onClick={() => tab.path ? navigate(tab.path) : setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 px-4 py-1 transition-colors ${activeTab === tab.id && !tab.path ? "text-primary" : "text-muted-foreground"}`}>
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id && !tab.path ? "drop-shadow-[0_0_6px_hsl(32,95%,55%,0.5)]" : ""}`} />
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
      <RoleSwitcher />
    </>
  );
};

export default DriverDashboard;
