import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin, Search, Bell, Menu, Star, Clock, Navigation,
  ChevronLeft, Car, Heart, User, Home
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import logo from "@/assets/hn-driver-logo.png";

const ClientHome = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home");

  const quickLocations = [
    { icon: Home, label: "المنزل", address: "حي الملقا" },
    { icon: Navigation, label: "العمل", address: "طريق الملك فهد" },
  ];

  const nearbyDrivers = [
    { name: "أحمد محمد", rating: 4.9, car: "تويوتا كامري", distance: "٣ دقائق", price: "٢٥ ر.س" },
    { name: "خالد العمري", rating: 4.7, car: "هونداي سوناتا", distance: "٥ دقائق", price: "٣٠ ر.س" },
    { name: "سعد الحربي", rating: 4.8, car: "كيا أوبتيما", distance: "٧ دقائق", price: "٢٢ ر.س" },
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

      {/* Search Bar */}
      <div className="px-4 mt-4">
        <div className="relative">
          <Input
            placeholder="إلى أين تريد الذهاب؟"
            className="bg-secondary border-border text-foreground h-14 rounded-2xl pr-12 text-right text-base placeholder:text-muted-foreground"
          />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Quick Locations */}
      <div className="flex gap-3 px-4 mt-4">
        {quickLocations.map((loc, i) => (
          <button
            key={i}
            className="flex-1 gradient-card rounded-xl p-3 border border-border flex items-center gap-3 hover:border-primary/30 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-foreground text-right">{loc.label}</p>
              <p className="text-xs text-muted-foreground text-right">{loc.address}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <loc.icon className="w-5 h-5 text-primary" />
            </div>
          </button>
        ))}
      </div>

      {/* Map */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden border border-border h-52 relative">
        <div className="w-full h-full bg-secondary flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-10 h-10 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">موقعك الحالي</p>
          </div>
        </div>
        <div className="absolute top-3 right-3 bg-card/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs text-foreground border border-border">
          ٣ سائقين بالقرب منك
        </div>
      </div>

      {/* Nearby Drivers */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <button className="text-primary text-sm flex items-center gap-1">
            المزيد <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="font-bold text-foreground">سائقين بالقرب منك</h2>
        </div>
        <div className="flex flex-col gap-3">
          {nearbyDrivers.map((driver, i) => (
            <div key={i} className="gradient-card rounded-xl p-4 border border-border hover:border-primary/30 transition-colors">
              <div className="flex justify-between items-start">
                <div className="text-left">
                  <span className="text-primary font-bold text-lg">{driver.price}</span>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" /> {driver.distance}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-medium text-foreground">{driver.name}</p>
                    <p className="text-xs text-muted-foreground">{driver.car}</p>
                    <div className="flex items-center gap-1 justify-end mt-0.5">
                      <span className="text-xs text-warning">{driver.rating}</span>
                      <Star className="w-3 h-3 text-warning fill-warning" />
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                    <User className="w-6 h-6 text-muted-foreground" />
                  </div>
                </div>
              </div>
              <Button className="w-full mt-3 h-10 rounded-xl gradient-primary text-primary-foreground font-medium hover:opacity-90">
                اطلب رحلة
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 glass border-t border-border">
        <div className="flex justify-around py-2">
          {[
            { id: "home", icon: Home, label: "الرئيسية" },
            { id: "trips", icon: Car, label: "رحلاتي" },
            { id: "favorites", icon: Heart, label: "المفضلة" },
            { id: "profile", icon: User, label: "حسابي" },
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

export default ClientHome;
