import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin, Navigation, DollarSign, Star, Clock, TrendingUp,
  Bell, Menu, Power, ChevronLeft, Car, Users, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/hn-driver-logo.png";

const DriverDashboard = () => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(false);
  const [activeTab, setActiveTab] = useState("home");

  const stats = [
    { icon: DollarSign, label: "أرباح اليوم", value: "٢٥٠ ر.س", color: "text-primary" },
    { icon: Car, label: "الرحلات", value: "١٢", color: "text-info" },
    { icon: Star, label: "التقييم", value: "٤.٨", color: "text-warning" },
    { icon: Clock, label: "ساعات العمل", value: "٦:٣٠", color: "text-success" },
  ];

  const recentTrips = [
    { from: "حي الملقا", to: "حي العليا", price: "٣٥ ر.س", time: "١٠:٣٠ ص", status: "مكتمل" },
    { from: "المطار", to: "حي الياسمين", price: "٧٥ ر.س", time: "٩:١٥ ص", status: "مكتمل" },
    { from: "جامعة الملك سعود", to: "حي النخيل", price: "٢٥ ر.س", time: "٨:٠٠ ص", status: "مكتمل" },
  ];

  return (
    <div className="min-h-screen gradient-dark pb-24">
      {/* Header */}
      <div className="glass sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button className="p-2">
          <Bell className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <img src={logo} alt="HN" className="w-8 h-8" />
          <span className="font-bold font-display text-primary text-lg">HN Driver</span>
        </div>
        <button className="p-2">
          <Menu className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Online Toggle */}
      <div className="px-4 mt-4">
        <button
          onClick={() => setIsOnline(!isOnline)}
          className={`w-full rounded-2xl p-4 flex items-center justify-between transition-all duration-500 ${
            isOnline
              ? "gradient-primary glow-primary"
              : "gradient-card border border-border"
          }`}
        >
          <div className="flex items-center gap-3">
            <Power className={`w-6 h-6 ${isOnline ? "text-primary-foreground" : "text-muted-foreground"}`} />
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
        </button>
      </div>

      {/* Map Placeholder */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden border border-border h-48 relative">
        <div className="w-full h-full bg-secondary flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-10 h-10 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">الخريطة</p>
            <p className="text-xs text-muted-foreground">الرياض، المملكة العربية السعودية</p>
          </div>
        </div>
        {isOnline && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-success/20 text-success px-3 py-1 rounded-full text-xs font-medium">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            متصل
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 px-4 mt-4">
        {stats.map((stat, i) => (
          <div key={i} className="gradient-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Trips */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <button className="text-primary text-sm flex items-center gap-1">
            عرض الكل <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="font-bold text-foreground">آخر الرحلات</h2>
        </div>
        <div className="flex flex-col gap-3">
          {recentTrips.map((trip, i) => (
            <div key={i} className="gradient-card rounded-xl p-4 border border-border">
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
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 glass border-t border-border">
        <div className="flex justify-around py-2">
          {[
            { id: "home", icon: Navigation, label: "الرئيسية" },
            { id: "trips", icon: Car, label: "رحلاتي" },
            { id: "earnings", icon: BarChart3, label: "الأرباح" },
            { id: "profile", icon: Users, label: "حسابي" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 px-4 py-1 transition-colors ${
                activeTab === tab.id ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
