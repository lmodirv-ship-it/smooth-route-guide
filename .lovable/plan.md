# خطة: صفحة Site Map في لوحة الإدارة

## الهدف
إنشاء صفحة جديدة `/admin/sitemap` تعرض **كل صفحات الموقع** (العامة + الداخلية + الإدارية + المُشغّل + مركز الاتصال + HN-Stock) في جدول/شبكة منظّمة، مع روابط مباشرة تفتح في تبويب جديد، ومحرك بحث وفلاتر.

## الملفات المطلوبة (إضافة فقط — لا حذف)

### 1. `src/admin/data/siteMapRegistry.ts` (جديد)
سجل مركزي لكل الصفحات، مصنّفة حسب القسم. كل عنصر:
```ts
{ path: string; title: string; titleAr: string; category: string; access: "public" | "auth" | "admin" | "agent" | "supervisor" | "driver" | "stock"; icon?: LucideIcon }
```
أقسام مغطّاة (~145 صفحة):
- **عام/تسويق** (15): `/`, `/welcome`, `/hn-groupe`, `/contact`, `/download`, `/features`, `/partners`, `/questions`, `/invite`, `/inscription`, `/restaurants`, `/privacy`, `/join-driver`, `/join-restaurant`, `/cities`
- **مصادقة** (4): `/auth`, `/forgot-password`, `/reset-password`, `/complete-profile`
- **عميل** (9)
- **سائق** (17)
- **توصيل/متاجر** (15)
- **مدوّنة/صفحات ديناميكية**: `/blog/:id`, `/p/:slug` (مع ملاحظة "ديناميكي")
- **لوحة الإدارة** (~50): قراءة من `AdminRoutes.tsx`
- **مركز الاتصال** (~28)
- **المُشرف** (~12)
- **HN-Stock** (~11)

### 2. `src/admin/pages/SiteMap.tsx` (جديد)
- بحث فوري حسب المسار/العنوان
- فلاتر حسب القسم + مستوى الوصول
- عرض شبكي/جدولي مع نسخ المسار وفتح في تبويب جديد
- عداد إجمالي + لكل قسم
- زر تصدير CSV/JSON
- زر "اختبار جميع الروابط" (HEAD سريع) — اختياري بعد الإصدار الأول

### 3. تسجيل المسار في `src/admin/AdminRoutes.tsx`
إضافة سطر واحد:
```tsx
const AdminSiteMap = lazy(() => import("@/admin/pages/SiteMap"));
// ...
<Route path="sitemap" element={L(AdminSiteMap)} />
```

### 4. ربط في قائمة الإدارة الجانبية
إضافة عنصر "🗺️ خريطة الموقع" في `AdminLayout.tsx` ضمن قسم "النظام".

## ما لن يُمسّ
- لا تعديل على `public/sitemap.xml` (هذه صفحة إدارية داخلية، ليست لمحركات البحث)
- لا تعديل على الصفحات الموجودة أو المسارات
- لا تغييرات قاعدة بيانات

## ملاحظات تقنية
السجل مكتوب يدوياً (Static) لضمان عدم وجود مفاجآت في وقت التشغيل، ومحاذٍ لما هو موجود فعلياً في `MainRoutes.tsx` و `AdminRoutes.tsx` و `HNStockApp.tsx`. قابل للتمديد بسهولة عند إضافة صفحات جديدة.