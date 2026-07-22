
# صفحة "رحلاتي" في لوحة السائق

ربط الـ Hooks الجديدة (`useRoutes` + `useReservations`) بواجهة السائق حتى يستطيع:
- إضافة/تعديل/تعطيل خطوط سيره المنتظمة (طنجة ← تطوان مثلاً)
- متابعة الحجوزات الواردة على كل رحلة والتحكم فيها (تأكيد / إلغاء)
- كل هذا مع تحديث لحظي (Realtime) وبدون الإخلال بأي واجهة قائمة

## ما سيراه السائق

صفحة جديدة عنوانها **"رحلاتي المنتظمة"** في قائمة لوحة السائق (بجانب: التتبع، المحفظة، الأرباح…):

- **قسم علوي**: بطاقات مختصرة (عدد الرحلات النشطة، مقاعد متاحة اليوم، حجوزات قيد الانتظار).
- **قائمة الرحلات**: كل رحلة تُعرض في بطاقة تحمل:
  - كود الرحلة (RT######)، نقطة الانطلاق ← الوصول، الوقت، الأيام
  - المقاعد (متاحة / كلي)، السعر لكل مقعد
  - أزرار: تعديل، تفعيل/تعطيل، حذف، "عرض الحجوزات"
- **زر "+ إضافة رحلة جديدة"** يفتح نافذة (Dialog) لإدخال بيانات الرحلة.
- **نافذة الحجوزات**: عند الضغط على رحلة، تظهر قائمة حجوزاتها مع اسم العميل، عدد المقاعد، حالة الدفع، وأزرار (تأكيد / إلغاء / تواصل).

كل شيء يتحدث تلقائياً عند وصول حجز جديد أو تعديل من الأدمن.

## بنية التنفيذ

```text
src/pages/driver/
├── DriverMyRoutes.tsx        (جديد — الصفحة الرئيسية)
└── components/
    ├── RouteCard.tsx         (جديد — بطاقة رحلة)
    ├── RouteFormDialog.tsx   (جديد — إضافة/تعديل)
    └── RouteBookingsDialog.tsx (جديد — قائمة الحجوزات)
```

**التوجيه** (`src/driver-ride/DriverRideApp.tsx`): إضافة سطر واحد:
```tsx
<Route path="/driver/my-routes" element={<RequireRole allowed={["driver"]}><RideDriverLayout /><DriverMyRoutes /></RequireRole>} />
```

**قائمة السائد** (`RideDriverLayout` أو مكوّن `DriverBottomNav`/`DriverSidebar`): إضافة عنصر "رحلاتي المنتظمة" مع أيقونة `Route` من lucide.

## التفاصيل التقنية

- `DriverMyRoutes.tsx` يستدعي `useRoutes({ onlyMine: true, activeOnly: false })` — يعرض حتى المعطّلة ليستطيع السائق إعادة تفعيلها.
- `RouteBookingsDialog` يستدعي `useReservations("driver-routes")` ثم يفلتر محلياً بـ `route_id` المفتوح.
- تأكيد/إلغاء الحجز يستعمل `supabase.from("reservations").update({ status })` — RLS في الجداول تسمح للسائق بذلك على حجوزات رحلاته.
- إضافة رحلة: `supabase.from("routes").insert({ driver_id, origin_address, destination_address, departure_time, days_of_week, seats_total, price_per_seat, city })` — الـ trigger يولّد `route_code` تلقائياً.
- كل النصوص عبر `useI18n` (بدون نصوص hard-coded) — سنضيف مفاتيح ترجمة في `src/i18n/locales/*.ts` تحت namespace `driver.myRoutes`.
- الستايل يعتمد على design tokens الموجودة (`bg-card`, `text-foreground`, `border-border`) — لا ألوان جامدة.

## نطاق ما لن يتغير

- لا نمس أي صفحة أخرى للسائق.
- لا تغييرات في قاعدة البيانات (الجداول والـ trigger موجودة).
- لا تعديل على `useRoutes` / `useReservations` — الاستعمال فقط.

## معايير القبول

1. صفحة `/driver/my-routes` تفتح للسائق فقط.
2. إضافة رحلة جديدة تظهر فوراً في القائمة (Realtime) بدون إعادة تحميل.
3. حجز جديد من عميل يظهر تلقائياً في نافذة الحجوزات المفتوحة.
4. تأكيد/إلغاء الحجز يُحدّث `seats_available` في بطاقة الرحلة عبر الـ trigger.
5. الواجهة تعمل بالعربية/الفرنسية/الإنجليزية (RTL/LTR سليم).
