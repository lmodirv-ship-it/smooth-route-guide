# 🌐 منارة — دليل التركيب في جميع مواقع مجموعة HN

السكريبت: `public/manara-embed.js`
الرابط المباشر بعد النشر: `https://www.hn-driver.com/manara-embed.js`

---

## 1) التركيب الأسرع (سطر واحد)

ضع هذا قبل `</body>` في أي موقع من المجموعة:

```html
<script src="https://www.hn-driver.com/manara-embed.js"
        data-auto="true"
        data-color="45 93% 55%"
        data-height="100"
        data-speed="24"
        data-hue="18"
        data-labels="admin,driver,client,delivery,call,stock"></script>
```

## 2) التركيب داخل قسم محدد من الصفحة

```html
<div id="manara" style="position:relative"></div>
<script src="https://www.hn-driver.com/manara-embed.js"></script>
<script>
  Manara.mount('#manara', {
    color: '45 93% 55%',   // لون العلامة بصيغة HSL بدون hsl()
    height: 70,            // نسبة الارتفاع من الشاشة (vh)
    speed: 24,             // ثواني الدورة الكاملة
    background: true,      // الخلفية ثلاثية الأبعاد (شبكة + كرات + نجوم)
    hueCycle: 18,          // ثواني دورة تغيّر الألوان (0 = ثابت اللون)
    labels: ['admin','driver','client']  // تسميات مدارية
  });
</script>
```

الإزالة في أي وقت: `Manara.destroy()`

## 3) لون كل موقع (اقتراح للتمييز البصري)

| الموقع | `color` (HSL) |
|---|---|
| الرئيسي hn-driver.com | `45 93% 55%` (ذهبي) |
| admin | `265 85% 62%` |
| driver | `142 70% 45%` |
| client | `200 90% 55%` |
| delivery | `25 95% 55%` |
| call center | `340 85% 60%` |
| hn-stock | `190 80% 50%` |

---

## 4) الأدوار والمهام (Roles & Tasks)

### أدوار المكوّنات داخل السكريبت

| المكوّن | الدور | المهمة |
|---|---|---|
| `buildBackground()` | الطبقة العميقة | شبكة أرضية بمنظور 3D + كرات ضوئية عائمة + 40 نجمة متلألئة. `position:fixed; z-index:-10` فلا تحجب أي محتوى. |
| `buildSphere()` | القلب البصري | 14 حلقة طول + 7 حلقات عرض + قلب متوهّج + 12 شعاعًا دوّارًا + 24 شرارة. |
| `manara-hue` | الهوية الديناميكية | يدوّر ألوان المشهد كاملًا عبر الطيف كل `hueCycle` ثانية. |
| `labels` | مدار المجموعة | يعرض أسماء مواقع HN تدور حول الكرة — رمز الترابط بين المواقع. |
| `Manara.mount/destroy` | واجهة التحكم | تركيب/إزالة نظيفة بدون تسريب عناصر في DOM. |

### أدوار المواقع في شبكة منارة

| الموقع | الدور في الشبكة | المهمة |
|---|---|---|
| `main` (hn-driver.com) | المصدر المرجعي | ينشر شيفرات `domain_change` عند تغيّر أي نطاق. |
| `admin` | لوحة القيادة | إعلان التغييرات من `/admin/manara-network` ومراجعة سجل الاستيراد/التصدير. |
| `driver` / `delivery` | مستقبِل | يطبّق خريطة النطاقات محليًا (`hn_manara_domain_map`) لتفادي فتح واجهة خاطئة. |
| `client` | مستقبِل | نفس الشيء + عرض حالة الشبكة. |
| `call` | مستقبِل | يضمن أن أدوات الاتصال تستهدف النطاق الصحيح. |
| `stock` | مستقبِل/مصدِّر | يبثّ تغييرات مسارات المخزون. |

### المهام التشغيلية عند إضافة موقع جديد

1. أضف وسم السكريبت في صفحة الموقع الجديد (خطوة 1).
2. عرّف معرّف الموقع في `getManaraSiteId()` داخل `src/hooks/useManaraNetwork.ts`.
3. أضِفه إلى `target_sites` عند نشر أي شيفرة من `/admin/manara-network`.
4. تحقق من وصول الشيفرة في جدول `manara_imports` (الحالة تتحوّل إلى `applied`).

---

## 5) ملاحظات تقنية

- بدون أي مكتبة خارجية — CSS + DOM فقط، حجمه ~9KB.
- يحترم `prefers-reduced-motion` (يوقف كل الحركة تلقائيًا).
- كل العناصر `pointer-events:none` أو `aria-hidden` فلا تؤثر على إمكانية الوصول.
- النسخة React الأصلية موجودة في:
  `src/components/manara/Manara3DSphere.tsx` و `ManaraBackground3D.tsx`.
