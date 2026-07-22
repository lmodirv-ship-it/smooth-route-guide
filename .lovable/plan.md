# تنفيذ المراحل 1 → 7 بالترتيب

سأنفّذ الحزم الأربع المركّزة (أ، ب، ج، د) التي تغطي المراحل السبع من خطتك الأصلية، بالترتيب، دون توقف بين المراحل. المرحلة 8 (الإطلاق) تأتي تلقائياً عند نشرك على `www.hn-driver.com`.

---

## المرحلة 1 — التوثيق والتحليل

- توليد **مخطط ERD** (Mermaid) لأهم 40 جدول → `/docs/erd.mmd`.
- توليد **خريطة المسارات** الكاملة مع الأدوار المسموحة → `/docs/routes-map.md`.
- توليد **فهرس Edge Functions** (اسم/غرض/مدخلات) → `/docs/edge-functions.md`.
- تسجيل مسارات 404 في `analytics_events` (event_type = `route_404`).

## المرحلة 2 — الأمن (RBAC + Hardening)

- تفعيل **HIBP** (فحص كلمات المرور المسرّبة) عبر `configure_auth`.
- ربط جداول `permission_roles` / `role_permissions` / `user_permission_roles` الجاهزة بواجهة أدمن → `/admin/permissions`.
- **تفعيل MFA/TOTP** للأدمن والوكلاء (Supabase native) + شاشة إعداد في `/admin/security`.
- إضافة **audit trigger موحّد** على الجداول المالية والحسّاسة (payments, wallet, user_roles, coupons) → `db_audit_log`.
- **إسقاط بند HttpOnly Cookies** (غير متوافق مع SPA + Supabase JS SDK).

## المرحلة 3 — تحسين UX

- إضافة **`nprogress`** أثناء التنقل بين الصفحات.
- إنشاء صفحتَي **403** و **500** (بالإضافة لـ 404 الموجودة) بروابط مفيدة.
- توحيد **`redirectTo`** بعد تسجيل الدخول لكل الأدوار (حفظ المسار المقصود في sessionStorage).
- **شريط إشعارات مركزي** (يستخدم `sonner` الموجود) لحالات نجاح/فشل موحّدة.

## المرحلة 4 — الاختبارات

- **Vitest**: اختبارات لـ `RequireRole`, `useAuthReady`, `dbRoleSatisfies`, `bestDashboard`.
- **Playwright E2E**: 5 سيناريوهات حرجة (تسجيل عميل، طلب رحلة، قبول سائق، دخول أدمن، دخول كول سنتر).
- تشغيل الاختبارات محلياً + تقرير تغطية `vitest --coverage`.

## المرحلة 5 — الجداول والنسخ الاحتياطي

- إضافة **تصدير CSV/Excel** من لوحة الأدمن لأهم 8 جداول تشغيلية (delivery_orders, trips, drivers, profiles, payments, ...).
- **audit موحّد** (يُنفَّذ في المرحلة 2).
- التأكد من أن **PITR** مفعّل على Lovable Cloud (تحقّق عبر `cloud_status`).
- إضافة **فهارس إضافية** بعد تشخيص `slow_queries` إن وُجدت.

## المرحلة 6 — المراقبة

- دمج **Sentry** (frontend + edge functions) عبر إضافة DSN كـ secret.
- صفحة **`/admin/observability`** تجمع: `analytics_events`, `system_health_logs`, `alerts`, `route_404` log, `growth_funnel_stats()`.
- **تنبيهات real-time** على `alerts` عبر Supabase Realtime → toast للأدمن الحاضر.

## المرحلة 7 — التوثيق النهائي

- **`/docs/DEVELOPER_GUIDE.md`** — كيفية إضافة مسار/دور/جدول جديد.
- **`/docs/ADMIN_GUIDE.md`** — دليل الأدمن وكول سنتر (بالعربية).
- **OpenAPI/Swagger** لـ Edge Functions العامة → `/docs/openapi.yaml`.
- تحديث `README.md` بالبنية النهائية.
- (الفيديو التدريبي خارج نطاق الكود).

---

## آلية التنفيذ

- سأعمل بشكل متسلسل دون التوقف للسؤال بعد كل مرحلة (كما هو مسجّل في تفضيلاتك).
- بعد كل مرحلة: رسالة قصيرة تلخّص الملفات/الجداول/الصفحات المُنشأة، ثم المتابعة.
- **الالتزام بالقيود الموجودة في الذاكرة:**
  - لا تغيير للـ UI البصري إلا بطلب صريح (المرحلة 3 هي إضافات لا استبدال).
  - i18n: كل نص جديد يمرّ عبر `platform_translations` (ar/fr/en/es).
  - Migrations إضافية فقط (لا حذف بيانات).
  - `REPLICA IDENTITY FULL` محفوظ على `delivery_orders` و `drivers`.
  - دور واحد لكل مستخدم (عدا الأدمن).
  - لا إعادة إضافة Face ID login أو Role Switcher.

## المخرجات النهائية

- **~15 ملف توثيق جديد** في `/docs`.
- **صفحتان جديدتان للأدمن**: `/admin/permissions`, `/admin/observability`, `/admin/security` (MFA).
- **3 صفحات خطأ محسّنة** (403/404/500).
- **~10 اختبارات Vitest + 5 Playwright E2E**.
- **1 migration** لـ audit trigger موحّد + سياسات `permission_roles`.
- **Sentry مفعّل** frontend + edge.
- **HIBP + MFA** مفعّلان.

هل أبدأ التنفيذ؟
