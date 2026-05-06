# 🤖 بناء AAB تلقائياً عبر GitHub Actions

تبني AAB في السحابة بدون تثبيت Android Studio على جهازك.

---

## 📋 الإعداد لمرة واحدة

### 1️⃣ إنشاء مفتاح التوقيع (على أي جهاز فيه Java)

إن لم يكن لديك Java، استخدم [موقع keytool أونلاين](https://keytool-online.vercel.app/) أو أي جهاز آخر:

```bash
keytool -genkey -v -keystore hn-driver-release.keystore \
  -alias hn-driver -keyalg RSA -keysize 2048 -validity 10000
```

سينشئ ملف `hn-driver-release.keystore`. **احتفظ به في مكان آمن جداً!** فقدانه = عدم القدرة على تحديث التطبيق على Play Store أبداً.

### 2️⃣ تحويل الـ keystore إلى Base64

**على Linux/Mac:**
```bash
base64 -w 0 hn-driver-release.keystore > keystore.base64.txt
```

**على Windows (PowerShell):**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("hn-driver-release.keystore")) | Out-File keystore.base64.txt
```

افتح `keystore.base64.txt` وانسخ كامل المحتوى.

### 3️⃣ إضافة الأسرار في GitHub

اذهب إلى:
**https://github.com/lmodirv-ship-it/smooth-route-guide/settings/secrets/actions**

اضغط **New repository secret** وأضف 4 أسرار:

| Name | Value |
|------|-------|
| `ANDROID_KEYSTORE_BASE64` | محتوى `keystore.base64.txt` بالكامل |
| `ANDROID_STORE_PASSWORD` | كلمة مرور المخزن |
| `ANDROID_KEY_ALIAS` | `hn-driver` |
| `ANDROID_KEY_PASSWORD` | كلمة مرور المفتاح |

---

## 🚀 تشغيل البناء

### الطريقة 1 — يدوياً (الأسرع)

1. اذهب إلى: **https://github.com/lmodirv-ship-it/smooth-route-guide/actions**
2. اختر **Build Android AAB (Google Play)** من القائمة اليسرى
3. اضغط **Run workflow** → **Run workflow**
4. انتظر ~10-15 دقيقة

### الطريقة 2 — تلقائياً عند tag

```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## 📥 تحميل الـ AAB

بعد انتهاء البناء (✅ أخضر):

1. افتح صفحة الـ run
2. مرر للأسفل لقسم **Artifacts**
3. حمّل **`hn-driver-play-aab`** — يحتوي على `app-release.aab`
4. ارفعه مباشرة على [Play Console](https://play.google.com/console)

---

## ⚠️ ملاحظات مهمة

- **لا تَنشُر ملف `keystore.base64.txt` أو الـ keystore الأصلي على GitHub** — استخدم Secrets فقط
- احتفظ بنسخة احتياطية من الـ keystore في مكان آمن (USB، خدمة سحابية مشفرة)
- لكل إصدار جديد، يجب زيادة `versionCode` في `android/app/build.gradle`
