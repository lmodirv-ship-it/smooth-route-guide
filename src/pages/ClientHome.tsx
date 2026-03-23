import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bell,
  Menu,
  Star,
  Clock,
  Navigation,
  ChevronLeft,
  Car,
  Heart,
  User,
  Home,
  Phone,
  MessageCircle,
  Bot,
  LogOut,
  MapPin,
} from "lucide-react";
import { useFirebaseLogout } from "@/hooks/useFirebaseAuth";
import RoleSwitcher from "@/components/RoleSwitcher";
import { Button } from "@/components/ui/button";
import LeafletMap from "@/components/LeafletMap";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import PriceEstimateCard from "@/components/PriceEstimateCard";
import { useTripPricing } from "@/hooks/useTripPricing";
import { useNearbyDrivers } from "@/hooks/useNearbyDrivers";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/hn-driver-logo.png";

const DEFAULT_LOCATION = { lat: 35.7595, lng: -5.834 };

const haversineKm = (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const ClientHome = () => {
  const navigate = useNavigate();
  const logout = useFirebaseLogout();
  const [activeTab, setActiveTab] = useState("home");
  const [destination, setDestination] = useState("");
  const [destinationCoords, setDestinationCoords] = useState<string | null>(null);
  const [showEstimate, setShowEstimate] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const { getEstimate, estimate, loading, error, reset } = useTripPricing("DH");
  const { drivers: nearbyDriversData } = useNearbyDrivers();

  useEffect(() => {
    if (!navigator.geolocation) {
      setUserLocation(DEFAULT_LOCATION);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setUserLocation(DEFAULT_LOCATION);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const fetchClientData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setProfile(null);
      setTrips([]);
      setUnreadNotifications(0);
      return;
    }

    const [profileRes, tripsRes, notificationsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("trips").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(12),
      supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
    ]);

    setProfile(profileRes.data || null);
    setTrips(tripsRes.data || []);
    setUnreadNotifications((notificationsRes.data || []).filter((item: any) => !item.read_at).length);
  };

  useEffect(() => {
    void fetchClientData();

    const channel = supabase
      .channel("client-home-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchClientData)
      .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, fetchClientData)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, fetchClientData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const customerLocation = useMemo(() => {
    const base = userLocation || DEFAULT_LOCATION;
    return `${base.lat},${base.lng}`;
  }, [userLocation]);

  const driverLocation = useMemo(() => {
    if (nearbyDriversData.length === 0) return customerLocation;
    const closestDriver = [...nearbyDriversData].sort((a, b) => {
      const base = userLocation || DEFAULT_LOCATION;
      return haversineKm(base, { lat: a.lat, lng: a.lng }) - haversineKm(base, { lat: b.lat, lng: b.lng });
    })[0];

    return `${closestDriver.lat},${closestDriver.lng}`;
  }, [customerLocation, nearbyDriversData, userLocation]);

  const quickLocations = useMemo(() => {
    const favoriteDestinations = trips
      .filter((trip) => trip.end_location)
      .reduce<Record<string, { label: string; address: string; coords: string; count: number }>>((acc, trip) => {
        const address = trip.end_location;
        const existing = acc[address];
        acc[address] = {
          label: existing ? existing.label : Object.keys(acc).length === 0 ? "الأكثر طلباً" : "وجهة متكررة",
          address,
          coords: destinationCoords || customerLocation,
          count: (existing?.count || 0) + 1,
        };
        return acc;
      }, {});

    const dynamicFavorites = Object.values(favoriteDestinations)
      .sort((a, b) => b.count - a.count)
      .slice(0, 2)
      .map((item, index) => ({
        icon: index === 0 ? Home : Navigation,
        label: item.label,
        address: item.address,
        coords: item.coords,
      }));

    return dynamicFavorites.length > 0
      ? dynamicFavorites
      : [
          { icon: Home, label: "الموقع الحالي", address: "الانطلاق من موقعك", coords: customerLocation },
          { icon: Navigation, label: "آخر وجهة", address: destination || "اختر وجهة جديدة", coords: destinationCoords || customerLocation },
        ];
  }, [customerLocation, destination, destinationCoords, trips]);

  const nearbyDriverCards = useMemo(() => {
    const base = userLocation || DEFAULT_LOCATION;

    return nearbyDriversData
      .map((driver) => {
        const distanceKm = haversineKm(base, { lat: driver.lat, lng: driver.lng });
        const etaMinutes = Math.max(2, Math.round(distanceKm * 3.5));
        const estimatedPrice = Math.max(12, Math.round(distanceKm * 6 + 10));

        return {
          ...driver,
          distanceKm,
          etaMinutes,
          estimatedPrice,
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 6);
  }, [nearbyDriversData, userLocation]);

  const favoritePlaces = useMemo(() => {
    const grouped = trips
      .filter((trip) => trip.end_location)
      .reduce<Record<string, { name: string; count: number; lastTripAt: string | null }>>((acc, trip) => {
        const key = trip.end_location;
        acc[key] = {
          name: key,
          count: (acc[key]?.count || 0) + 1,
          lastTripAt: trip.created_at || acc[key]?.lastTripAt || null,
        };
        return acc;
      }, {});

    return Object.values(grouped)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [trips]);

  useEffect(() => {
    if (showEstimate && destination.trim()) {
      const timer = setTimeout(() => {
        void getEstimate(driverLocation, customerLocation, destinationCoords || destination);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [showEstimate, destination, destinationCoords, driverLocation, customerLocation, getEstimate]);

  const handleSearch = async () => {
    if (!destination.trim()) return;
    setShowEstimate(true);
    await getEstimate(driverLocation, customerLocation, destinationCoords || destination);
  };

  const handlePlaceSelected = async (address: string, lat: number, lng: number) => {
    const coords = `${lat},${lng}`;
    setDestination(address);
    setDestinationCoords(coords);
    setShowEstimate(true);
    await getEstimate(driverLocation, customerLocation, coords);
  };

  const handleQuickLocation = async (address: string, coords: string) => {
    setDestination(address);
    setDestinationCoords(coords);
    setShowEstimate(true);
    await getEstimate(driverLocation, customerLocation, coords);
  };

  const handleCancelEstimate = () => {
    setShowEstimate(false);
    setDestination("");
    setDestinationCoords(null);
    reset();
  };

  const handleBook = () => {
    if (!destination.trim()) {
      toast({
        title: "حدد الوجهة أولاً",
        description: "اختر الوجهة من البحث أو من الأماكن السريعة قبل إنشاء الطلب.",
        variant: "destructive",
      });
      return;
    }

    const destParsed = destinationCoords?.split(",").map(Number);
    navigate("/client/booking", {
      state: {
        ride: {
          pickup: userLocation ? "موقعي الحالي" : "طنجة",
          destination,
          distance: estimate ? `${estimate.d2Km} كم` : "—",
          duration: estimate ? `${estimate.d2DurationMin} دقيقة` : "—",
          price: estimate?.totalPrice ?? 0,
          pickupLat: userLocation?.lat,
          pickupLng: userLocation?.lng,
          destLat: destParsed?.[0],
          destLng: destParsed?.[1],
        },
      },
    });
  };

  const renderHome = () => (
    <>
      <div className="px-4 mt-4">
        <PlacesAutocomplete
          value={destination}
          onChange={(value) => {
            setDestination(value);
            setDestinationCoords(null);
          }}
          onPlaceSelected={handlePlaceSelected}
          placeholder="إلى أين تريد الذهاب؟"
        />
      </div>

      <div className="flex gap-3 px-4 mt-4">
        {quickLocations.map((loc, i) => (
          <motion.button
            key={`${loc.label}-${i}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => handleQuickLocation(loc.address, loc.coords)}
            className="flex-1 gradient-card rounded-xl p-3 border border-border flex items-center gap-3 hover:border-primary/30 transition-colors"
          >
            <div className="text-right flex-1">
              <p className="text-sm font-medium text-foreground">{loc.label}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{loc.address}</p>
            </div>
            <div className="icon-circle-orange w-10 h-10">
              <loc.icon className="w-5 h-5 text-primary" />
            </div>
          </motion.button>
        ))}
      </div>

      {showEstimate && (
        <PriceEstimateCard
          estimate={estimate}
          loading={loading}
          error={error}
          onBook={handleBook}
          onCancel={handleCancelEstimate}
        />
      )}

      <div className="mx-4 mt-4 rounded-2xl overflow-hidden border border-border h-48 relative">
        <LeafletMap
          center={userLocation || undefined}
          zoom={14}
          showMarker={!!userLocation}
          markerPosition={userLocation || undefined}
          nearbyDrivers={nearbyDriversData}
        >
          {nearbyDriversData.length > 0 && (
            <div className="absolute top-3 right-3 z-10 glass px-3 py-1.5 rounded-full text-xs text-foreground flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              {nearbyDriversData.length} سائق بالقرب منك
            </div>
          )}
        </LeafletMap>
      </div>

      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setActiveTab("trips")} className="text-primary text-sm flex items-center gap-1">
            السجل <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="font-bold text-foreground">سائقون متاحون الآن</h2>
        </div>
        <div className="flex flex-col gap-3">
          {nearbyDriverCards.length === 0 && (
            <div className="gradient-card rounded-xl p-5 border border-border text-center text-muted-foreground">
              لا يوجد سائقون قريبون الآن
            </div>
          )}
          {nearbyDriverCards.map((driver, i) => (
            <motion.div
              key={driver.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="gradient-card rounded-xl p-4 border border-border hover:border-primary/20 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="text-left">
                  <span className="text-primary font-bold text-lg">ابتداءً من {driver.estimatedPrice} د.م</span>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" /> {driver.etaMinutes} دقائق · {driver.distanceKm.toFixed(1)} كم
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-medium text-foreground">{driver.name}</p>
                    <p className="text-xs text-muted-foreground">سائق متصل الآن</p>
                    <div className="flex items-center gap-1 justify-end mt-0.5">
                      <span className="text-xs text-warning">{Number(driver.rating || 0).toFixed(1)}</span>
                      <Star className="w-3 h-3 text-warning fill-warning" />
                    </div>
                  </div>
                  <div className="icon-circle-blue w-12 h-12">
                    <User className="w-6 h-6 text-info" />
                  </div>
                </div>
              </div>
              <Button
                onClick={handleBook}
                className="w-full mt-3 h-10 rounded-xl gradient-primary text-primary-foreground font-medium hover:opacity-90 glow-primary"
              >
                اطلب رحلة
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );

  const renderTrips = () => (
    <div className="p-4">
      <h2 className="text-foreground font-bold text-center mb-4">رحلاتي</h2>
      <div className="space-y-3">
        {trips.length === 0 && (
          <div className="text-center text-muted-foreground mt-10">
            <Car className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p>لا توجد رحلات بعد</p>
          </div>
        )}
        {trips.map((trip, index) => (
          <motion.div
            key={trip.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="gradient-card rounded-xl p-4 border border-border text-right"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-primary font-bold">{trip.fare || 0} د.م</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${trip.status === "completed" ? "bg-success/10 text-success" : trip.status === "in_progress" ? "bg-info/10 text-info" : "bg-secondary text-secondary-foreground"}`}>
                {trip.status === "completed" ? "مكتملة" : trip.status === "in_progress" ? "جارية" : "جديدة"}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 justify-end text-foreground">
                <span className="truncate">{trip.start_location || "—"}</span>
                <MapPin className="w-4 h-4 text-success" />
              </div>
              <div className="flex items-center gap-2 justify-end text-foreground">
                <span className="truncate">{trip.end_location || "—"}</span>
                <Navigation className="w-4 h-4 text-destructive" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">{trip.created_at ? new Date(trip.created_at).toLocaleString("ar-MA") : "—"}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderFavorites = () => (
    <div className="p-4">
      <h2 className="text-foreground font-bold text-center mb-4">المفضلة</h2>
      <div className="space-y-3">
        {favoritePlaces.length === 0 && (
          <div className="text-center text-muted-foreground mt-10">
            <Heart className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p>ستظهر الوجهات المتكررة هنا تلقائياً</p>
          </div>
        )}
        {favoritePlaces.map((place, index) => (
          <motion.button
            key={`${place.name}-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => handleQuickLocation(place.name, customerLocation)}
            className="w-full gradient-card rounded-xl p-4 border border-border flex items-center justify-between hover:border-primary/30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">{place.name}</p>
              <p className="text-xs text-muted-foreground">{place.count} رحلات سابقة</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="p-4 flex flex-col items-center">
      <div className="icon-circle-blue w-20 h-20 mb-3">
        <User className="w-8 h-8 text-info" />
      </div>
      <h2 className="text-foreground font-bold text-lg">{profile?.name || profile?.fullName || "حسابي"}</h2>
      <p className="text-muted-foreground text-sm">{profile?.email || profile?.phone || "عميل"}</p>
      <div className="w-full mt-6 space-y-3">
        {[
          { label: "الملف الشخصي", icon: User, action: () => navigate("/client/profile") },
          { label: "الدعم والمساعدة", icon: Phone, action: () => navigate("/client/support") },
          { label: `الإشعارات غير المقروءة (${unreadNotifications})`, icon: MessageCircle, action: () => {} },
        ].map((item, i) => (
          <button
            key={i}
            onClick={item.action}
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
  );

  return (
    <>
      <div className="min-h-screen gradient-dark pb-24">
        <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
          <button className="p-2 relative" onClick={() => {}}>
            <Bell className="w-5 h-5 text-muted-foreground" />
            {unreadNotifications > 0 && (
              <div className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                {Math.min(unreadNotifications, 99)}
              </div>
            )}
          </button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="HN" className="w-8 h-8" />
            <span className="font-bold font-display text-gradient-primary text-lg">HN Driver</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={logout} className="p-2" title="تسجيل الخروج">
              <LogOut className="w-5 h-5 text-destructive" />
            </button>
            <button className="p-2">
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {activeTab === "home" && renderHome()}
        {activeTab === "trips" && renderTrips()}
        {activeTab === "favorites" && renderFavorites()}
        {activeTab === "profile" && renderProfile()}

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
                className={`flex flex-col items-center gap-1 px-4 py-1 transition-colors ${activeTab === tab.id ? "text-primary" : "text-muted-foreground"}`}
              >
                <tab.icon className="w-5 h-5" />
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

export default ClientHome;
