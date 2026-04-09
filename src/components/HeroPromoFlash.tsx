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
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border-2 border-primary/30 shadow-[0_0_40px_hsl(var(--primary)/0.25),0_8px_32px_rgba(0,0,0,0.4)]" style={{ aspectRatio: "9/14" }}>
      <img
        src={images[0]}
        alt="HN Promo"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 pointer-events-none rounded-2xl border border-primary/10 shadow-[inset_0_0_20px_rgba(0,0,0,0.3)]" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/30 via-transparent to-transparent" />
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
      className="hidden lg:block absolute left-0 xl:left-1 2xl:left-4 top-[6%] w-[300px] xl:w-[350px] 2xl:w-[400px] z-10"
    >
      <FlashSlot images={leftImages} side="left" />
    </motion.div>
    {/* Right side */}
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.7, duration: 0.8, ease: "easeOut" }}
      className="hidden lg:block absolute right-0 xl:right-1 2xl:right-4 top-[6%] w-[300px] xl:w-[350px] 2xl:w-[400px] z-10"
    >
      <FlashSlot images={rightImages} side="right" />
    </motion.div>
  </>
);

export default HeroPromoFlash;
