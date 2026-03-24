/**
 * Canonical route map — the single source of truth for all routing decisions.
 *
 * Naming convention:
 *   DB role  →  canonical dashboard path
 *   "user"   →  /customer   (default signup role)
 *   "driver" →  /driver
 *   "admin"  →  /admin
 *   "agent"  →  /call-center
 *
 * Legacy paths (/client, /driver-panel, /customer-tracking, etc.) are kept as
 * redirect-only routes in App.tsx.
 */

export type DbRole = "admin" | "moderator" | "user" | "driver" | "agent" | "delivery" | "store_owner";

/** Maps a DB role to its canonical dashboard path. */
export const ROLE_DASHBOARD: Record<string, string> = {
  driver: "/driver",
  client: "/customer",
  user: "/customer",
  admin: "/admin",
  agent: "/call-center",
  delivery: "/driver/delivery",
  store_owner: "/delivery/my-store",
};

/** Human-readable labels (Arabic) for each DB role. */
export const ROLE_LABELS: Record<string, string> = {
  driver: "سائق",
  client: "عميل",
  user: "عميل",
  delivery: "سائق توصيل",
  admin: "مسؤول",
  agent: "مركز اتصال",
  moderator: "مشرف",
  store_owner: "صاحب محل",
};

/**
 * Given a DB role, return the canonical dashboard path.
 * Falls back to /customer for unknown roles.
 */
export function dashboardForRole(role: string): string {
  return ROLE_DASHBOARD[role] || "/customer";
}
