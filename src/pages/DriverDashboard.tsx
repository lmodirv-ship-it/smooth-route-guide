import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin, DollarSign, Star, Clock, TrendingUp,
  Bell, Menu, Power, ChevronLeft, Car, Navigation, BarChart3, User, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import GoogleMapWrapper from "@/components/GoogleMap";
import IncomingRideRequest from "@/components/IncomingRideRequest";
import { useIncomingRideRequests } from "@/hooks/useIncomingRideRequests";
import { useDriverGeolocation } from "@/hooks/useDriverGeolocation";
import logo from "@/assets/hn-driver-logo.png";

const DriverDashboard = () => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const { requests, accepting, acceptRequest, rejectRequest } = useIncomingRideRequests(isOnline);
  const { location: driverLocation, permissionDenied, loading: gpsLoading } = useDriverGeolocation(isOnline);

  const stats = [
    { icon: DollarSign, label: "أرباح اليوم", value: "٢٥٠ ر.س", color: "text-primary", glow: "glow-ring-orange" },
    { icon: Car, label: "الرحلات", value: "١٢", color: "text-info", glow: "glow-ring-blue" },
    { icon: Star, label: "التقييم", value: "٤.٨", color: "text-warning", glow: "" },
    { icon: Clock, label: "ساعات العمل", value: "٦:٣٠", color: "text-success", glow: "" },
  ];

  const recentTrips = [
    { from: "حي الملقا", to: "حي العليا", price: "٣٥ ر.س", time: "١٠:٣٠ ص", status: "مكتمل" },
    { from: "المطار", to: "حي الياسمين", price: "٧٥ ر.س", time: "٩:١٥ ص", status: "مكتمل" },
    { from: "جامعة الملك سعود", to: "حي النخيل", price: "٢٥ ر.س", time: "٨:٠٠ ص", status: "مكتمل" },
  ];

  const renderHome = () => (
    <>
      {/* Online Toggle */}
      <div className="px-4 mt-4">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsOnline(!isOnline)}
          className={`w-full rounded-2xl p-4 flex items-center justify-between transition-all duration-500 ${
            isOnline
              ? "gradient-primary glow-primary"
              : "gradient-card border border-border"
          }`}
        >
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
            <div className={`absolute top-0.5 w-6 h-6 rounded-full transition-all ${
              isOnline ? "right-0.5 bg-primary-foreground" : "right-7 bg-muted-foreground"
            }`} />
          </div>
        </motion.button>
      </div>

      {/* Map */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden border border-border h-44 relative">
        <GoogleMapWrapper
          zoom={15}
          driverLocation={driverLocation}
          panToDriver={isOnline}
          showMarker={!isOnline}
        >
          {isOnline && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-success/20 text-success px-3 py-1 rounded-full text-xs font-medium border border-success/20 backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              متصل
            </div>
          )}
          {gpsLoading && isOnline && (
            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 bg-background/80 text-muted-foreground px-3 py-1 rounded-full text-xs backdrop-blur-sm border border-border">
              <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
              جاري تحديد الموقع...
            </div>
          )}
          {permissionDenied && isOnline && (
            <div className="absolute bottom-3 inset-x-3 z-10 bg-destructive/90 text-destructive-foreground px-3 py-2 rounded-lg text-xs text-center backdrop-blur-sm">
              يجب تفعيل إذن الموقع ليظهر مكان السائق على الخريطة
            </div>
          )}
        </GoogleMapWrapper>
      </div>

      {/* Incoming Ride Requests */}
      <IncomingRideRequest
        requests={requests}
        accepting={accepting}
        onAccept={acceptRequest}
        onReject={rejectRequest}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 px-4 mt-4">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="gradient-card rounded-xl p-4 border border-border hover:border-primary/20 transition-colors"
          >
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

      {/* Recent Trips */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigate("/driver/history")} className="text-primary text-sm flex items-center gap-1">
            عرض الكل <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="font-bold text-foreground">آخر الرحلات</h2>
        </div>
        <div className="flex flex-col gap-3">
          {recentTrips.map((trip, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="gradient-card rounded-xl p-4 border border-border"
            >
              <div className="flex justify-between items-start">
                <span className="text-primary font-bold">{trip.price}</span>
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-sm text-foreground">{trip.from}</span>
                    <div className="w-2 h-2 rounded-full bg-success" />
                  </div>
                  <div className="flex items-center gap-2 justify-end mt-1">
                    <span className="text-sm text-foreground">{trip.to}</span>
                    <div className="w-2 h-2 rounded-full bg-destructive" />
                  </div>
                </div>
              </div>
              <div className="flex justify-between mt-2 pt-2 border-t border-border">
                <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">{trip.status}</span>
                <span className="text-xs text-muted-foreground">{trip.time}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen gradient-dark pb-24">
      {/* Header */}
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate("/driver/notifications")} className="p-2 relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
        </button>
        <div className="flex items-center gap-2">
          <img src={logo} alt="HN" className="w-8 h-8" />
          <span className="font-bold font-display text-gradient-primary text-lg">HN Driver</span>
        </div>
        <button onClick={() => navigate("/driver/settings")} className="p-2">
          <Menu className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {activeTab === "home" && renderHome()}
      {activeTab === "trips" && (
        <div className="p-4">
          <h2 className="text-foreground font-bold text-center mb-4">رحلاتي</h2>
          {recentTrips.map((trip, i) => (
            <div key={i} className="gradient-card rounded-xl p-4 border border-border mb-3">
              <div className="flex justify-between items-center">
                <span className="text-primary font-bold">{trip.price}</span>
                <div className="text-right">
                  <p className="text-sm text-foreground">{trip.from} → {trip.to}</p>
                  <p className="text-xs text-muted-foreground">{trip.time}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {activeTab === "earnings" && (
        <div className="p-4">
          <h2 className="text-foreground font-bold text-center mb-4">الأرباح</h2>
          <div className="gradient-card rounded-2xl p-6 border border-border text-center mb-4">
            <p className="text-muted-foreground text-sm">إجمالي الأرباح هذا الشهر</p>
            <p className="text-4xl font-bold text-gradient-primary mt-2">٣,٧٥٠ ر.س</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "اليوم", value: "٢٥٠" },
              { label: "هذا الأسبوع", value: "١,٢٠٠" },
              { label: "الرحلات", value: "٨٧" },
            ].map((s, i) => (
              <div key={i} className="gradient-card rounded-xl p-3 border border-border text-center">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold text-foreground mt-1">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === "profile" && (
        <div className="p-4 flex flex-col items-center">
          <div className="icon-circle-orange w-20 h-20 mb-3">
            <User className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-foreground font-bold text-lg">أحمد محمد</h2>
          <p className="text-muted-foreground text-sm">سائق معتمد</p>
          <div className="flex gap-2 mt-2">
            <span className="text-xs bg-success/10 text-success px-3 py-1 rounded-full">نشط</span>
            <span className="text-xs bg-warning/10 text-warning px-3 py-1 rounded-full flex items-center gap-1">
              <Star className="w-3 h-3" /> ٤.٨
            </span>
          </div>
          <div className="w-full mt-6 space-y-3">
            {[
              { label: "الإعدادات", icon: Settings, path: "/driver/settings" },
              { label: "سجل الرحلات", icon: Clock, path: "/driver/history" },
              { label: "الإشعارات", icon: Bell, path: "/driver/notifications" },
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => navigate(item.path)}
                className="w-full gradient-card rounded-xl p-4 border border-border flex items-center justify-between hover:border-primary/30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                <div className="flex items-center gap-3">
                  <span className="text-foreground">{item.label}</span>
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 glass-strong border-t border-border">
        <div className="flex justify-around py-2">
          {[
            { id: "home", icon: Navigation, label: "الرئيسية" },
            { id: "trips", icon: Car, label: "رحلاتي" },
            { id: "earnings", icon: BarChart3, label: "الأرباح" },
            { id: "profile", icon: User, label: "حسابي" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 px-4 py-1 transition-colors ${
                activeTab === tab.id ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? "drop-shadow-[0_0_6px_hsl(32,95%,55%,0.5)]" : ""}`} />
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
