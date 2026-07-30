# HN Driver — دليل النسخة الكاملة `300726`

> نسخة المنصة بتاريخ **30/07/2026** — تشمل الكود الكامل، نسخة الحاسوب (Windows)، تطبيق الأندرويد (APK)، وتشغيل نماذج الذكاء الاصطناعي المحلية.
> © جميع الحقوق محفوظة — el hassani moulay ismail. groupe hn

---

## 0) محتويات النسخة

| المجلد | الوصف |
|---|---|
| `src/` | كود الواجهات (React + Vite + Tailwind) لجميع الأدوار |
| `src/admin/` | لوحة الإدارة + صفحة الدردشة الذكية + إدارة النماذج |
| `supabase/` | دوال الحافة (Edge Functions) + كل ملفات الهجرة (Migrations) للقاعدة |
| `desktop/` | مشروع Electron لنسخة الحاسوب (Windows / Mac / Linux) |
| `android/` | مشروع Capacitor للأندرويد (APK / AAB) |
| `docs/` | التوثيق (هذا الملف + تقارير قاعدة البيانات) |
| `public/` | الملفات الثابتة، الأيقونات، manifest |

---

## 1) المتطلبات الأساسية (مرة واحدة)

| الأداة | النسخة | الرابط |
|---|---|---|
| Node.js | **18 أو أحدث** | https://nodejs.org |
| pnpm | **8 أو أحدث** | `npm install -g pnpm` |
| Git | أي نسخة | https://git-scm.com |
| Java JDK | **17** | للأندرويد فقط |
| Android Studio | آخر نسخة | للأندرويد فقط |

> ⚠️ المشروع يفرض `pnpm` — أمر `npm install` سيتوقف برسالة خطأ. استعمل `pnpm install` دائماً.

### التثبيت الأول

```bash
cd C:\hn-driver
pnpm install
```

إذا ظهر خطأ في التثبيت:

```bash
pnpm store prune
pnpm install --frozen-lockfile
```

### ملف البيئة `.env`

