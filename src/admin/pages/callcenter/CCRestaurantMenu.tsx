import { useParams, useNavigate } from "react-router-dom";
import RestaurantMenuView from "@/components/menu/RestaurantMenuView";

const CCRestaurantMenu = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  if (!id) return null;
  return <RestaurantMenuView storeId={id} mode="readonly" onBack={() => navigate("/call-center/restaurants")} />;
};

export default CCRestaurantMenu;
