import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeNativeApp } from "./lib/nativeApp";

// ── PWA Guard: prevent service worker issues in preview/iframe ──
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
}

void initializeNativeApp();

// ── Global error handlers: log only, never auto-reload ──
window.addEventListener("unhandledrejection", (event) => {
  const msg = event.reason?.message || String(event.reason);
  if (msg.includes("Loading chunk") || msg.includes("dynamically imported module") || msg.includes("Loading CSS chunk")) {
    console.warn("[ErrorLog] Chunk load issue:", msg);
    event.preventDefault();
  }
});

window.addEventListener("error", (event) => {
  if (event.message?.includes("Loading chunk") || event.message?.includes("Script error")) {
    console.warn("[ErrorLog] Script error:", event.message);
  }
});

createRoot(document.getElementById("root")!).render(<App />);
