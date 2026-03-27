import { createRoot } from "react-dom/client";
import DriverDeliveryApp from "./DriverDeliveryApp";
import "../index.css";
import { initializeNativeApp } from "../lib/nativeApp";

void initializeNativeApp();

createRoot(document.getElementById("root")!).render(<DriverDeliveryApp />);
