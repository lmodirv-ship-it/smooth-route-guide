import { motion } from "framer-motion";
import { Mail, Phone } from "lucide-react";

const GlobalContactFooter = () => {
  return (
    <div className="w-full py-4 px-4 flex justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="contact-royal-box flex flex-col sm:flex-row items-center gap-3 sm:gap-6 px-6 py-4 rounded-2xl max-w-xl w-full"
      >
        {/* Email */}
        <a
          href="mailto:lmodirv@gmail.com"
          className="flex items-center gap-2 text-sm font-semibold tracking-wide group transition-all duration-300"
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center contact-royal-icon-box">
            <Mail className="w-4 h-4 text-[hsl(45,90%,65%)]" />
          </div>
          <span className="text-[hsl(45,90%,70%)] group-hover:text-[hsl(45,95%,80%)] transition-colors">
            lmodirv@gmail.com
          </span>
        </a>

        {/* Separator */}
        <div className="hidden sm:block w-px h-8 bg-[hsl(45,60%,40%,0.3)]" />
        <div className="sm:hidden w-16 h-px bg-[hsl(45,60%,40%,0.3)]" />

        {/* WhatsApp */}
        <a
          href="https://wa.me/2120668546358"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm font-semibold tracking-wide group transition-all duration-300"
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center contact-royal-icon-box">
            <Phone className="w-4 h-4 text-[hsl(45,90%,65%)]" />
          </div>
          <span className="text-[hsl(45,90%,70%)] group-hover:text-[hsl(45,95%,80%)] transition-colors" dir="ltr">
            +212 0668546358
          </span>
        </a>
      </motion.div>
    </div>
  );
};

export default GlobalContactFooter;
