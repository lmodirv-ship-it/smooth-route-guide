## ملف `.env` — القيم الحقيقية

ضع هذا الملف في **جذر المشروع** (`E:\Desktop\hndriver\hn 300726\.env`) باسم `.env` بالضبط (بدون `.txt`):

```
VITE_SUPABASE_URL=https://typamugwwatqmdkxkfof.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5cGFtdWd3d2F0cW1ka3hrZm9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MTIxNjAsImV4cCI6MjA4OTI4ODE2MH0.vk2rFo3p6FDv0-4yoIBhhQ6jr_aXHjDYBmmI6hoZXtE
VITE_SUPABASE_PROJECT_ID=typamugwwatqmdkxkfof
```

## ملاحظات مهمة

- هذه القيم **عمومية** ومصمَّمة للظهور في حزمة المتصفح؛ الحماية تتم عبر RLS. لا تضع أي مفتاح سرّي هنا.
- النسخة المرفقة في `hndriver-300726.zip` تحوي هذا الملف أصلاً — إن كان موجوداً فلا حاجة لإنشائه.
- بعد إنشاء/تعديل `.env` يجب **إعادة تشغيل** خادم التطوير أو إعادة البناء، لأن Vite يستبدل هذه القيم وقت البناء فقط.
- إذا بُني الموقع بدون هذا الملف تظهر **شاشة سوداء** لأن العميل يُنشأ بقيم `undefined` — وهذا نفس سبب المشكلة التي واجهتها سابقاً على الاستضافة.

## الخطوات بعد ذلك

1. `corepack enable` ثم `corepack prepare pnpm@latest --activate` (أو `npm install -g pnpm`) لحل مشكلة `pnpm not recognized`.
2. `pnpm install`
3. `pnpm dev` للتأكد محلياً، ثم `pnpm build` للنسخة النهائية.

## ماذا سأفعل عند التنفيذ

لا يوجد تعديل مطلوب على الكود — الملف `.env` في المشروع مضبوط بالفعل بهذه القيم. إن أردت، أستطيع تجهيز أرشيف مصغّر يحوي `.env` جاهزاً لنسخه فوق مجلدك المحلي.
