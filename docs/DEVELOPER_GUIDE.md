# دليل النشر والمطور — HN Driver

## المعمارية
- Frontend: Vite + React 18 + TS + Tailwind + shadcn/ui.
- Multi-app (Capacitor): وحدات مستقلة تُبنى عبر `vite.config.*.ts` لكل دور.
- Backend: Lovable Cloud (Supabase) — 130+ جدولاً مع RLS كامل.
- Realtime: `REPLICA IDENTITY FULL` على `delivery_orders` و `drivers`.

## أوامر البناء
```bash
pnpm install --frozen-lockfile
pnpm build              # الويب الأساسي
pnpm build:admin        # لوحة الأدمن (vite.config.admin.ts)
pnpm build:hn-stock     # لوحة المخزون
```

## الأمن
- HIBP مُفعّل (فحص كلمات المرور المسرّبة).
- كل جدول عام له RLS + GRANT صريح.
- Audit موحّد على: `payments`, `wallet`, `wallet_transactions`, `user_roles`, `coupons`, `commission_rates` عبر `audit_sensitive_changes()`.
- الأدوار في `user_roles` فقط (لا في `profiles`).
- كل الاستفسارات الأمنية للأدمن تمرّ بـ `has_role(auth.uid(), 'admin')`.

## UX
- شريط تقدم أعلى الصفحة (`RouteProgress`) عند كل تنقل.
- صفحات مخصّصة: `/403`, `/500`, وصفحة 404 مسجَّلة `analytics_events`.
- `RequireRole` يوجّه تلقائياً لصفحة الدخول المناسبة للدور.

## البنية والمسارات
- انظر `docs/routes-map.md` — قائمة كاملة بكل المسارات وحمايتها.
- انظر `docs/edge-functions.md` — فهرس Edge Functions.
- انظر `docs/erd.mmd` — مخطط قواعد البيانات (Mermaid).
- تقرير قاعدة البيانات: `database-documentation.xlsx` (130 جدول، 59 دالة، 62 مشغّل، 538 سياسة RLS).

## الاختبار
```bash
pnpm test              # Vitest
```

## المراقبة
- جدول `analytics_events` يستقبل كل أحداث NotFound + الأخطاء الحرجة.
- جدول `system_health_snapshots` يخزّن حالة النظام كل دورة `selfHealingEngine`.
- `db_audit_log` يعرض كل تعديلات الجداول الحسّاسة.

## اتصال Supabase (Lovable Cloud)
- لا يمكن الوصول لمفتاح `service_role` أو كلمة مرور DB (مُدارة).
- كل التغييرات البنيوية عبر أداة migrations فقط.
- Data API معطّلة لـ `anon` على الجداول الحسّاسة (مخازن، اتصالات، مدفوعات، إعدادات).

## استعادة البيانات (PITR)
مفعّل تلقائياً — يُطلب من الفريق عبر لوحة Lovable Cloud → Backend.
