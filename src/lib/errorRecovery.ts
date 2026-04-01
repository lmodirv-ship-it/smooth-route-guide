/**
 * Smart Error Recovery Engine
 * Provides intelligent route matching, error recovery, and auto-correction.
 * Uses Levenshtein distance for fuzzy route matching.
 */

// All known valid routes in the platform
const KNOWN_ROUTES = [
  "/", "/splash", "/welcome", "/login", "/complete-profile",
  "/forgot-password", "/reset-password", "/community",
  // Customer
  "/customer", "/customer/ride", "/customer/tracking", "/customer/booking",
  "/customer/payment", "/customer/wallet", "/customer/history",
  "/customer/profile", "/customer/support",
  // Driver
  "/driver", "/driver/tracking", "/driver/history", "/driver/notifications",
  "/driver/settings", "/driver/documents", "/driver/trip", "/driver/profile",
  "/driver/wallet", "/driver/car-info", "/driver/promotions", "/driver/support",
  "/driver/status", "/driver/earnings", "/driver/delivery", "/driver/subscription",
  // Delivery
  "/delivery", "/delivery/tracking", "/delivery/history", "/delivery/courier/send",
  "/delivery/courier/address", "/delivery/courier/track", "/delivery/support",
  "/delivery/restaurants", "/delivery/cart", "/delivery/my-store",
  // AI
  "/ai", "/assistant",
  // Admin
  "/admin", "/admin/dashboard", "/admin/drivers", "/admin/clients",
  "/admin/ride-requests", "/admin/delivery-orders", "/admin/restaurants",
  "/admin/earnings", "/admin/settings", "/admin/alerts", "/admin/map",
  "/admin/themes", "/admin/documents", "/admin/permissions",
  "/admin/versions", "/admin/zones", "/admin/city-activation",
  "/admin/call-center", "/admin/smart-assistant", "/admin/sub-assistants",
  "/admin/supervisors", "/admin/community",
];

// Common typo corrections
const TYPO_MAP: Record<string, string> = {
  "/custmer": "/customer",
  "/costumer": "/customer",
  "/cusomer": "/customer",
  "/diver": "/driver",
  "/drivr": "/driver",
  "/drvier": "/driver",
  "/delivry": "/delivery",
  "/delivrey": "/delivery",
  "/admn": "/admin",
  "/admi": "/admin",
  "/restaraunts": "/delivery/restaurants",
  "/restraunts": "/delivery/restaurants",
  "/setings": "/admin/settings",
  "/login/": "/login",
  "/home": "/",
  "/index": "/",
  "/main": "/",
};

/** Levenshtein distance between two strings */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

export interface RouteSuggestion {
  path: string;
  confidence: number; // 0-1
}

/** Find the best matching route for a given path */
export function findBestRoute(path: string): RouteSuggestion | null {
  const normalized = path.toLowerCase().replace(/\/+$/, "") || "/";

  // Exact match
  if (KNOWN_ROUTES.includes(normalized)) {
    return { path: normalized, confidence: 1 };
  }

  // Typo map
  if (TYPO_MAP[normalized]) {
    return { path: TYPO_MAP[normalized], confidence: 0.95 };
  }

  // Check if it starts with a known prefix (dynamic routes)
  const dynamicPrefixes = ["/delivery/restaurant/", "/delivery/store/", "/delivery/order/", "/p/", "/auth/"];
  for (const prefix of dynamicPrefixes) {
    if (normalized.startsWith(prefix)) {
      return { path: normalized, confidence: 0.9 };
    }
  }

  // Fuzzy match using Levenshtein distance
  let bestMatch = "";
  let bestDistance = Infinity;

  for (const route of KNOWN_ROUTES) {
    const distance = levenshtein(normalized, route);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = route;
    }
  }

  // Only suggest if distance is reasonable (max 3 edits for short paths, 4 for long)
  const maxDistance = normalized.length <= 10 ? 3 : 4;
  if (bestDistance <= maxDistance && bestMatch) {
    const confidence = Math.max(0, 1 - (bestDistance / Math.max(normalized.length, bestMatch.length)));
    return { path: bestMatch, confidence };
  }

  // Segment-based matching: match the first segment
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length > 0) {
    const firstSegment = "/" + segments[0];
    const sectionRoutes = KNOWN_ROUTES.filter(r => r.startsWith(firstSegment));
    if (sectionRoutes.length > 0) {
      return { path: sectionRoutes[0], confidence: 0.5 };
    }
  }

  return null;
}

/** Categorize an error for appropriate recovery action */
export type ErrorCategory = "network" | "chunk_load" | "render" | "auth" | "unknown";

export function categorizeError(error: Error): ErrorCategory {
  const msg = error.message?.toLowerCase() || "";
  const name = error.name?.toLowerCase() || "";

  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("load failed")) {
    return "network";
  }
  if (msg.includes("loading chunk") || msg.includes("dynamically imported module") || msg.includes("loading css chunk")) {
    return "chunk_load";
  }
  if (msg.includes("unauthorized") || msg.includes("jwt") || msg.includes("auth")) {
    return "auth";
  }
  if (name.includes("typeerror") || name.includes("referenceerror") || msg.includes("cannot read") || msg.includes("is not a function")) {
    return "render";
  }
  return "unknown";
}

/** Get recovery action for an error category */
export function getRecoveryAction(category: ErrorCategory): { action: "retry" | "reload" | "redirect" | "wait"; delay: number; target?: string } {
  switch (category) {
    case "network":
      return { action: "wait", delay: 3000 };
    case "chunk_load":
      return { action: "reload", delay: 1000 };
    case "auth":
      return { action: "redirect", delay: 500, target: "/login" };
    case "render":
      return { action: "retry", delay: 1500 };
    default:
      return { action: "retry", delay: 2000 };
  }
}
