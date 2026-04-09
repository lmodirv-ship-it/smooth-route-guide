

## إصلاح عدم ظهور أيقونة الدردشة (أمين)

### المشكلة
الشات بوت `<HNChatbot />` موجود داخل `MainLayout`، لكن الصفحة الرئيسية (`/`) معرّفة **خارج** `MainLayout` في ملف `MainRoutes.tsx`. لذلك الزر لا يظهر في الصفحة الرئيسية ولا في صفحات أخرى عامة مثل `/welcome` و `/login`.

### الحل
نقل `<HNChatbot />` من `MainLayout.tsx` إلى `App.tsx` (داخل `AppInner`) ليظهر في **جميع الصفحات** بدون استثناء.

### التغييرات

#### 1. `src/App.tsx`
- إضافة `import HNChatbot from "@/components/HNChatbot"`
- إضافة `<HNChatbot />` داخل `AppInner` بعد `<Routes>` ليظهر في كل الصفحات

#### 2. `src/app/MainLayout.tsx`
- إزالة import `HNChatbot`
- إزالة `<HNChatbot />` من JSX (لتجنب التكرار)

### النتيجة
أيقونة الدردشة الخضراء ستظهر في أسفل يمين **كل صفحة** بما فيها الصفحة الرئيسية.

