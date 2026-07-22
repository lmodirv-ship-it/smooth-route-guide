# دليل تصدير النسخة v2026.07.22

## 1) تصدير الكود

### الطريقة الموصى بها — GitHub Sync
1. من محرر Lovable: قائمة `+` → **GitHub → Connect project**.
2. اختر الحساب/المنظمة → **Create Repository**.
3. من GitHub: **Code → Download ZIP** أو `git clone`.

### الطريقة المباشرة — Download codebase
- افتح محرر الكود في Lovable → أسفل شجرة الملفات: **Download codebase** (للحسابات المدفوعة).

## 2) تصدير قاعدة البيانات

### البيانات الكاملة (Data dump)
- من Lovable: **Cloud → Advanced settings → Export data**.
- هذا هو المسار الرسمي والوحيد للتفريغ الكامل. لا يوجد `pg_dump` مباشر.

### المخطط (Schema) — جاهز في الحزمة
مجلد `/mnt/documents/backup-2026-07-22/schema/`:
| ملف | محتوى |
|---|---|
| `schema-tables.sql` | 130 جدولاً في `public` |
| `schema-functions.sql` | 59 دالة |
| `schema-triggers.sql` | مشغلات `public` |
| `schema-policies.sql` | 409 سياسات RLS |
| `schema-indexes.sql` | الفهارس |

### عيّنات CSV
`/mnt/documents/backup-2026-07-22/samples-csv/` — عيّنات (≤1000 صف) لـ:
`routes`, `reservations`, `profiles`, `user_roles`, `app_settings`.

## 3) الاستعادة على مشروع Supabase جديد
1. أنشئ مشروعاً جديداً.
2. نفّذ ملفات `schema/` بالترتيب: tables → functions → triggers → policies → indexes.
3. استورد البيانات المُصدَّرة من خطوة Export data (`.sql` / `.csv`).
4. اضبط الأسرار (Secrets) في Edge Functions: `GEMINI_API_KEY`, `STRIPE_*`, `TWILIO_*`, `MAILBLUSTER_*`, `GOOGLE_MAPS_KEY`, `PAYPAL_*`.

## 4) الأسرار — لا تصدَّر
الأسرار محفوظة في Lovable Cloud Secrets ولا تُنسخ ضمن هذه الحزمة. أعِد إدخالها يدوياً في البيئة الجديدة.
