# خريطة المسارات (Routes Map)

آخر تحديث: تلقائي — تنفيذ الحزمة الشاملة 1→7.

## المسارات العامة (Public)

| المسار | الملف | الوصف |
|---|---|---|
| `/` | `pages/LandingPage.tsx` | الصفحة الرئيسية |
| `/auth` | `pages/AuthPage.tsx` | تسجيل الدخول/التسجيل |
| `/auth/client` | `pages/AuthPage.tsx` | دخول العميل |
| `/auth/driver` | `pages/AuthPage.tsx` | دخول السائق |
| `/register` → `/register/customer` | Redirect | |
| `/register/:type` | `pages/Register.tsx` | تسجيل حسب النوع |
| `/join/driver`, `/drivers/join`, `/join-driver` | `pages/JoinDriver.tsx` | انضمام سائق |
| `/join/restaurant` | `pages/JoinRestaurant.tsx` | انضمام مطعم |
| `/terms` | `pages/TermsAndConditions.tsx` | الشروط والأحكام |
| `/privacy` | `pages/PrivacyPolicy.tsx` | سياسة الخصوصية |
| `/403` | `pages/ForbiddenPage.tsx` | ممنوع الوصول |
| `/500` | `pages/ServerErrorPage.tsx` | خطأ داخلي |
| `*` | `pages/NotFound.tsx` | 404 |

## مسارات العميل (client)

| المسار | الحماية | الوصف |
|---|---|---|
| `/customer`, `/customer/hub` | `client` | لوحة العميل |
| `/community-chat` | `authenticated` | دردشة المجتمع |
| `/ai-assistant` | `authenticated` | مساعد AI |

## مسارات السائق (driver)

| المسار | الحماية | الوصف |
|---|---|---|
| `/driver` | `passenger_driver` أو `delivery_driver` أو `both` | لوحة السائق |
| `/driver/earnings` | driver | الأرباح |

## مسارات الأدمن (admin)

| المسار | الحماية | الوصف |
|---|---|---|
| `/admin/*` | `admin` أو `moderator` | لوحة الإدارة |
| `/admin/permissions` | `admin` | إدارة الصلاحيات (جديد) |
| `/admin/security` | `admin` | إعدادات الأمان + MFA (جديد) |
| `/admin/observability` | `admin` | المراقبة والتنبيهات (جديد) |

## مسارات المشرف (supervisor) وكول سنتر (call_center)

| المسار | الحماية |
|---|---|
| `/supervisor/login`, `/supervisor` | supervisor |
| `/call-center/login`, `/call-center` | call_center |

## Guards المستخدمة

- `RequireRole` — يتحقق من الدور في `user_roles` عبر `has_role()`.
- `RequireAuth` — يتحقق من وجود جلسة نشطة فقط.
- توجيه تلقائي لصفحة الدخول المناسبة عند رفض الوصول.
