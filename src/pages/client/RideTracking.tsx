import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Redirects to /customer/tracking (Supabase-based tracking).
 * Kept for backward compatibility with existing links.
 */
const RideTracking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const id = params.get("id");

  useEffect(() => {
    navigate(id ? `/customer/tracking?id=${id}` : "/customer/tracking", { replace: true });
  }, [navigate, id]);

  return null;
};

export default RideTracking;
