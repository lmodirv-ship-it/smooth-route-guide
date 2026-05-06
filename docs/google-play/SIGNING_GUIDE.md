# 🔐 دليل توقيع التطبيق للنشر على Google Play

## الخطوة 1 — إنشاء مفتاح التوقيع (لمرة واحدة فقط!)

⚠️ **تحذير**: احتفظ بهذا الملف وكلمات المرور في مكان آمن. فقدانها يعني عدم القدرة على تحديث التطبيق على Play Store أبداً.

```bash
cd android/app
keytool -genkey -v \
  -keystore hn-driver-release.keystore \
  -alias hn-driver \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

سيطلب منك:
- **كلمة مرور المخزن (storePassword)** — احفظها
- **كلمة مرور المفتاح (keyPassword)** — احفظها (يمكن نفس السابقة)
- معلومات (الاسم، المؤسسة، البلد...)

الناتج: `android/app/hn-driver-release.keystore`

---

## الخطوة 2 — تكوين بيانات التوقيع

انسخ ملف القالب:

```bash
cp android/keystore.properties.example android/keystore.properties
```

ثم عدّل `android/keystore.properties`:

```properties
storeFile=app/hn-driver-release.keystore
storePassword=كلمة_مرور_المخزن
keyAlias=hn-driver
keyPassword=كلمة_مرور_المفتاح
```

---

## الخطوة 3 — توليد AAB موقّع

```bash
bash scripts/build-play-aab.sh
```

📦 الناتج: `android/app/build/outputs/bundle/release/app-release.aab`

هذا الملف **موقّع وجاهز** للرفع مباشرة على Play Console.

---

## 🔒 الأمان

أضف هذه الأسطر إلى `.gitignore` (موجودة بالفعل عادة):

```
android/keystore.properties
android/app/*.keystore
android/app/*.jks
```

---

## 💡 نصيحة: App Signing by Google Play

Google يوصي بتفعيل **Play App Signing**:
- ترفع المفتاح الأولي لـ Google
- Google يدير مفتاح التوقيع النهائي
- لو فقدت مفتاحك، يمكن لـ Google استرجاعه

عند إنشاء التطبيق في Play Console، اختر **"Use Play App Signing"** (مفعّل افتراضياً).
