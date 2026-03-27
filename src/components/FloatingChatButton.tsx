import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { MessagesSquare } from "lucide-react";

const FloatingChatButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Hide on community chat page itself and admin pages
  if (location.pathname === "/community" || location.pathname.startsWith("/admin")) return null;

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => navigate("/community")}
      className="fixed bottom-20 left-4 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:shadow-xl hover:shadow-primary/40 transition-shadow"
      title="الدردشة المجتمعية"
    >
      <MessagesSquare className="w-5 h-5" />
    </motion.button>
  );
};

export default FloatingChatButton;
