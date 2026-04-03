import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import promoDelivery50 from "@/assets/promo-delivery-50dh.jpeg";
import promoMerchants from "@/assets/promo-merchants.jpeg";
import promoRestaurant from "@/assets/promo-restaurant-driver.jpeg";
import promoDeliveryDriver from "@/assets/promo-delivery-driver.jpeg";
import promoRideEarn from "@/assets/promo-ride-earn.jpeg";

const leftImages = [promoDelivery50, promoRestaurant, promoMerchants];
const rightImages = [promoRideEarn, promoDeliveryDriver, promoMerchants];

const FlashSlot = ({ images, side }: { images: string[]; side: "left" | "right" }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex(i => (i + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images.length]);

  const xDir = side === "left" ? -60 : 60;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-primary/20 shadow-[0_0_30px_hsl(var(--primary)/0.15)]" style={{ aspectRatio: "3/4" }}>
      <AnimatePresence mode="wait">
        <motion.img
          key={`${side}-${index}`}
          src={images[index]}
          alt="HN Promo"
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ opacity: 0, x: xDir, scale: 1.1 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -xDir, scale: 0.95 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </AnimatePresence>
      {/* Glow overlay */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      {/* Dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {images.map((_, i) => (
          <span key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === index ? "bg-primary scale-125 shadow-[0_0_6px_hsl(var(--primary)/0.8)]" : "bg-white/40"}`} />
        ))}
      </div>
    </div>
  );
};

const HeroPromoFlash = () => (
  <>
    {/* Left side */}
    <motion.div
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.5, duration: 0.7 }}
      className="hidden xl:block absolute left-4 2xl:left-12 top-1/2 -translate-y-1/2 w-[220px] 2xl:w-[260px] z-10"
    >
      <FlashSlot images={leftImages} side="left" />
    </motion.div>
    {/* Right side */}
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.7, duration: 0.7 }}
      className="hidden xl:block absolute right-4 2xl:right-12 top-1/2 -translate-y-1/2 w-[220px] 2xl:w-[260px] z-10"
    >
      <FlashSlot images={rightImages} side="right" />
    </motion.div>
  </>
);

export default HeroPromoFlash;
