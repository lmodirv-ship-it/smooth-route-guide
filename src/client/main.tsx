import { createRoot } from "react-dom/client";
import ClientApp from "./ClientApp";
import "../index.css";
import { initializeNativeApp } from "../lib/nativeApp";

void initializeNativeApp();

createRoot(document.getElementById("root")!).render(<ClientApp />);