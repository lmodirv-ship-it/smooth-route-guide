# خطة التنفيذ — HN Driver: Auth، الأدوار، والجداول الأساسية

## الوضع الحالي (تم التحقق منه)

- **Supabase Auth**: مُفعّل عبر Lovable Cloud. تسجيل الدخول يعمل بالبريد/كلمة المرور + Google، مع حماية HIBP للكلمات المسربة.
- **الأدوار (`app_role` enum)**: `admin`, `moderator`, `user`, `driver`, `agent`, `delivery`, `store_owner`, `smart_admin_assistant` — كلها موجودة.
- **جدول `user_roles`** + دالة `has_role(uuid, app_role)` SECURITY DEFINER تعمل بشكل صحيح، وتُستخدم فعلياً في 409 سياسة RLS.
- **الجداول الأساسية موجودة**: `profiles`, `drivers`, `stores`, `trips`, `delivery_orders`, `ride_requests`, `user_roles`.
- **العميل مدمج**: `src/integrations/supabase/client.ts` (تلقائي)، مع `AuthContext` و onAuthStateChange وتوجيه حسب الدور.

## ما سيتم تنفيذه

### 1. فحص Auth والأدوار وربطها بـ RLS (تحقق فقط، بدون تعديل)
- التأكد من أن `has_role()` مستخدَمة في كل سياسات RLS الحساسة (drivers, stores, delivery_orders, ride_requests, payments).
- التحقق من أن `handle_new_user()` تُنشئ profile + role + wallet لكل مستخدم جديد.
- إصدار تقرير مختصر: الدور → الجداول المسموح بها → نوع الوصول (SELECT/INSERT/UPDATE/DELETE).

### 2. إضافة جدولين ناقصَين: `routes` و `reservations`

**`routes`** — مسارات ثابتة/متكررة للسائقين (رحلات جماعية، خطوط توصيل):
- `driver_id` → `drivers(id)`
- `origin_address`, `origin_lat`, `origin_lng`
- `destination_address`, `destination_lat`, `destination_lng`
- `departure_time` (time)، `days_of_week` (text[])، `seats_total`, `seats_available`
- `price_per_seat`, `currency`, `is_active`, `zone_id`

**`reservations`** — حجوزات الزبناء على تلك المسارات:
- `route_id` → `routes(id)`
- `user_id` → `auth.users(id)`
- `seats_reserved`, `pickup_address`, `pickup_lat`, `pickup_lng`
- `status` (pending/confirmed/cancelled/completed)
- `total_price`, `payment_status`, `reservation_code`

**الفهارس**: `routes(driver_id)`, `routes(is_active, departure_time)`, `reservations(user_id, status)`, `reservations(route_id, status)`.

**RLS المطبّقة**:
- `routes`: يقرأها الجميع (`anon`+`authenticated`) عندما `is_active=true`؛ السائق يعدّل مساراته فقط؛ admin/agent كامل الصلاحية.
- `reservations`: العميل يرى/يُنشئ حجوزاته فقط؛ السائق يرى حجوزات مساراته؛ admin/agent كامل الصلاحية.
- GRANT صريح لكل جدول (authenticated + service_role، مع anon على `routes` فقط للقراءة).

**Triggers**:
- `auto_generate_reservation_code` (بادئة `B` + 6 أرقام).
- `updated_at` عبر `set_updated_at()`.
- تحقق من `seats_available >= 0` قبل الإدراج.

### 3. تكامل الواجهة (React)
- إضافة `src/hooks/useRoutes.ts` و `useReservations.ts` لجلب البيانات مع Realtime.
- ربطها بلوحة السائق (عرض المسارات + الحجوزات الواردة) ولوحة العميل (تصفح المسارات + حجز مقعد).
- استخدام `AuthContext` الحالي و `supabase.auth.getUser()` للتحقق قبل الحجز.

## التفاصيل التقنية

```text
auth.users ──┬── profiles (1:1)
             ├── user_roles (1:N)  ── has_role() ── RLS
             ├── drivers (1:1 for driver role)
             │      └── routes (1:N)  ← جديد
             │              └── reservations (1:N)  ← جديد
             └── stores (1:N for store_owner)
```

- المهاجرة الجديدة إضافية فقط (لا حذف/تعديل جداول موجودة) — تطابق سياسة "additive-only".
- لا حاجة لأي secret جديد.
- كل النصوص العربية عبر `platform_translations` (لا نصوص مكتوبة داخل الكود).

## ما لن يُنفَّذ (خارج النطاق)

- تعديل بنية `profiles`/`drivers`/`stores` الحالية.
- تغيير مزوّدي OAuth إضافيين (Apple/Facebook) — لم يُطلبوا.
- بناء واجهات UI جديدة كاملة — سيتم فقط ربط hooks بالصفحات الموجودة.
