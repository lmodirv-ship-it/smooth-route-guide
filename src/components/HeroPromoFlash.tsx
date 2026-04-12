import { motion } from "framer-motion";
import promoDelivery50 from "@/assets/promo-delivery-50dh.jpeg";
import promoMerchants from "@/assets/promo-merchants.jpeg";
import promoRestaurant from "@/assets/promo-restaurant-driver.jpeg";
import promoDeliveryDriver from "@/assets/promo-delivery-driver.jpeg";
import promoRideEarn from "@/assets/promo-ride-earn.jpeg";

const allImages = [promoDelivery50, promoRestaurant, promoMerchants, promoRideEarn, promoDeliveryDriver];

const HeroPromoFlash = () => (
  <section className="py-12 md:py-16 relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/10 to-background" />
    <div className="container mx-auto px-4 relative z-10">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 max-w-6xl mx-auto">
        {allImages.map((img, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.6, ease: "easeOut" }}
            className="relative overflow-hidden rounded-2xl border-2 border-primary/30 shadow-[0_0_40px_hsl(var(--primary)/0.25),0_8px_32px_rgba(0,0,0,0.4)]"
            style={{ aspectRatio: "9/14" }}
          >
            <img
              src={img}
              alt="HN Promo"
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 pointer-events-none rounded-2xl border border-primary/10 shadow-[inset_0_0_20px_rgba(0,0,0,0.3)]" />
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default HeroPromoFlash;
