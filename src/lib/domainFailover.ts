/**
 * APK Domain Failover utility.
 * Tries domains in priority order, caches the working one for 24h.
 * Used by the native splash screen and as a runtime healthcheck.
 */

export const APK_DOMAIN_PRIORITY = [
  "https://www.hn-driver.com",     // 🟢 PRIMARY (VPS)
  "https://www.hndriver.company",  // Fallback (Lovable-managed)
  "https://www.hn-driver.net",     // Backup
] as const;

/**
 * Per-subdomain failover pairs.
 * Each APK uses the matching key (set via VITE_APK_ROLE at build time
 * or detected from current hostname).
 */
export const APK_SUBDOMAIN_FAILOVER: Record<string, string[]> = {
  main:       ["https://www.hn-driver.com",       "https://www.hndriver.company"],
  admin:      ["https://admin.hn-driver.com",     "https://admin.hndriver.company"],
  call:       ["https://call.hn-driver.com",      "https://call.hndriver.company"],
  callcenter: ["https://call.hn-driver.com",      "https://call.hndriver.company"],
  client:     ["https://client.hn-driver.com",    "https://client.hndriver.company"],
  delivery:   ["https://delivery.hn-driver.com",  "https://delivery.hndriver.company"],
  driver:     ["https://driver.hn-driver.com",    "https://driver.hndriver.company"],
  ride:       ["https://ride.hn-driver.com",      "https://ride.hndriver.company"],
  supervisor: ["https://supervisor.hn-driver.com","https://supervisor.hndriver.company"],
  stock:      ["https://stock.hn-driver.com",     "https://stock.hndriver.company"],
};

const CACHE_KEY = "hn_apk_active_domain";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min (faster failover recovery)
const PROBE_TIMEOUT_MS = 3000;

interface CachedDomain {
  url: string;
  ts: number;
}

const probe = async (url: string): Promise<boolean> => {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
    // no-cors HEAD: opaque response is enough to know server is reachable
    await fetch(url + "/favicon.png", {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-store",
      signal: ctrl.signal,
    });
    clearTimeout(t);
    return true;
  } catch {
    return false;
  }
};

export const getCachedDomain = (): string | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c: CachedDomain = JSON.parse(raw);
    if (Date.now() - c.ts > CACHE_TTL_MS) return null;
    return c.url;
  } catch {
    return null;
  }
};

export const setCachedDomain = (url: string) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ url, ts: Date.now() }));
  } catch { /* ignore */ }
};

export const clearCachedDomain = () => {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
};

/** Returns the first reachable domain (or null if all fail). */
export const findActiveDomain = async (
  priority: readonly string[] = APK_DOMAIN_PRIORITY,
): Promise<string | null> => {
  const cached = getCachedDomain();
  if (cached && priority.includes(cached) && await probe(cached)) return cached;

  for (const url of priority) {
    if (await probe(url)) {
      setCachedDomain(url);
      return url;
    }
  }
  return null;
};

/** Find the active domain for a specific sub-app role (admin, client, driver, ...).
 *  The Manara knowledge network (hn_manara_domain_map in localStorage) can
 *  override the static list when a group site has announced a domain change. */
export const findActiveDomainForRole = (role: keyof typeof APK_SUBDOMAIN_FAILOVER) => {
  let priority: readonly string[] = APK_SUBDOMAIN_FAILOVER[role] ?? APK_DOMAIN_PRIORITY;
  try {
    const map: Record<string, string> = JSON.parse(localStorage.getItem("hn_manara_domain_map") ?? "{}");
    const announced = map[role as string];
    if (announced && !priority.includes(announced)) {
      priority = [announced, ...priority];
    }
  } catch { /* ignore */ }
  return findActiveDomain(priority);
};
