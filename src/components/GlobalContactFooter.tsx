import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, Car, UtensilsCrossed, Gift, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const GlobalContactFooter = () => {
  const [visible, setVisible] = useState(true);
  const [email, setEmail] = useState("lmodirv@gmail.com");
  const [phone, setPhone] = useState("+212 0668546358");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["ui_visibility", "contact_info"]);
      if (data) {
        const vis = data.find(d => d.key === "ui_visibility");
        if (vis?.value) {
          const v = vis.value as Record<string, boolean>;
          if (v.contact_footer === false) setVisible(false);
        }
        const contact = data.find(d => d.key === "contact_info");
        if (contact?.value) {
          const c = contact.value as Record<string, string>;
          if (c.email) setEmail(c.email);
          if (c.phone) setPhone(c.phone);
        }
      }
    };
    load();

    const channel = supabase
      .channel("contact-footer-settings")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, (payload: any) => {
        if (payload.new?.key === "ui_visibility") {
          const v = payload.new.value as Record<string, boolean>;
          setVisible(v.contact_footer !== false);
        }
        if (payload.new?.key === "contact_info") {
          const c = payload.new.value as Record<string, string>;
          if (c.email) setEmail(c.email);
          if (c.phone) setPhone(c.phone);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (!visible) return null;

  const whatsappNumber = phone.replace(/[\s+\-()]/g, "");

  return (
    <div className="w-full py-4 px-4 flex justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="contact-royal-box flex flex-col sm:flex-row items-center gap-3 sm:gap-6 px-6 py-4 rounded-2xl max-w-xl w-full relative"
      >
        {/* Hide button */}
        <button
          onClick={() => setVisible(false)}
          className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center bg-[hsl(45,60%,40%,0.3)] hover:bg-[hsl(0,70%,50%,0.5)] transition-colors text-[hsl(45,90%,70%)] hover:text-white text-xs font-bold"
          title="إخفاء"
        >
          ✕
        </button>

        {/* Email */}
        <a
          href={`mailto:${encodeURIComponent(email)}`}
          className="flex items-center gap-2 text-sm font-semibold tracking-wide group transition-all duration-300"
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center contact-royal-icon-box">
            <Mail className="w-4 h-4 text-[hsl(45,90%,65%)]" />
          </div>
          <span className="text-[hsl(45,90%,70%)] group-hover:text-[hsl(45,95%,80%)] transition-colors">
            {email}
          </span>
        </a>

        {/* Separator */}
        <div className="hidden sm:block w-px h-8 bg-[hsl(45,60%,40%,0.3)]" />
        <div className="sm:hidden w-16 h-px bg-[hsl(45,60%,40%,0.3)]" />

        {/* WhatsApp */}
        <a
          href={`https://wa.me/${whatsappNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm font-semibold tracking-wide group transition-all duration-300"
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center contact-royal-icon-box">
            <Phone className="w-4 h-4 text-[hsl(45,90%,65%)]" />
          </div>
          <span className="text-[hsl(45,90%,70%)] group-hover:text-[hsl(45,95%,80%)] transition-colors" dir="ltr">
            {phone}
          </span>
        </a>
      </motion.div>

      {/* Growth quick links */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="absolute bottom-2 flex flex-wrap items-center justify-center gap-2 text-xs"
      >
        <Link to="/join-driver" className="flex items-center gap-1 px-3 py-1 rounded-full bg-secondary/60 hover:bg-primary/20 text-foreground/80 hover:text-primary transition-colors">
          <Car className="w-3 h-3" /> انضم كسائق
        </Link>
        <Link to="/join-restaurant" className="flex items-center gap-1 px-3 py-1 rounded-full bg-secondary/60 hover:bg-primary/20 text-foreground/80 hover:text-primary transition-colors">
          <UtensilsCrossed className="w-3 h-3" /> سجل مطعمك
        </Link>
        <Link to="/invite" className="flex items-center gap-1 px-3 py-1 rounded-full bg-secondary/60 hover:bg-primary/20 text-foreground/80 hover:text-primary transition-colors">
          <Gift className="w-3 h-3" /> ادعُ صديقاً
        </Link>
        <Link to="/cities" className="flex items-center gap-1 px-3 py-1 rounded-full bg-secondary/60 hover:bg-primary/20 text-foreground/80 hover:text-primary transition-colors">
          <Globe className="w-3 h-3" /> المدن
        </Link>
      </motion.div>
    </div>
  );
};

export default GlobalContactFooter;
