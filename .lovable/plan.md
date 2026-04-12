

# خطة نشر HN-STOCK كموقع مستقل ومعزول تماماً

## المبدأ
كل مشروع معزول بالكامل: ملفات منفصلة، قاعدة بيانات منفصلة، عملية Node منفصلة، server block منفصل. لا تداخل بين المشاريع الثلاثة.

## البنية على السيرفر (213.156.132.166)

```text
/var/www/
├── hn-driver/          ← الموقع الرئيسي (hn-driver.com)
│   ├── dist/
│   └── dist-admin/
├── souk-hn/            ← Souk-HN (hn-driver.online)
│   └── dist/
└── hn-stock/           ← HN-STOCK (hn-driver.site) ← جديد
    ├── dist/           ← React frontend
    ├── server/         ← Express API
    ├── .env            ← إعدادات خاصة بـ HN-STOCK فقط
    └── node_modules/
```

## ما سيتم تنفيذه

### 1. سكريبت إعداد السيرفر (`scripts/server/setup-hn-stock.sh`)
- إنشاء مجلد `/var/www/hn-stock/` مستقل
- إعداد Nginx server block منفصل في ملف مستقل (`/etc/nginx/sites-available/hn-stock`)
- Reverse proxy: `/` → ملفات React الثابتة، `/api` → Express على منفذ `5050` (مختلف عن باقي المشاريع)
- إعداد PM2 باسم `hn-stock-api` (معزول عن أي عملية أخرى)
- إنشاء قاعدة بيانات PostgreSQL مستقلة (`hn_stock_db`) بمستخدم خاص

### 2. تحديث `src/config/domain.ts`
- إضافة `hn-driver.site` و `hn-driver.online` إلى `ALL_DOMAINS`
- إضافة ثوابت المشاريع المستقلة

### 3. تحديث `src/pages/HNGroupePortal.tsx`
- تحديث رابط Souk-HN → `https://www.hn-driver.online`
- إضافة بطاقة HN-STOCK → `https://www.hn-driver.site`

## مبدأ العزل الكامل

| العنصر | hn-driver.com | hn-driver.online | hn-driver.site |
|--------|--------------|------------------|----------------|
| المجلد | `/var/www/hn-driver/` | `/var/www/souk-hn/` | `/var/www/hn-stock/` |
| Nginx | ملف config مستقل | ملف config مستقل | ملف config مستقل |
| قاعدة البيانات | Supabase Cloud | خاصة | `hn_stock_db` (PostgreSQL محلي) |
| العملية | ثابت (Vite) | — | PM2: `hn-stock-api` (منفذ 5050) |
| SSL | شهادة مستقلة | شهادة مستقلة | شهادة مستقلة |

هذا يضمن أن تعطل أي مشروع لا يؤثر على الآخرين إطلاقاً.

