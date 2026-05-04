import { useParams } from "react-router-dom";
import RestaurantMenuView from "@/components/menu/RestaurantMenuView";

const RestaurantMenu = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <RestaurantMenuView storeId={id} mode="customer" />;
};

export default RestaurantMenu;