يجب أن يوجد ملف `.env` في جذر المشروع يحوي:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>
VITE_SUPABASE_PROJECT_ID=<project id>
```

هذه القيم موجودة أصلاً في النسخة المرفقة. لا تعدّلها إلا إذا غيّرت المشروع الخلفي.

---

## 2) التشغيل المحلي (للتجربة قبل البناء)

```bash
pnpm dev              # الموقع الرئيسي  → http://localhost:8080
pnpm dev:admin        # لوحة الإدارة     → http://localhost:5174
```

---

## 3) بناء نسخة الويب (الرفع على الاستضافة)

```bash
pnpm build              # النسخة الرئيسية → dist/
pnpm build:all-apps     # كل الواجهات دفعة واحدة
```

| الأمر | المخرج |
|---|---|
| `pnpm build` | `dist/` — الموقع العام |
| `pnpm build:admin` | `dist-admin/` — لوحة الإدارة |
| `pnpm build:client` | `dist-client/` — واجهة العميل |
| `pnpm build:driver-ride` | `dist-driver-ride/` — سائق الركاب |
| `pnpm build:driver-delivery` | `dist-driver-delivery/` — سائق التوصيل |
| `pnpm build:hn-stock` | `dist-hn-stock/` — المخزون |

ارفع **محتويات** المجلد (وليس المجلد نفسه) إلى جذر الاستضافة عبر FTP، مع ملف `.htaccess` لتوجيه المسارات (SPA).

---

## 4) بناء نسخة الحاسوب (Windows) 🖥️

### الطريقة (أ) — الأسرع: نسخة Electron المستقلة داخل `desktop/`

هذه النسخة تفتح المنصة الحيّة مباشرة + تدير الملفات المحلية + تتصل بالنماذج المحلية بدون CORS.

```bash
cd desktop
pnpm install
pnpm start            # تجربة فورية قبل البناء
pnpm build:win        # ينتج المثبّت
```

المخرج: `desktop/release/HN Driver Setup 1.0.0.exe`

أدوار محددة عند التشغيل:

```bash
pnpm start:admin        # يفتح على لوحة الإدارة
pnpm start:callcenter   # يفتح على مركز الاتصال
```

### الطريقة (ب) — نسخة تحوي الموقع مدمجاً (Offline)

من جذر المشروع:

```bash
pnpm install
pnpm desktop:win
```

يقوم بـ: بناء `dist/` ثم تغليفه بـ `electron-builder` إلى مثبّت `.exe`.

### إعدادات مهمة قبل البناء

1. **الأيقونة**: ضع `icon.ico` (256×256) داخل `desktop/build/`.
2. **الرابط الافتراضي**: عدّله في `desktop/config.json`.
3. **base path**: تأكد أن `vite.config.ts` يستعمل `base: './'` عند البناء للحاسوب — وإلا تظهر نافذة سوداء.

### أخطاء شائعة

| العرض | الحل |
|---|---|
| نافذة بيضاء/سوداء | `base: './'` في vite.config ثم أعد البناء |
| نافذتان فوق بعض | مفعّل أصلاً: Single Instance Lock في `main.cjs` |
| `__dirname is not defined` | يجب أن يكون الملف بامتداد `.cjs` |
| فشل `electron-builder` بسبب 7zip | احذف `node_modules` وأعد `pnpm install` |

---

## 5) تشغيل نماذج الذكاء الاصطناعي 🤖

### أ) النماذج السحابية (تعمل تلقائياً)

مفعّلة عبر بوابة Lovable AI — لا تحتاج أي مفتاح. عند نفاد الرصيد (خطأ 402) ينتقل النظام تلقائياً إلى:
1. النماذج ذات مفاتيح API خاصة (تُدخل من: لوحة الإدارة ← نماذج الذكاء الاصطناعي).
2. النماذج المحلية المفعّلة.

### ب) النماذج المحلية (بدون إنترنت وبدون API)

**1. ثبّت محرّك محلي:**

- **Ollama** — https://ollama.com/download (الأسهل)
- أو **LM Studio** — https://lmstudio.ai

**2. حمّل نموذجاً:**

```bash
ollama pull qwen2.5:7b
ollama pull llama3.1:8b
ollama serve
```

الخادم يعمل على: `http://localhost:11434`

**3. اسمح بالاتصال من المتصفح (CORS) — ضروري لنسخة الويب فقط:**

في Windows (PowerShell كمسؤول):

```powershell
setx OLLAMA_ORIGINS "*" /M
setx OLLAMA_HOST "0.0.0.0:11434" /M
```

ثم أعد تشغيل Ollama.

> في **نسخة الحاسوب (Desktop)** يعمل الاتصال مباشرة **بدون** هذا الإعداد.

**4. سجّل النموذج في المنصة:**

لوحة الإدارة ← **النماذج المحلية** ← إضافة نموذج:

| الحقل | القيمة |
|---|---|
| الاسم | Qwen 2.5 7B |
| المحرّك | ollama |
| معرّف النموذج | `qwen2.5:7b` |
| رابط الخادم | `http://localhost:11434` |
| مفعّل | ✅ |

اضغط **فحص الحاسوب** — يجب أن تظهر الحالة «متصل».

**5. استعمله في الدردشة:**

لوحة الإدارة ← **الدردشة الذكية** ← قائمة «النموذج» ← مجموعة **«نماذج محلية (بدون إنترنت)»**.
الاتصال مباشر من جهازك، بدون أي وسيط ولا مفتاح API.

### ج) مشاكل شائعة للنماذج المحلية

| العرض | السبب / الحل |
|---|---|
| «تعذّر الاتصال بالخادم المحلي» | Ollama متوقف → `ollama serve` |
| يعمل في Desktop ولا يعمل في المتصفح | ينقص `OLLAMA_ORIGINS=*` |
| الحالة «غير متصل» رغم التشغيل | جدار الحماية يحجب المنفذ 11434 |
| رد بطيء جداً | النموذج كبير على الجهاز — جرّب `qwen2.5:3b` |

