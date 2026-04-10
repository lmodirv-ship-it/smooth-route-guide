import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeNativeApp } from "./lib/nativeApp";

const CACHE_RESET_VERSION = "2026-04-10-disable-pwa-cache";

async function cleanupLegacyWebCaches() {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
    }
  } catch (error) {
    console.warn("[BootCleanup] Failed to clear legacy caches", error);
  }
}

void (async () => {
  try {
    const lastReset = localStorage.getItem("hn_cache_reset_version");
    if (lastReset !== CACHE_RESET_VERSION) {
      await cleanupLegacyWebCaches();
      localStorage.setItem("hn_cache_reset_version", CACHE_RESET_VERSION);
    }
  } catch {
    await cleanupLegacyWebCaches();
  }
})();

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
