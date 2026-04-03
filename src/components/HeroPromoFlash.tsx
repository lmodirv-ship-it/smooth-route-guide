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
    <div className="relative w-full overflow-hidden rounded-2xl border-2 border-primary/30 shadow-[0_0_40px_hsl(var(--primary)/0.25),0_8px_32px_rgba(0,0,0,0.4)]" style={{ aspectRatio: "9/14" }}>
      <AnimatePresence mode="wait">
        <motion.img
          key={`${side}-${index}`}
          src={images[index]}
          alt="HN Promo"
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ opacity: 0, x: xDir, scale: 1.15 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -xDir, scale: 0.9 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        />
      </AnimatePresence>
      {/* Glow border effect */}
      <div className="absolute inset-0 pointer-events-none rounded-2xl border border-primary/10 shadow-[inset_0_0_20px_rgba(0,0,0,0.3)]" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/30 via-transparent to-transparent" />
      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {images.map((_, i) => (
          <span key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${i === index ? "bg-primary scale-125 shadow-[0_0_8px_hsl(var(--primary)/0.8)]" : "bg-white/40"}`} />
        ))}
      </div>
    </div>
  );
};

const HeroPromoFlash = () => (
  <>
    {/* Left side */}
    <motion.div
      initial={{ opacity: 0, x: -60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.5, duration: 0.8, ease: "easeOut" }}
      className="hidden lg:block absolute left-3 xl:left-6 2xl:left-14 top-[22%] -translate-y-1/2 w-[240px] xl:w-[280px] 2xl:w-[320px] z-10"
    >
      <FlashSlot images={leftImages} side="left" />
    </motion.div>
    {/* Right side */}
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.7, duration: 0.8, ease: "easeOut" }}
      className="hidden lg:block absolute right-3 xl:right-6 2xl:right-14 top-[22%] -translate-y-1/2 w-[240px] xl:w-[280px] 2xl:w-[320px] z-10"
    >
      <FlashSlot images={rightImages} side="right" />
    </motion.div>
  </>
);

export default HeroPromoFlash;
