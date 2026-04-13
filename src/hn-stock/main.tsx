/**
 * Standalone entry point for HN-STOCK app.
 * Deployed to hn-driver.site
 */
import { createRoot } from "react-dom/client";
import HNStockApp from "./HNStockApp";
import "../index.css";

createRoot(document.getElementById("root")!).render(<HNStockApp />);