---

## 6) بناء تطبيق الأندرويد (APK / AAB) 📱

### التحضير (مرة واحدة)

1. ثبّت **Android Studio** + **JDK 17**.
2. من Android Studio: `SDK Manager` ← ثبّت **Android SDK 34** و **Build-Tools**.
3. أضف متغيرات البيئة:

```
ANDROID_HOME = C:\Users\<اسمك>\AppData\Local\Android\Sdk
PATH += %ANDROID_HOME%\platform-tools
```

### الخطوات

```bash
pnpm install
pnpm build                 # يبني dist/
npx cap sync android       # ينسخ الويب إلى المشروع الأصلي
npx cap open android       # يفتح Android Studio
```

أو بأمر واحد:

```bash
pnpm native:android:apk
```

### داخل Android Studio

- **APK للتجربة**: `Build` ← `Build Bundle(s)/APK(s)` ← `Build APK(s)`
  المخرج: `android/app/build/outputs/apk/debug/app-debug.apk`

- **APK موقّع للنشر**:
  `Build` ← `Generate Signed Bundle / APK` ← اختر **APK** ← أنشئ/اختر keystore ← `release`
  المخرج: `android/app/build/outputs/apk/release/app-release.apk`

- **AAB لمتجر Play**: نفس الخطوات لكن اختر **Android App Bundle**
  المخرج: `android/app/build/outputs/bundle/release/app-release.aab`

### أو من سطر الأوامر (بدون فتح Android Studio)

```bash
cd android
gradlew.bat assembleDebug        # APK تجريبي
gradlew.bat assembleRelease      # APK للنشر (يحتاج keystore)
gradlew.bat bundleRelease        # AAB لمتجر Play
```

### إنشاء keystore (مرة واحدة)

```bash
keytool -genkey -v -keystore hndriver.keystore -alias hndriver -keyalg RSA -keysize 2048 -validity 10000
```

ثم في `android/app/build.gradle` أضف بلوك `signingConfigs` بمعطيات الـ keystore.

> 🔒 احتفظ بملف الـ keystore وكلمة السر في مكان آمن — بدونهما لا يمكن تحديث التطبيق في المتجر أبداً.

### تطبيقات الأدوار المنفصلة

توجد ملفات إعداد جاهزة لكل دور:
`capacitor.config.client.json` · `capacitor.config.driver.json` · `capacitor.config.delivery.json` · `capacitor.config.admin.json` · `capacitor.config.callcenter.json` · `capacitor.config.store.json`

للبناء بدور محدد: انسخ الملف المطلوب فوق `capacitor.config.json` ثم أعد `npx cap sync android`.

### أخطاء شائعة

| العرض | الحل |
|---|---|
| شاشة بيضاء في التطبيق | احذف بلوك `server.url` من `capacitor.config.ts` قبل البناء النهائي |
| `SDK location not found` | أنشئ `android/local.properties` بسطر `sdk.dir=C\:\\Users\\...\\Sdk` |
| `Unsupported Java version` | استعمل JDK 17 وليس 21 |
| `cap: command not found` | استعمل `npx cap ...` |

---

## 7) قاعدة البيانات

كل الجداول والدوال والسياسات موجودة في `supabase/migrations/`.
لاستعادتها على مشروع جديد:

```bash
npx supabase link --project-ref <ref>
npx supabase db push
```

دوال الحافة:

```bash
npx supabase functions deploy <function-name>
```

---

## 8) ترتيب العمل الموصى به

```
1. pnpm install
2. pnpm dev              ← تأكد أن كل شيء يعمل محلياً
3. pnpm build:all-apps   ← نسخ الويب للرفع بـ FTP
4. cd desktop && pnpm build:win   ← مثبّت Windows
5. pnpm native:android:apk        ← تطبيق الأندرويد
6. ollama serve + تسجيل النموذج   ← الذكاء الاصطناعي المحلي
```

---

**نسخة:** `300726` — 30 يوليوز 2026
**المالك:** el hassani moulay ismail — groupe hn
