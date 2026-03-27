import { createRoot } from "react-dom/client";
import DriverRideApp from "./DriverRideApp";
import "../index.css";
import { initializeNativeApp } from "../lib/nativeApp";

void initializeNativeApp();

createRoot(document.getElementById("root")!).render(<DriverRideApp />);
