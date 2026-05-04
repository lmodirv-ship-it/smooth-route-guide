import { useParams, useNavigate, useLocation } from "react-router-dom";
import RestaurantMenuView from "@/components/menu/RestaurantMenuView";

const AdminRestaurantMenu = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  if (!id) return null;
  const backPath = location.pathname.startsWith("/admin/") ? "/admin/restaurants" : "/restaurants";
  return <RestaurantMenuView storeId={id} mode="readonly" onBack={() => navigate(backPath)} />;
};

export default AdminRestaurantMenu;
