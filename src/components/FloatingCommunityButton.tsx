import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Users } from "lucide-react";

interface Props {
  communityPath?: string;
}

/**
 * Floating button to access Community Chat.
 * Hidden when already on the community page.
 */
const FloatingCommunityButton = ({ communityPath = "/community" }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname.includes("community")) return null;

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => navigate(communityPath)}
      className="fixed bottom-24 right-4 z-50 w-12 h-12 rounded-full bg-emerald-500 text-white shadow-lg flex items-center justify-center hover:bg-emerald-600 transition-colors"
      title="مجتمع HN"
    >
      <Users className="w-5 h-5" />
    </motion.button>
  );
};

export default FloatingCommunityButton;
