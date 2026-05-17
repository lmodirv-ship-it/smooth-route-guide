/**
 * Site Map Registry — Static catalogue of every page in the platform.
 * Used by the admin Site Map page (/admin/sitemap) to show clickable links
 * to all public + internal routes across every sub-app.
 *
 * Keep this list in sync when adding new routes in:
 *   - src/app/MainRoutes.tsx
 *   - src/admin/AdminRoutes.tsx
 *   - src/hn-stock/HNStockApp.tsx
 */
export type AccessLevel =
  | "public"
  | "auth"
  | "client"
  | "driver"
  | "delivery"
  | "store_owner"
  | "admin"
  | "agent"
  | "supervisor"
  | "stock";

export interface SiteMapEntry {
  path: string;
  title: string;
  category: string;
  access: AccessLevel;
  dynamic?: boolean;
  note?: string;
}

export const SITE_MAP: SiteMapEntry[] = [
  // ─── عام / تسويق ───
  { path: "/", title: "الصفحة الرئيسية", category: "عام / تسويق", access: "public" },
  { path: "/welcome", title: "الترحيب", category: "عام / تسويق", access: "public" },
  { path: "/splash", title: "Splash", category: "عام / تسويق", access: "public" },
  { path: "/hn-groupe", title: "بوابة HN Groupe", category: "عام / تسويق", access: "public" },
  { path: "/projects", title: "كل المشاريع", category: "عام / تسويق", access: "public" },
  { path: "/cities", title: "فهرس المدن", category: "عام / تسويق", access: "public" },
  { path: "/city/tanger", title: "صفحة مدينة (مثال: طنجة)", category: "عام / تسويق", access: "public", dynamic: true, note: "/city/:slug" },
  { path: "/join-driver", title: "انضم كسائق", category: "عام / تسويق", access: "public" },
  { path: "/join-restaurant", title: "انضم كمطعم", category: "عام / تسويق", access: "public" },
  { path: "/invite", title: "ادعُ صديق", category: "عام / تسويق", access: "public" },
  { path: "/restaurants", title: "المطاعم (تحويل)", category: "عام / تسويق", access: "public" },
  { path: "/privacy", title: "سياسة الخصوصية", category: "عام / تسويق", access: "public" },
  { path: "/unsubscribe", title: "إلغاء الاشتراك من البريد", category: "عام / تسويق", access: "public" },
  { path: "/p/example", title: "صفحة CMS ديناميكية", category: "عام / تسويق", access: "public", dynamic: true, note: "/p/:slug" },
  { path: "/blog/IDxxxxxx", title: "مقال مدونة", category: "عام / تسويق", access: "public", dynamic: true, note: "/blog/:id" },

  // ─── المصادقة ───
  { path: "/login", title: "تسجيل الدخول", category: "المصادقة", access: "public" },
  { path: "/auth/client", title: "تسجيل دخول حسب الدور", category: "المصادقة", access: "public", dynamic: true, note: "/auth/:role" },
  { path: "/forgot-password", title: "نسيت كلمة المرور", category: "المصادقة", access: "public" },
  { path: "/reset-password", title: "إعادة تعيين كلمة المرور", category: "المصادقة", access: "public" },
  { path: "/complete-profile", title: "إكمال الملف الشخصي", category: "المصادقة", access: "auth" },

  // ─── العميل ───
  { path: "/customer", title: "لوحة العميل", category: "العميل", access: "client" },
  { path: "/customer/ride", title: "حجز رحلة", category: "العميل", access: "client" },
  { path: "/customer/tracking", title: "تتبع الرحلة", category: "العميل", access: "client" },
  { path: "/customer/booking", title: "الحجوزات", category: "العميل", access: "client" },
  { path: "/customer/payment", title: "الدفع", category: "العميل", access: "client" },
  { path: "/customer/wallet", title: "المحفظة", category: "العميل", access: "client" },
  { path: "/customer/history", title: "السجل", category: "العميل", access: "client" },
  { path: "/customer/profile", title: "الملف الشخصي", category: "العميل", access: "client" },
  { path: "/customer/support", title: "الدعم", category: "العميل", access: "client" },

  // ─── السائق ───
  { path: "/driver", title: "لوحة السائق", category: "السائق", access: "driver" },
  { path: "/driver/tracking", title: "تتبع السائق", category: "السائق", access: "driver" },
  { path: "/driver/history", title: "سجل الرحلات", category: "السائق", access: "driver" },
  { path: "/driver/notifications", title: "الإشعارات", category: "السائق", access: "driver" },
  { path: "/driver/settings", title: "الإعدادات", category: "السائق", access: "driver" },
  { path: "/driver/documents", title: "رفع الوثائق", category: "السائق", access: "driver" },
  { path: "/driver/trip", title: "رحلة نشطة", category: "السائق", access: "driver" },
  { path: "/driver/profile", title: "ملف السائق", category: "السائق", access: "driver" },
  { path: "/driver/wallet", title: "محفظة السائق", category: "السائق", access: "driver" },
  { path: "/driver/car-info", title: "بيانات السيارة", category: "السائق", access: "driver" },
  { path: "/driver/promotions", title: "العروض", category: "السائق", access: "driver" },
  { path: "/driver/support", title: "الدعم", category: "السائق", access: "driver" },
  { path: "/driver/status", title: "الحالة", category: "السائق", access: "driver" },
  { path: "/driver/earnings", title: "الأرباح", category: "السائق", access: "driver" },
  { path: "/driver/delivery", title: "وضع التوصيل", category: "السائق", access: "delivery" },
  { path: "/driver/delivery/tracking", title: "تتبع التوصيل", category: "السائق", access: "delivery" },
  { path: "/driver/subscription", title: "اشتراك السائق", category: "السائق", access: "driver" },

  // ─── التوصيل والمتاجر ───
  { path: "/delivery", title: "الصفحة الرئيسية للتوصيل", category: "التوصيل", access: "public" },
  { path: "/delivery/restaurants", title: "قائمة المطاعم", category: "التوصيل", access: "public" },
  { path: "/delivery/restaurant/1", title: "قائمة طعام مطعم", category: "التوصيل", access: "public", dynamic: true, note: "/delivery/restaurant/:id" },
  { path: "/delivery/store/1", title: "تفاصيل متجر", category: "التوصيل", access: "public", dynamic: true, note: "/delivery/store/:id" },
  { path: "/delivery/grocery", title: "البقالة", category: "التوصيل", access: "public", dynamic: true, note: "/delivery/:category" },
  { path: "/delivery/pharmacy", title: "الصيدلية", category: "التوصيل", access: "public", dynamic: true },
  { path: "/delivery/cart", title: "سلة المشتريات", category: "التوصيل", access: "client" },
  { path: "/delivery/tracking", title: "تتبع الطلب", category: "التوصيل", access: "client" },
  { path: "/delivery/history", title: "سجل الطلبات", category: "التوصيل", access: "client" },
  { path: "/delivery/order/1", title: "تتبع طلب محدد", category: "التوصيل", access: "client", dynamic: true, note: "/delivery/order/:id" },
  { path: "/delivery/courier/send", title: "إرسال طرد", category: "التوصيل", access: "client" },
  { path: "/delivery/courier/address", title: "عنوان الطرد", category: "التوصيل", access: "client" },
  { path: "/delivery/courier/track", title: "تتبع طرد", category: "التوصيل", access: "client" },
  { path: "/delivery/support", title: "دعم التوصيل", category: "التوصيل", access: "client" },
  { path: "/delivery/my-store", title: "متجري (لصاحب المحل)", category: "التوصيل", access: "store_owner" },
  { path: "/delivery/store-subscription", title: "اشتراك المتجر", category: "التوصيل", access: "store_owner" },

  // ─── الذكاء الاصطناعي والمجتمع ───
  { path: "/ai", title: "وكيل الذكاء الاصطناعي", category: "AI / مجتمع", access: "auth" },
  { path: "/assistant", title: "المساعد الذكي", category: "AI / مجتمع", access: "auth" },
  { path: "/community", title: "الدردشة المجتمعية", category: "AI / مجتمع", access: "auth" },

  // ─── لوحة الإدارة ───
  { path: "/admin/login", title: "دخول الإدارة", category: "لوحة الإدارة", access: "public" },
  { path: "/admin", title: "لوحة التحكم", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/supervisors", title: "المُشرفون", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/users", title: "المستخدمون المسجلون", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/requests", title: "طلبات الرحلات", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/drivers", title: "السائقون", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/driver-pipeline", title: "خط أنابيب السائقين", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/clients", title: "العملاء", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/earnings", title: "الأرباح", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/map", title: "الخريطة الحية", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/alerts", title: "التنبيهات", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/documents", title: "المستندات", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/delivery", title: "طلبات التوصيل", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/call-center", title: "مركز الاتصال", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/restaurants", title: "المطاعم", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/zones", title: "المناطق والتسعير", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/city-activation", title: "تنشيط المدن", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/commission-rates", title: "نسب العمولة", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/smart-assistant", title: "المساعد الذكي", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/sub-assistants", title: "المساعدون الفرعيون", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/driver-packages", title: "باقات السائقين", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/themes", title: "الثيمات", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/ads", title: "إدارة الإعلانات", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/analytics", title: "تحليلات الزوار", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/growth", title: "تحليلات النمو", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/utm-builder", title: "صانع روابط UTM", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/campaigns", title: "حملات التسويق", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/versions", title: "إدارة الإصدارات", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/settings", title: "الإعدادات", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/pages", title: "إدارة الصفحات", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/database", title: "إدارة قاعدة البيانات", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/permissions", title: "الصلاحيات", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/messaging", title: "المراسلات الداخلية", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/community-chat", title: "الدردشة المجتمعية", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/health-check", title: "فحص صحة النظام", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/wallet-recharge", title: "طلبات شحن المحفظة", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/payments", title: "إدارة المدفوعات", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/paypal-settings", title: "إعدادات PayPal", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/paypal-live", title: "PayPal مباشر", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/coupons", title: "كوبونات الخصم", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/prospecting", title: "التنقيب عن الشركاء", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/mailbluster", title: "نماذج البريد", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/api-keys", title: "مفاتيح API", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/partner-sites", title: "المواقع الشريكة", category: "لوحة الإدارة", access: "admin" },
  { path: "/admin/sitemap", title: "خريطة الموقع", category: "لوحة الإدارة", access: "admin" },

  // ─── مركز الاتصال ───
  { path: "/call-center/login", title: "دخول مركز الاتصال", category: "مركز الاتصال", access: "public" },
  { path: "/call-center", title: "لوحة مركز الاتصال", category: "مركز الاتصال", access: "agent" },
  { path: "/call-center/incoming", title: "المكالمات الواردة", category: "مركز الاتصال", access: "agent" },
  { path: "/call-center/manual-booking", title: "حجز يدوي", category: "مركز الاتصال", access: "agent" },
  { path: "/call-center/ride-assign", title: "تعيين رحلة", category: "مركز الاتصال", access: "agent" },
  { path: "/call-center/customers", title: "بحث العملاء", category: "مركز الاتصال", access: "agent" },
  { path: "/call-center/drivers", title: "بحث السائقين", category: "مركز الاتصال", access: "agent" },
  { path: "/call-center/complaints", title: "الشكاوى", category: "مركز الاتصال", access: "agent" },
  { path: "/call-center/tickets", title: "التذاكر", category: "مركز الاتصال", access: "agent" },
  { path: "/call-center/delivery", title: "طلبات التوصيل", category: "مركز الاتصال", access: "agent" },
  { path: "/call-center/restaurants", title: "المطاعم", category: "مركز الاتصال", access: "agent" },
  { path: "/call-center/auto-import", title: "الاستيراد التلقائي", category: "مركز الاتصال", access: "agent" },
  { path: "/call-center/google-import", title: "استيراد Google", category: "مركز الاتصال", access: "agent" },
  { path: "/call-center/emergency", title: "الطوارئ", category: "مركز الاتصال", access: "agent" },
  { path: "/call-center/history", title: "سجل المكالمات", category: "مركز الاتصال", access: "agent" },
  { path: "/call-center/reports", title: "التقارير", category: "مركز الاتصال", access: "agent" },
  { path: "/call-center/map", title: "الخريطة الحية", category: "مركز الاتصال", access: "agent" },
  { path: "/call-center/alerts", title: "التنبيهات", category: "مركز الاتصال", access: "agent" },
  { path: "/call-center/knowledge", title: "قاعدة المعرفة", category: "مركز الاتصال", access: "agent" },
  { path: "/call-center/messaging", title: "المراسلات", category: "مركز الاتصال", access: "agent" },
  { path: "/call-center/community", title: "المجتمع", category: "مركز الاتصال", access: "agent" },
  { path: "/call-center/analytics", title: "التحليلات", category: "مركز الاتصال", access: "agent" },
  { path: "/call-center/wallet-recharge", title: "شحن المحفظة", category: "مركز الاتصال", access: "agent" },
  { path: "/call-center/payments", title: "المدفوعات", category: "مركز الاتصال", access: "agent" },
  { path: "/call-center/prospecting", title: "التنقيب", category: "مركز الاتصال", access: "agent" },
  { path: "/call-center/relations", title: "علاقات 360", category: "مركز الاتصال", access: "agent" },

  // ─── المُشرف ───
  { path: "/supervisor", title: "لوحة المُشرف", category: "المُشرف", access: "supervisor" },
  { path: "/supervisor/drivers", title: "السائقون", category: "المُشرف", access: "supervisor" },
  { path: "/supervisor/delivery", title: "التوصيل", category: "المُشرف", access: "supervisor" },
  { path: "/supervisor/call-center", title: "مركز الاتصال", category: "المُشرف", access: "supervisor" },
  { path: "/supervisor/restaurants", title: "المطاعم", category: "المُشرف", access: "supervisor" },
  { path: "/supervisor/city-activation", title: "تنشيط المدن", category: "المُشرف", access: "supervisor" },
  { path: "/supervisor/messaging", title: "المراسلات", category: "المُشرف", access: "supervisor" },
  { path: "/supervisor/community", title: "المجتمع", category: "المُشرف", access: "supervisor" },
  { path: "/supervisor/analytics", title: "التحليلات", category: "المُشرف", access: "supervisor" },
  { path: "/supervisor/wallet-recharge", title: "شحن المحفظة", category: "المُشرف", access: "supervisor" },
  { path: "/supervisor/payments", title: "المدفوعات", category: "المُشرف", access: "supervisor" },
  { path: "/supervisor/prospecting", title: "التنقيب", category: "المُشرف", access: "supervisor" },

  // ─── HN Stock ───
  { path: "/dashboard", title: "لوحة HN Stock", category: "HN Stock", access: "stock" },
  { path: "/dashboard/login", title: "دخول HN Stock", category: "HN Stock", access: "public" },
  { path: "/dashboard/orders", title: "الطلبات", category: "HN Stock", access: "stock" },
  { path: "/dashboard/products", title: "المنتجات", category: "HN Stock", access: "stock" },
  { path: "/dashboard/warehouses", title: "المستودعات", category: "HN Stock", access: "stock" },
  { path: "/dashboard/shipments", title: "الشحنات", category: "HN Stock", access: "stock" },
  { path: "/dashboard/transactions", title: "المعاملات", category: "HN Stock", access: "stock" },
  { path: "/dashboard/merchants", title: "التجار", category: "HN Stock", access: "stock" },
  { path: "/dashboard/drivers", title: "السائقون", category: "HN Stock", access: "stock" },
  { path: "/dashboard/call-center", title: "مركز الاتصال", category: "HN Stock", access: "stock" },
];

export const SITE_MAP_CATEGORIES = Array.from(new Set(SITE_MAP.map((e) => e.category)));

export const ACCESS_LABELS: Record<AccessLevel, string> = {
  public: "عام",
  auth: "يتطلب تسجيل",
  client: "عميل",
  driver: "سائق",
  delivery: "سائق توصيل",
  store_owner: "صاحب متجر",
  admin: "مسؤول",
  agent: "مركز اتصال",
  supervisor: "مُشرف",
  stock: "HN Stock",
};

export const ACCESS_COLORS: Record<AccessLevel, string> = {
  public: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  auth: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  client: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  driver: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  delivery: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  store_owner: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  admin: "bg-red-500/15 text-red-400 border-red-500/30",
  agent: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  supervisor: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  stock: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30",
};
