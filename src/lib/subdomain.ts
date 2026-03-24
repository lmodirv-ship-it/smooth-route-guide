/**
 * Subdomain detection for multi-domain deployment.
 *
 * Architecture:
 *   hn-driver.com         → Landing Page (main app)
 *   admin.hn-driver.com   → Admin Panel (standalone build via vite.config.admin.ts)
 *   driver.hn-driver.com  → Driver interface (future standalone build)
 *   client.hn-driver.com  → Client interface (future standalone build)
 *   delivery.hn-driver.com → Delivery interface (future standalone build)
 *   callcenter.hn-driver.com → Call center (future standalone build)
 *
 * Currently admin is fully separated. The rest run inside the main app
 * and use subdomain detection to auto-route users.
 */

export type SubdomainApp = "main" | "admin" | "driver" | "client" | "delivery" | "callcenter";

const SUBDOMAIN_MAP: Record<string, SubdomainApp> = {
  admin: "admin",
  driver: "driver",
  client: "client",
  delivery: "delivery",
  callcenter: "callcenter",
};

/**
 * Detect which sub-application should be served based on the hostname.
 * Returns "main" for the root domain or localhost.
 */
export function detectSubdomain(): SubdomainApp {
  const hostname = window.location.hostname;

  // localhost / IP — always main
  if (hostname === "localhost" || hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    return "main";
  }

  // Extract first part of hostname
  const parts = hostname.split(".");
  if (parts.length >= 3) {
    const sub = parts[0].toLowerCase();
    return SUBDOMAIN_MAP[sub] || "main";
  }

  return "main";
}

/** Maps a subdomain app to its canonical base route */
export const SUBDOMAIN_ROUTES: Record<SubdomainApp, string> = {
  main: "/",
  admin: "/admin",
  driver: "/driver",
  client: "/customer",
  delivery: "/delivery",
  callcenter: "/call-center",
};
