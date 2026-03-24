/**
 * Standalone entry point for the Admin Panel.
 * Used when building/deploying admin separately (admin.hndriver.com).
 * Shares the same Supabase backend as the main app.
 */
import { createRoot } from "react-dom/client";
import AdminApp from "./AdminApp";
import "../index.css";

createRoot(document.getElementById("root")!).render(<AdminApp />);
