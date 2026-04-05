

# خطة التوسع العالمي — الدفع + التسويق + SEO

## الوضع الحالي

- **الدفع**: نقد، محفظة، PayPal (مفعّل)، Stripe (موجود في الإعدادات لكن غير مفعّل فعلياً)، تحويل بنكي، تحويل وكالة
- **SEO**: بيانات meta أساسية موجودة في `index.html`، canonical URL يشير لـ `hn-driver.com`
- **التسويق**: لا يوجد Facebook Pixel أو Google Ads tag
- **Crypto**: غير موجود

---

## المرحلة 1: تفعيل Stripe (الدفع بالبطاقات + Apple/Google Pay)

- تفعيل Stripe عبر أداة Lovable المدمجة (تتطلب Secret Key)
- إنشاء Edge Function للدفع عبر Stripe Checkout
- إضافة "💳 بطاقة بنكية" كخيار دفع في `PaymentMethodSelector`
- ربط المعاملات بجدول `payment_transactions`

## المرحلة 2: تعزيز PayPal

- PayPal مفعّل بالفعل — التحقق من أن المفاتيح Live تعمل
- لا تغييرات كبيرة مطلوبة

## المرحلة 3: الدفع بالعملات الرقمية (Crypto)

- إضافة خيار "₿ Crypto" في واجهة الدفع
- إنشاء Edge Function تولّد عنوان محفظة للدفع (USDT/BTC/ETH)
- يتطلب اختيار مزود خدمة (Coinbase Commerce أو NOWPayments أو مماثل) + مفتاح API

## المرحلة 4: Facebook Pixel + Google Ads

- إضافة Facebook Pixel script في `index.html` (داخل `<body>`)
- إضافة Google Ads / gtag.js في `index.html`
- إضافة حقول في `BrandingSettings` لإدخال معرّفات Pixel و Google Ads من لوحة التحكم
- تتبع الأحداث: تسجيل، طلب رحلة، إتمام طلب

## المرحلة 5: SEO العالمي

- إضافة `hreflang` tags متعددة اللغات (ar, fr, en, es) في `index.html`
- تحسين `meta description` و `og:tags` لتشمل كلمات مفتاحية دولية
- إضافة Schema.org JSON-LD (Organization + LocalBusiness)
- إنشاء `/sitemap.xml` ديناميكي
- تحسين `robots.txt`

## المرحلة 6: إعدادات DNS و الدومين

- التأكد من أن الدومين الرئيسي `hn-driver.com` مضبوط بشكل صحيح
- إعداد subdomain records للأسواق الجديدة (اختياري)
- هذا يتم من إعدادات المشروع → Domains

---

## التفاصيل التقنية

| العنصر | الملفات المتأثرة |
|--------|------------------|
| Stripe | Edge Function جديدة، `PaymentMethodSelector.tsx`، `PaymentSettings.tsx` |
| Crypto | Edge Function جديدة، `PaymentMethodSelector.tsx`، `PaymentSettings.tsx` |
| Facebook Pixel | `index.html`، `BrandingSettings.tsx` |
| Google Ads | `index.html`، `BrandingSettings.tsx` |
| SEO | `index.html`، `public/robots.txt`، ملف sitemap جديد |
| Schema.org | `index.html` |

---

## أسئلة قبل البدء

قبل التنفيذ، أحتاج معرفة:
1. **Stripe**: هل لديك حساب Stripe جاهز مع Secret Key؟
2. **Crypto**: أي مزود تفضل؟ (Coinbase Commerce / NOWPayments / آخر)
3. **Facebook Pixel ID**: هل لديك معرّف Pixel جاهز؟
4. **Google Ads ID**: هل لديك معرّف Google Ads (AW-XXXXXXX)؟

سأبدأ بتفعيل Stripe أولاً ثم أتقدم بالترتيب.

