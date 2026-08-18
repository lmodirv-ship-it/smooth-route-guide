# دخول الإدارة: بريد + كلمة مرور، ورمز 6 أرقام عند نسيان كلمة المرور

## واجهة `/admin/login`
- حقل البريد + حقل كلمة المرور + زر «تسجيل الدخول».
- رابط/زر «نسيت كلمة المرور؟ إرسال الرمز إلى البريد».
- عند الضغط: يولّد النظام رمزاً من 6 أرقام ويرسله للبريد، ويتحوّل حقل كلمة المرور إلى حقل «رمز الدخول» (6 خانات رقمية، LTR).
- عند تطابق الرمز: يتم الدخول والتوجيه حسب الدور.
- عند عدم التطابق: يُرسَل رمز جديد تلقائياً إلى نفس البريد المكتوب في خانة البريد، ويبقى الحقل بانتظار الرمز الجديد.
- إزالة قائمة البُرد الثابتة `ALLOWED_ADMIN_EMAILS` من الكود.

## التوجيه حسب الدور (بدون أي رسائل)
بعد نجاح الدخول تُقرأ أدوار المستخدم ويُوجَّه مباشرة:
- `admin` → `/admin`
- `agent` / `smart_admin_assistant` → `/call-center`
- `moderator` → `/supervisor`
- `user` (عميل) → `/customer`
- `driver` → `/driver`
- `delivery` → `/driver/delivery`
- `store_owner` → `/delivery/my-store`
- بدون حساب / زائر → صفحة فتح حساب `/auth`

يعتمد التوجيه على خريطة الأدوار الموجودة في `src/lib/routes.ts` (`dashboardForRole`) دون تكرار المنطق.

## قاعدة البيانات
جدول جديد `public.login_codes`:
- `id uuid`, `email text`, `code text` (مخزَّن كهاش)، `verification boolean` (تم التحقق)، `date timestamptz` (الإنشاء)، `validation timestamptz` (تاريخ انتهاء الصلاحية)، `attempts int`.
- فهرس على `email` و`validation`.
- تفعيل RLS بدون سياسات للعملاء + `GRANT ALL` لـ `service_role` فقط (الوصول من الخادم حصراً).

## الجزء التقني
- Edge Function `send-login-code`: يولّد 6 أرقام، يخزّن الهاش مع صلاحية 10 دقائق، ويرسل الرمز عبر نظام البريد الحالي. حد معدّل عبر `enforce_rate_limit`. لا يكشف وجود البريد من عدمه.
- Edge Function `verify-login-code`: يتحقق من الهاش والصلاحية، يعلّم `verification=true`، ثم ينشئ جلسة عبر `generateLink` + `verifyOtp` (يعمل داخل تطبيق الحاسوب دون فتح المتصفح). عند الفشل يستدعي إعادة إرسال رمز جديد.
- المسار العادي يستخدم `signInWithPassword`.

## صفحة الإعدادات (لوحة المدير)
- إضافة قسم جديد «رمز الدخول» داخل `src/admin/pages/Settings.tsx` (تبويب الأمان أو تبويب مستقل) يحفظ في `app_settings` تحت مفتاح `login_code`:
  - تفعيل/تعطيل الدخول بالرمز.
  - مدة صلاحية الرمز (بالدقائق).
  - الحد الأقصى للمحاولات.
  - عرض آخر الرموز المُرسَلة (البريد + التاريخ + حالة التحقق) للقراءة فقط.

## الملفات المتأثرة
- تعديل: `src/admin/pages/AdminLogin.tsx`، `src/admin/pages/Settings.tsx`
- جديد: `src/admin/components/settings/LoginCodeSettings.tsx`
- جديد: `supabase/functions/send-login-code/index.ts`، `supabase/functions/verify-login-code/index.ts`
- جديد: هجرة قاعدة بيانات لجدول `login_codes`
