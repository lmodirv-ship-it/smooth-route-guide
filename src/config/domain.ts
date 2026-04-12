/**
 * Official domain configuration for HN Driver platform.
 * Used across the app for SEO, links, and branding.
 * 
 * IMPORTANT: This file is additive — do NOT remove existing configs.
 */

export const OFFICIAL_DOMAIN = "hn-driver.com";
export const OFFICIAL_URL = "https://www.hn-driver.com";
export const ADMIN_URL = "https://admin.hn-driver.com";

/** Legacy .net domain — kept for backward compatibility */
export const LEGACY_DOMAIN = "hn-driver.net";
export const LEGACY_URL = "https://www.hn-driver.net";
export const LEGACY_ADMIN_URL = "https://admin.hn-driver.net";

/** Server IPs */
export const SERVERS = {
  primary: "213.156.132.166",
} as const;

/** All official subdomains (.com — primary) */
export const OFFICIAL_SUBDOMAINS = {
  main: "https://www.hn-driver.com",
  admin: "https://admin.hn-driver.com",
  driver: "https://driver.hn-driver.com",
  client: "https://client.hn-driver.com",
  delivery: "https://delivery.hn-driver.com",
  callcenter: "https://call.hn-driver.com",
} as const;

/** Legacy subdomains (.net — kept for backward compatibility) */
export const LEGACY_SUBDOMAINS = {
  main: "https://www.hn-driver.net",
  admin: "https://admin.hn-driver.net",
  driver: "https://driver.hn-driver.net",
  client: "https://client.hn-driver.net",
  delivery: "https://delivery.hn-driver.net",
  callcenter: "https://call.hn-driver.net",
} as const;

/** External HN Groupe projects — fully isolated */
export const HN_STOCK = {
  domain: "hn-driver.site",
  url: "https://www.hn-driver.site",
} as const;

export const SOUK_HN = {
  domain: "hn-driver.online",
  url: "https://www.hn-driver.online",
} as const;

/** All supported domains for CORS / auth redirect checks */
export const ALL_DOMAINS = ["hn-driver.com", "hn-driver.net", "hn-driver.online", "hn-driver.site"] as const;

/** Main pages with their full URLs — useful for sitemaps, sharing, etc. */
export const MAIN_PAGES = {
  home: { path: "/", url: "https://www.hn-driver.com", label: "الصفحة الرئيسية" },
  login: { path: "/login", url: "https://www.hn-driver.com/login", label: "تسجيل الدخول" },
  welcome: { path: "/welcome", url: "https://www.hn-driver.com/welcome", label: "مرحبا" },
  customer: { path: "/customer", url: "https://www.hn-driver.com/customer", label: "لوحة العميل" },
  customerRide: { path: "/customer/ride", url: "https://www.hn-driver.com/customer/ride", label: "طلب رحلة" },
  customerTracking: { path: "/customer/tracking", url: "https://www.hn-driver.com/customer/tracking", label: "تتبع الرحلة" },
  customerBooking: { path: "/customer/booking", url: "https://www.hn-driver.com/customer/booking", label: "الحجز" },
  customerPayment: { path: "/customer/payment", url: "https://www.hn-driver.com/customer/payment", label: "الدفع" },
  customerWallet: { path: "/customer/wallet", url: "https://www.hn-driver.com/customer/wallet", label: "المحفظة" },
  customerHistory: { path: "/customer/history", url: "https://www.hn-driver.com/customer/history", label: "السجل" },
  customerProfile: { path: "/customer/profile", url: "https://www.hn-driver.com/customer/profile", label: "الملف الشخصي" },
  customerSupport: { path: "/customer/support", url: "https://www.hn-driver.com/customer/support", label: "الدعم" },
  driver: { path: "/driver", url: "https://www.hn-driver.com/driver", label: "لوحة السائق" },
  driverTracking: { path: "/driver/tracking", url: "https://www.hn-driver.com/driver/tracking", label: "تتبع السائق" },
  driverHistory: { path: "/driver/history", url: "https://www.hn-driver.com/driver/history", label: "سجل السائق" },
  driverEarnings: { path: "/driver/earnings", url: "https://www.hn-driver.com/driver/earnings", label: "أرباح السائق" },
  driverWallet: { path: "/driver/wallet", url: "https://www.hn-driver.com/driver/wallet", label: "محفظة السائق" },
  driverProfile: { path: "/driver/profile", url: "https://www.hn-driver.com/driver/profile", label: "ملف السائق" },
  driverDelivery: { path: "/driver/delivery", url: "https://www.hn-driver.com/driver/delivery", label: "توصيل السائق" },
  delivery: { path: "/delivery", url: "https://www.hn-driver.com/delivery", label: "التوصيل" },
  restaurants: { path: "/delivery/restaurants", url: "https://www.hn-driver.com/delivery/restaurants", label: "المطاعم" },
  deliveryTracking: { path: "/delivery/tracking", url: "https://www.hn-driver.com/delivery/tracking", label: "تتبع التوصيل" },
  deliveryHistory: { path: "/delivery/history", url: "https://www.hn-driver.com/delivery/history", label: "سجل التوصيل" },
  ai: { path: "/ai", url: "https://www.hn-driver.com/ai", label: "المساعد الذكي" },
} as const;

/** Admin pages (served from admin.hn-driver.com) */
export const ADMIN_PAGES = {
  dashboard: { path: "/", url: "https://admin.hn-driver.com", label: "لوحة التحكم" },
  login: { path: "/login", url: "https://admin.hn-driver.com/login", label: "دخول المسؤول" },
  users: { path: "/users", url: "https://admin.hn-driver.com/users", label: "المستخدمين" },
  drivers: { path: "/drivers", url: "https://admin.hn-driver.com/drivers", label: "السائقين" },
  delivery: { path: "/delivery", url: "https://admin.hn-driver.com/delivery", label: "طلبات التوصيل" },
  restaurants: { path: "/restaurants", url: "https://admin.hn-driver.com/restaurants", label: "المطاعم" },
  settings: { path: "/settings", url: "https://admin.hn-driver.com/settings", label: "الإعدادات" },
  callCenter: { path: "/call-center", url: "https://admin.hn-driver.com/call-center", label: "مركز الاتصال" },
  smartAssistant: { path: "/smart-assistant", url: "https://admin.hn-driver.com/smart-assistant", label: "المساعد الذكي" },
  zones: { path: "/zones", url: "https://admin.hn-driver.com/zones", label: "المناطق" },
  earnings: { path: "/earnings", url: "https://admin.hn-driver.com/earnings", label: "الأرباح" },
  alerts: { path: "/alerts", url: "https://admin.hn-driver.com/alerts", label: "التنبيهات" },
  liveMap: { path: "/live-map", url: "https://admin.hn-driver.com/live-map", label: "الخريطة الحية" },
} as const;
