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

// ── Global error handlers for unhandled errors ──
// Debounce reloads: max 1 auto-reload per 5 minutes to prevent reload loops
const RELOAD_COOLDOWN_KEY = "hn_last_auto_reload";
const RELOAD_COOLDOWN_MS = 5 * 60 * 1000;

function canAutoReload(): boolean {
  const last = Number(sessionStorage.getItem(RELOAD_COOLDOWN_KEY) || "0");
  if (Date.now() - last < RELOAD_COOLDOWN_MS) return false;
  sessionStorage.setItem(RELOAD_COOLDOWN_KEY, String(Date.now()));
  return true;
}

window.addEventListener("unhandledrejection", (event) => {
  const msg = event.reason?.message || String(event.reason);
  if (msg.includes("Loading chunk") || msg.includes("dynamically imported module") || msg.includes("Loading CSS chunk")) {
    console.warn("[AutoRecovery] Chunk load failure detected");
    event.preventDefault();
    if (canAutoReload()) window.location.reload();
  }
});

window.addEventListener("error", (event) => {
  if (event.message?.includes("Loading chunk") || event.message?.includes("Script error")) {
    console.warn("[AutoRecovery] Script error detected");
    if (canAutoReload()) window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
