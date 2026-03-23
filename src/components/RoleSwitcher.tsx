import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Car, User, Bike, RefreshCw } from "lucide-react";

const RoleSwitcher = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const switchRole = (role: string, path: string) => {
    localStorage.setItem("hn_user_role", role);
    setOpen(false);
    navigate(path);
  };

  const goHome = () => {
    localStorage.removeItem("hn_user_role");
    setOpen(false);
    navigate("/welcome");
  };

  return (
    <div className="fixed bottom-20 left-4 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="mb-3 flex flex-col gap-2 bg-card border border-border rounded-2xl p-3 shadow-xl"
          >
            <button
              onClick={() => switchRole("client", "/client")}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-accent transition-colors text-right"
            >
              <User className="w-5 h-5 text-info" />
              <span className="text-sm font-medium text-foreground">عميل</span>
            </button>
            <button
              onClick={() => switchRole("driver", "/driver")}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-accent transition-colors text-right"
            >
              <Car className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-foreground">سائق</span>
            </button>
            <button
              onClick={() => switchRole("delivery", "/delivery")}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-accent transition-colors text-right"
            >
              <Bike className="w-5 h-5 text-success" />
              <span className="text-sm font-medium text-foreground">توصيل</span>
            </button>
            <div className="h-px bg-border my-1" />
            <button
              onClick={goHome}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-accent transition-colors text-right"
            >
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">الصفحة الرئيسية</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(!open)}
        className="w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
      >
        <RefreshCw className={`w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`} />
      </motion.button>
    </div>
  );
};

export default RoleSwitcher;
