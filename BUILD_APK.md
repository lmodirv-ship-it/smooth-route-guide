# 📱 بناء نسخة APK موحّدة — HN Driver

نسخة **واحدة تخدم كل الأدوار**: عميل، سائق VTC، سائق توصيل، صاحب محل، مركز اتصال، أدمن.
يتم اكتشاف الدور تلقائياً بعد تسجيل الدخول وتوجيه المستخدم للوحته الخاصة.

---

## ✨ الميزات في هذا الإصدار (v1.2)

- ✅ **تسجيل بضغطة واحدة عبر Google** (لا حاجة لكلمة مرور)
- ✅ **هدية 50 درهم** تلقائياً لكل مستخدم جديد
- ✅ **تتبع UTM** للحملات الإعلانية
- ✅ تطبيق موحّد بدلاً من 5 تطبيقات منفصلة
- ✅ Deep Links — روابط `hn-driver.com/*` تفتح داخل التطبيق
- ✅ تحديثات OTA دون الحاجة لإعادة التثبيت

---

## 🛠️ المتطلبات (مرّة واحدة)

| الأداة | الإصدار |
|--------|---------|
| Node.js | ≥ 18 |
| pnpm | ≥ 8 |
| Android Studio | Hedgehog أو أحدث |
| JDK | 17 |

---

## 🚀 بناء APK في 4 أوامر

```bash
git pull
pnpm install
bash scripts/build-unified-apk.sh
npx cap open android
```

في Android Studio: **Build → Generate Signed Bundle / APK → APK** ثم اختر keystore.

ملف APK سيكون في:
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## 📤 نشر التحديث للمستخدمين

1. **انسخ APK** إلى `public/downloads/hn-driver-v1.2.apk`
2. **حدّث الإصدار في DB**:
   ```sql
   UPDATE app_settings 
   SET value = '1.2' 
   WHERE key = 'latest_apk_version';
   ```
3. **انشر الموقع** — المستخدمون الحاليون سيرون إشعار التحديث.

---

## 🎯 ملاحظات

- `versionCode` و `versionName` في `android/app/build.gradle` (حالياً: `3` / `1.2`)
- لتحديث رقم الإصدار للمرة القادمة، ارفع `versionCode` بـ 1 و حدّث `versionName`
- ملفات `capacitor.config.{client,driver,delivery,callcenter,ride}.json` تبقى للنسخ المنفصلة المستقبلية إن لزم
