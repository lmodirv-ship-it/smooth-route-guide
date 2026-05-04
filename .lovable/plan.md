
## الهدف
**نسخة APK واحدة موحّدة** (Universal App) تخدم كل الأدوار (عميل، سائق، توصيل، مركز اتصال، صاحب محل، أدمن) وتشمل كل الميزات الجديدة: Google One-Click + UTM Tracking + 50 درهم هدية.

---

## الخبر السار
المشروع **مُهيّأ بالفعل لنسخة موحّدة**:
- `capacitor.config.ts` → `appId: com.hndriver.app` / `appName: HN Driver`
- `AuthPage` يوجّه كل مستخدم بعد الدخول إلى لوحته (`roleDashboard` map)
- `handle_new_user` trigger في DB يمنح **50 درهم تلقائياً** لكل مسجّل جديد ✅
- زر Google OAuth يعمل عبر Lovable Cloud Managed Auth ✅
- `record_visit` يلتقط UTM ✅

---

## التغييرات المطلوبة

### 1. تحديث رقم الإصدار في `android/app/build.gradle`
```gradle
versionCode 3
versionName "1.2"
```
لكي يظهر للمستخدمين الحاليين تحديث جديد.

### 2. تحديث `capacitor.config.ts` لتفعيل DeepLinks
إضافة intent filters لـ `https://www.hn-driver.com` كي تفتح روابط الموقع داخل التطبيق مباشرة:
```ts
android: {
  backgroundColor: "#111827",
  allowMixedContent: true,
  intentFilters: [{
    action: "VIEW",
    autoVerify: true,
    data: { scheme: "https", host: "www.hn-driver.com" },
    category: ["BROWSABLE", "DEFAULT"],
  }],
}
```

### 3. إنشاء `BUILD_APK.md` — دليل بناء واحد
ملف موجز بالعربية يشرح:
- متطلبات (Android Studio + JDK 17)
- 4 أوامر لبناء APK من نسخة موحدة
- كيفية رفع APK إلى `/public/downloads/hn-driver-v1.2.apk`
- كيفية تحديث `app_settings.latest_apk_version` لتفعيل OTA notification

### 4. إنشاء سكريبت `scripts/build-unified-apk.sh`
سكريبت آلي:
```bash
#!/bin/bash
pnpm install --frozen-lockfile
pnpm build
npx cap sync android
cd android && ./gradlew assembleRelease
echo "✅ APK at: android/app/build/outputs/apk/release/app-release-unsigned.apk"
```

### 5. إضافة لوحة "بنية التطبيق الموحد" في Admin (اختياري — بسيط)
صفحة عرض فقط في `/admin/app-info` تُظهر:
- الإصدار الحالي (versionCode, versionName)
- روابط APK المتاحة من `/downloads`
- زر "نشر تحديث OTA" يحدّث `app_settings`

---

## ما هو موجود فعلاً ولا يحتاج تعديل
- ✅ التطبيق يكتشف الدور تلقائياً ويعرض الواجهة المناسبة
- ✅ Hot-reload / OTA Updates يعمل عبر `capacitor.config.json`
- ✅ كل الميزات الجديدة (Google CTA، UTM، 50 درهم) موجودة في الـ web build وستُحزم تلقائياً في APK
- ✅ 5 ملفات config المتعددة (`capacitor.config.client.json` ...) تبقى للاستخدام المستقبلي إذا أراد المستخدم نسخ منفصلة لكل دور لاحقاً

---

## الملفات المتأثرة
1. `android/app/build.gradle` — رفع رقم الإصدار
2. `capacitor.config.ts` — إضافة DeepLinks
3. `BUILD_APK.md` — دليل جديد (جذر المشروع)
4. `scripts/build-unified-apk.sh` — سكريبت بناء جديد
5. `src/admin/pages/AppInfo.tsx` — صفحة معلومات التطبيق (جديدة، اختيارية)

لا تغييرات في قاعدة البيانات. لا secrets جديدة.

---

## بعد التنفيذ
سأعطيك الأوامر الدقيقة لبناء APK على جهازك:
```bash
git pull
pnpm install
pnpm build && npx cap sync android
npx cap open android
# في Android Studio: Build → Build APK(s)
```
الناتج: ملف `app-debug.apk` واحد يثبّته أي مستخدم ويسجّل بدوره.
