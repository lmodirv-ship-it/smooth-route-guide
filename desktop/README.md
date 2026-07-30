# HN Driver — نسخة الحاسوب (Desktop)

تطبيق سطح مكتب واحد لجميع الأدوار، يفتح **الموقع الحيّ** مباشرة.
لذلك: **كل صفحة أو مقال أو ميزة تضيفها على المنصة تظهر فوراً في نسخة الحاسوب** بدون إعادة بناء.

---

## 1) ما الذي يقدّمه التطبيق

| الميزة | الشرح |
|---|---|
| مزامنة تلقائية | يحمّل `https://www.hn-driver.com` → أي إضافة (صفحة، مقال مدونة، أداة) تظهر مباشرة |
| قابلية التوسّع | لا حاجة لبناء جديد عند إضافة ميزات ويب — البناء فقط لتغيير الغلاف نفسه |
| إدارة ملفات محلية | مساحة عمل في `Documents/HN-Driver/<الدور>` مع مجلدات: inbox, documents, blog, exports, media, archive |
| تنظيم تلقائي | زر واحد يوزّع ملفات `inbox` على images / docs / sheets / media / code |
| تحديث تلقائي OTA | يفحص `latest.yml` عند الإقلاع وكل 30 دقيقة، ينزّل ويطبّق بعد موافقتك |
| وضع عدم الاتصال | صفحة خطأ أنيقة مع زر إعادة محاولة |
| أمان | `contextIsolation: true`، بدون `nodeIntegration`، والملفات محصورة داخل مساحة العمل فقط |

---

## 2) الأدوار

الدور يُحدَّد بمتغيّر البيئة `HN_ROLE` (الافتراضي `admin`) — انظر `config.json`:

| الدور | الرابط |
|---|---|
| `admin` | /admin |
| `supervisor` | /supervisor |
| `callcenter` | /call-center |
| `full` | المنصة كاملة |

---

## 3) طريقة البناء (خطوة بخطوة)

### المتطلبات
- Node.js 18+ و npm
- ويندوز لبناء `.exe` — ماك لبناء `.dmg` — لينكس لبناء `.AppImage`

### الخطوات

```bash
# 1. ادخل مجلد التطبيق
cd desktop

# 2. ضع الأيقونات في مجلد build/
#    build/icon.ico  (256x256، ويندوز)
#    build/icon.png  (512x512، لينكس/نافذة)
#    build/icon.icns (ماك)

# 3. ثبّت الحزم
npm install

# 4. جرّب قبل البناء
npm start

# 5. ابنِ حسب النظام
npm run build:win     # → release/HN Driver Setup 1.0.0.exe
npm run build:mac     # → release/HN Driver-1.0.0.dmg
npm run build:linux   # → release/HN Driver-1.0.0.AppImage
```

الناتج كله في `desktop/release/`.

---

## 4) إطلاق تحديث جديد (OTA)

```bash
# 1. ارفع رقم الإصدار في desktop/package.json  ("version": "1.0.1")
# 2. npm run build:win
# 3. انسخ من release/ الملفات الثلاثة:
#      HN Driver Setup 1.0.1.exe
#      latest.yml
#      *.blockmap
#    إلى: public/downloads/desktop/admin/
# 4. انشر المشروع
```

كل الأجهزة المثبَّتة ستُحدَّث تلقائياً عند فتحها.

> تذكير: **تغيير الواجهة أو إضافة صفحات لا يحتاج OTA إطلاقاً** — يكفي نشر الموقع.

---

## 5) استعمال جسر الملفات من داخل كود الموقع

```ts
import { desktop, isDesktopApp } from "@/lib/desktopBridge";

if (isDesktopApp()) {
  const api = desktop()!;
  const info = await api.info();                       // الدور + مسار مساحة العمل
  const files = await api.files.list("blog");          // عرض الملفات
  await api.files.write("blog/article-1.md", "# مقال"); // حفظ مقال محلياً
  await api.files.importFiles("inbox");                // استيراد من الجهاز
  await api.files.organize("inbox");                   // تنظيم تلقائي
  await api.files.reveal("blog");                      // فتح المجلد في المستكشف
}
```

في المتصفح `isDesktopApp()` ترجع `false` ولا يتعطّل أي شيء — نفس الكود يعمل في النسختين.

---

## 6) هيكل الملفات

```
desktop/
├── main.cjs        # العملية الرئيسية + OTA + IPC للملفات
├── preload.cjs     # جسر آمن → window.hnDesktop
├── config.json     # الأدوار، الروابط، مجلدات العمل، قواعد التنظيم
├── offline.html    # شاشة انقطاع الاتصال
├── package.json    # سكربتات البناء وإعدادات electron-builder
└── build/          # ضع هنا icon.ico / icon.png / icon.icns
```
