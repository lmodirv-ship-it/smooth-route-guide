import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin, Search, Bell, Menu, Star, Clock, Navigation,
  ChevronLeft, Car, Heart, User, Home, Phone, MessageCircle, Bot
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import GoogleMapWrapper from "@/components/GoogleMap";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import PriceEstimateCard from "@/components/PriceEstimateCard";
import { useTripPricing } from "@/hooks/useTripPricing";
import { useNearbyDrivers } from "@/hooks/useNearbyDrivers";
import logo from "@/assets/hn-driver-logo.png";

const ClientHome = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home");
  const [destination, setDestination] = useState("");
  const [showEstimate, setShowEstimate] = useState(false);
  const { getEstimate, estimate, loading, error, reset } = useTripPricing("DH");
  const { drivers: nearbyDriversData } = useNearbyDrivers();

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("المتصفح لا يدعم تحديد الموقع");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocationError("تعذر الوصول إلى موقعك");
        // fallback to Riyadh
        setUserLocation({ lat: 24.7136, lng: 46.6753 });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const driverLocation = "24.7236,46.6853";
  const customerLocation = userLocation ? `${userLocation.lat},${userLocation.lng}` : "24.7136,46.6753";

  const quickLocations = [
    { icon: Home, label: "المنزل", address: "حي الملقا، الرياض" },
    { icon: Navigation, label: "العمل", address: "طريق الملك فهد، الرياض" },
  ];

  const nearbyDrivers = [
    { name: "أحمد محمد", rating: 4.9, car: "تويوتا كامري", distance: "٣ دقائق", price: "٢٥ د.م" },
    { name: "خالد العمري", rating: 4.7, car: "هونداي سوناتا", distance: "٥ دقائق", price: "٣٠ د.م" },
    { name: "سعد الحربي", rating: 4.8, car: "كيا أوبتيما", distance: "٧ دقائق", price: "٢٢ د.م" },
  ];

  // Re-calculate when destination changes
  useEffect(() => {
    if (showEstimate && destination.trim()) {
      const timer = setTimeout(() => {
        getEstimate(driverLocation, customerLocation, destination);
      }, 600); // debounce
      return () => clearTimeout(timer);
    }
  }, [destination]);

  const handleSearch = async () => {
    if (!destination.trim()) return;
    setShowEstimate(true);
    await getEstimate(driverLocation, customerLocation, destination);
  };

  const handlePlaceSelected = async (address: string, _lat: number, _lng: number) => {
    setDestination(address);
    setShowEstimate(true);
    await getEstimate(driverLocation, customerLocation, address);
  };

  const handleQuickLocation = async (address: string) => {
    setDestination(address);
    setShowEstimate(true);
    await getEstimate(driverLocation, customerLocation, address);
  };

  const handleCancelEstimate = () => {
    setShowEstimate(false);
    setDestination("");
    reset();
  };

  const handleBook = () => {
    navigate("/driver/trip");
  };

  const renderHome = () => (
    <>
      {/* Search */}
      <div className="px-4 mt-4">
        <PlacesAutocomplete
          value={destination}
          onChange={setDestination}
          onPlaceSelected={handlePlaceSelected}
          placeholder="إلى أين تريد الذهاب؟"
        />
      </div>

      {/* Quick Locations */}
      <div className="flex gap-3 px-4 mt-4">
        {quickLocations.map((loc, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => handleQuickLocation(loc.address)}
            className="flex-1 gradient-card rounded-xl p-3 border border-border flex items-center gap-3 hover:border-primary/30 transition-colors"
          >
            <div className="text-right flex-1">
              <p className="text-sm font-medium text-foreground">{loc.label}</p>
              <p className="text-xs text-muted-foreground">{loc.address}</p>
            </div>
            <div className="icon-circle-orange w-10 h-10">
              <loc.icon className="w-5 h-5 text-primary" />
            </div>
          </motion.button>
        ))}
      </div>

      {/* Price Estimate */}
      {showEstimate && (
        <PriceEstimateCard
          estimate={estimate}
          loading={loading}
          error={error}
          onBook={handleBook}
          onCancel={handleCancelEstimate}
        />
      )}

      {/* Map */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden border border-border h-48 relative">
        <GoogleMapWrapper
          center={userLocation || undefined}
          zoom={14}
          showMarker={!!userLocation}
          markerPosition={userLocation || undefined}
        >
          <div className="absolute top-3 right-3 z-10 glass px-3 py-1.5 rounded-full text-xs text-foreground">
            ٣ سائقين بالقرب منك
          </div>
        </GoogleMapWrapper>
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
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className="gradient-card rounded-xl p-4 border border-border hover:border-primary/20 transition-colors"
            >
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
                  <div className="icon-circle-blue w-12 h-12">
                    <User className="w-6 h-6 text-info" />
                  </div>
                </div>
              </div>
              <Button className="w-full mt-3 h-10 rounded-xl gradient-primary text-primary-foreground font-medium hover:opacity-90 glow-primary">
                اطلب رحلة
              </Button>
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
        <button className="p-2 relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
        </button>
        <div className="flex items-center gap-2">
          <img src={logo} alt="HN" className="w-8 h-8" />
          <span className="font-bold font-display text-gradient-primary text-lg">HN Driver</span>
        </div>
        <button className="p-2">
          <Menu className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {activeTab === "home" && renderHome()}
      {activeTab === "trips" && (
        <div className="p-4">
          <h2 className="text-foreground font-bold text-center mb-4">رحلاتي</h2>
          <div className="text-center text-muted-foreground mt-10">
            <Car className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p>لا توجد رحلات سابقة</p>
          </div>
        </div>
      )}
      {activeTab === "favorites" && (
        <div className="p-4">
          <h2 className="text-foreground font-bold text-center mb-4">المفضلة</h2>
          <div className="text-center text-muted-foreground mt-10">
            <Heart className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p>لا توجد أماكن مفضلة</p>
          </div>
        </div>
      )}
      {activeTab === "profile" && (
        <div className="p-4 flex flex-col items-center">
          <div className="icon-circle-blue w-20 h-20 mb-3">
            <User className="w-8 h-8 text-info" />
          </div>
          <h2 className="text-foreground font-bold text-lg">محمد أحمد</h2>
          <p className="text-muted-foreground text-sm">عميل</p>
          <div className="w-full mt-6 space-y-3">
            {[
              { label: "بيانات الحساب", icon: User },
              { label: "اتصل بنا", icon: Phone },
              { label: "المساعدة", icon: MessageCircle },
            ].map((item, i) => (
              <button
                key={i}
                className="w-full gradient-card rounded-xl p-4 border border-border flex items-center justify-between hover:border-primary/30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                <div className="flex items-center gap-3">
                  <span className="text-foreground">{item.label}</span>
                  <item.icon className="w-5 h-5 text-info" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI Assistant FAB */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate("/assistant")}
        className="fixed bottom-20 left-4 z-50 w-14 h-14 rounded-full gradient-primary glow-primary flex items-center justify-center shadow-lg"
      >
        <Bot className="w-6 h-6 text-primary-foreground" />
      </motion.button>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 glass-strong border-t border-border">
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
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? "drop-shadow-[0_0_6px_hsl(32,95%,55%,0.5)]" : ""}`} />
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClientHome;
