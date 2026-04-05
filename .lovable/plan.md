

# خطة التوسع العالمي الشامل — التنفيذ الكامل

## ملخص
تفعيل كل البنية التحتية اللازمة لجعل المنصة عالمية: Stripe للدفع الدولي، Facebook Pixel + Google Ads للتتبع، SEO دولي كامل (hreflang, Schema.org, sitemap)، وإضافة Stripe كخيار دفع فعلي في واجهة المستخدم.

---

## المرحلة 1: تفعيل Stripe (الدفع الدولي)

1. **تفعيل Stripe Connector** عبر أداة `stripe--enable_stripe` (سيطلب من المستخدم إدخال Secret Key)
2. **إنشاء Edge Function** `stripe-checkout` للتعامل مع عمليات الدفع
3. **إضافة Stripe كخيار دفع** في `PaymentMethodPicker.tsx` و `PaymentMethodSelector.tsx`
4. **إنشاء Edge Function** `stripe-webhook` لاستقبال أحداث الدفع وتحديث حالة المعاملات

---

## المرحلة 2: Facebook Pixel + Google Ads

1. **إضافة حقول** `facebookPixelId` و `googleAdsId` في `BrandingSettings.tsx`
2. **إدراج سكريبتات التتبع** في `index.html`:
   - Facebook Pixel (`fbq`)
   - Google Ads (`gtag.js`)
3. **إضافة تتبع أحداث التحويل** (تسجيل، طلب، دفع) في الصفحات المعنية
4. **إضافة `<noscript>` fallback** في `<body>` لـ Facebook Pixel

---

## المرحلة 3: SEO العالمي

1. **إضافة وسوم hreflang** في `index.html` للغات الأربع (ar, fr, en, es)
2. **إضافة Schema.org JSON-LD** (Organization + WebApplication)
3. **إنشاء `public/sitemap.xml`** ديناميكي يشمل كل الصفحات الرئيسية
4. **تحديث `robots.txt`** بإضافة رابط Sitemap
5. **تحسين meta tags** الحالية (Open Graph كامل)

---

## المرحلة 4: إعدادات الإدارة

1. **تحديث BrandingSettings** بحقول: Facebook Pixel ID, Google Ads ID, Google Analytics ID
2. **إنشاء مكون `TrackingSettings`** منفصل أو دمجه في BrandingSettings
3. **تحميل معرّفات التتبع ديناميكياً** من `app_settings` عند تحميل التطبيق

---

## الملفات المتأثرة

| الميزة | الملفات |
|--------|---------|
| Stripe | Edge Functions جديدة، `PaymentMethodPicker.tsx`، `PaymentMethodSelector.tsx` |
| Facebook Pixel | `index.html`، `BrandingSettings.tsx`، مكون تتبع جديد |
| Google Ads | `index.html`، `BrandingSettings.tsx` |
| SEO | `index.html`، `public/robots.txt`، `public/sitemap.xml` جديد |
| Schema.org | `index.html` |

---

## متطلبات من المستخدم

- **Stripe Secret Key**: سيُطلب عبر الأداة المدمجة
- **Facebook Pixel ID**: يمكن إدخاله لاحقاً من لوحة الإعدادات
- **Google Ads ID**: يمكن إدخاله لاحقاً من لوحة الإعدادات

سأبدأ بتفعيل Stripe أولاً ثم أتابع بالتسلسل.

