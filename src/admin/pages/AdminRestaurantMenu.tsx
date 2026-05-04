import { useParams, useNavigate } from "react-router-dom";
import RestaurantMenuView from "@/components/menu/RestaurantMenuView";

const AdminRestaurantMenu = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  if (!id) return null;
  return <RestaurantMenuView storeId={id} mode="readonly" onBack={() => navigate("/admin/restaurants")} />;
};

export default AdminRestaurantMenu;
