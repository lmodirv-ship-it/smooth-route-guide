

# خطة تنفيذ 4 تحسينات: كوكيز + تحويلات + SEO + Google Ads

---

## 1. بانر موافقة الكوكيز (Cookie Consent + Google Consent Mode v2)

**ماذا:** شريط سفلي بالعربية يطلب موافقة الزائر على الكوكيز، مع ربطه بـ Google Consent Mode v2.

**كيف:**
- إنشاء مكون `CookieConsentBanner` يظهر أسفل الشاشة عند أول زيارة
- يحفظ الموافقة في `localStorage`
- يُضاف `gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied' })` قبل تحميل gtag
- عند قبول الزائر: `gtag('consent', 'update', { analytics_storage: 'granted', ad_storage: 'granted' })`
- زرّان: "قبول الكل" و "رفض غير الضروري"
- يُضاف في `App.tsx` وجميع التطبيقات الفرعية
- تعديل `index.html` + باقي HTML لإضافة consent default قبل gtag config

**ملفات:** `src/components/CookieConsentBanner.tsx` (جديد)، `index.html`، `App.tsx`، + 6 HTML أخرى

---

## 2. تتبع أحداث التحويل (Conversion Events)

**ماذا:** تتبع التسجيل، تسجيل الدخول، الطلبات عبر Google Analytics + Facebook Pixel.

**كيف:**
- استخدام دالة `trackEvent` الموجودة في `TrackingScripts.tsx`
- إضافة استدعاءات في:
  - `AuthPage.tsx`: عند نجاح التسجيل → `trackEvent('sign_up', { method: 'email', role })`
  - `AuthPage.tsx`: عند نجاح الدخول → `trackEvent('login', { method: 'email' })`
  - `AuthPage.tsx`: عند Google OAuth → `trackEvent('sign_up', { method: 'google' })`
  - صفحات الطلبات (Cart, ClientBooking) → `trackEvent('purchase', { value, currency: 'MAD' })`

**ملفات:** `src/pages/AuthPage.tsx`، `src/pages/delivery/Cart.tsx`، `src/pages/client/ClientBooking.tsx`

---

## 3. تحسين SEO

**ماذا:** إضافة صفحات مفقودة في sitemap، تحسين meta tags ديناميكية.

**كيف:**
- توسيع `sitemap.xml` بإضافة: `/privacy`, `/forgot-password`, `/delivery/restaurants`, `/delivery/category/*`
- إضافة مكون `PageMeta` (باستخدام `document.title` و meta description) في الصفحات الرئيسية
- إضافة Schema.org للخدمات (Ride, Delivery) كـ JSON-LD

**ملفات:** `public/sitemap.xml`، `src/components/PageMeta.tsx` (جديد)، صفحات رئيسية

---

## 4. ربط Google Ads

**ماذا:** تفعيل Google Ads conversion tracking عبر البنية الموجودة.

**كيف:**
- إعدادات Google Ads ID موجودة فعلاً في `TrackingScripts` (تُقرأ من `app_settings.branding_settings.googleAdsId`)
- يكفي إدخال معرّف Google Ads من لوحة الإدارة: **Settings → Branding → Google Ads ID**
- إضافة تتبع تحويلات الإعلانات: `gtag('event', 'conversion', { send_to: 'AW-XXXXX/XXXXX' })` عند التسجيل
- إضافة حقل `googleAdsConversionLabel` في إعدادات Branding

**ملفات:** `src/admin/components/settings/BrandingSettings.tsx`، `src/components/TrackingScripts.tsx`

---

## ترتيب التنفيذ

1. Cookie Consent Banner + Consent Mode (أولوية قصوى - قانوني)
2. Conversion Events tracking
3. Google Ads conversion label
4. SEO improvements

