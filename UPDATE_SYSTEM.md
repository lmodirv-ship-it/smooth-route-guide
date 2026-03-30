# 🔄 نظام التحديث الذكي — HN Driver v30.03.2026

## نظرة عامة

نظام تحديث متكامل يجمع 3 طرق للتحديث:

1. **سكريبت التحديث الذكي** — يكتشف التغييرات ويبني فقط ما تغيّر
2. **OTA (Over-The-Air)** — التطبيقات تتحقق تلقائياً من التحديثات
3. **نشر الباتش** — إرسال التغييرات فقط للسيرفر

---

## 1️⃣ التحديث الذكي (Smart Update)

### الاستخدام الأساسي
```bash
# كشف التغييرات وبناء ما يلزم فقط
bash scripts/smart-update.sh

# معاينة بدون بناء
bash scripts/smart-update.sh --dry-run

# بناء موديول محدد فقط
bash scripts/smart-update.sh --module=admin

# بناء كامل
bash scripts/smart-update.sh --full
```

### تحديث المنصات الأصلية
```bash
# تحديث Android فقط
bash scripts/smart-update.sh --android

# تحديث الكل (Android + iOS + Windows)
bash scripts/smart-update.sh --all-native

# تحديث موديول محدد + Windows
bash scripts/smart-update.sh --module=admin --windows
```

### كيف يعمل؟
1. يقارن hash آخر بناء مع الحالي
2. يحدد الموديولات المتأثرة بالتغيير
3. يبني فقط الموديولات المتغيّرة
4. يُنشئ ملف باتش ZIP يحتوي التغييرات فقط
5. يُحدّث المنصات الأصلية إن طُلب

---

## 2️⃣ OTA — التحديث التلقائي داخل التطبيق

### كيف يعمل؟
- كل تطبيق يتحقق دورياً من وجود تحديث
- إذا وُجد تحديث، يُبلغ المستخدم
- يتم تحميل الملفات المتغيرة فقط

### توليد ملفات OTA
```bash
bash scripts/generate-ota-manifest.sh
```

### استخدام في الكود
```tsx
import { useOTAUpdate } from '@/hooks/useOTAUpdate';

function App() {
  const { updateAvailable, applyUpdate } = useOTAUpdate();
  
  if (updateAvailable) {
    return <button onClick={applyUpdate}>تحديث متوفر — اضغط للتحديث</button>;
  }
}
```

---

## 3️⃣ نشر الباتش للسيرفر

```bash
# بعد smart-update.sh، انشر الباتش
bash scripts/deploy-patch.sh patches/hn-patch-XXXXX.zip your-server.com deploy

# أو تلقائياً (يأخذ آخر باتش)
bash scripts/deploy-patch.sh
```

---

## سير العمل الكامل

```
Lovable (تطوير)
    ↓
GitHub (مزامنة تلقائية)
    ↓
bash scripts/smart-update.sh --all-native
    ↓ يكتشف التغييرات
    ↓ يبني فقط ما تغيّر
    ↓ ينشئ ملف باتش
    ↓
bash scripts/deploy-patch.sh
    ↓ يرسل التغييرات فقط للسيرفر
    ↓
التطبيقات تكتشف التحديث (OTA)
    ↓
المستخدم يحصل على التحديث ✅
```

---

## الملفات

| الملف | الوظيفة |
|-------|---------|
| `scripts/smart-update.sh` | البناء الذكي + كشف التغييرات |
| `scripts/generate-ota-manifest.sh` | توليد manifests لـ OTA |
| `scripts/deploy-patch.sh` | نشر الباتش للسيرفر |
| `src/hooks/useOTAUpdate.ts` | React hook للتحقق من التحديثات |
| `scripts/ota-update-server.ts` | إعدادات OTA لكل موديول |
