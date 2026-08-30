---
name: Manara Knowledge Network
description: Cross-site signal exchange (manara_exports/manara_imports + manara-sync function) keeping HN group domains/routes in sync
type: feature
---
منارة = نقطة اتصال موحدة بين مواقع مجموعة HN. عند تغيّر نطاق/مسار، الموقع ينشر شيفرة تُسجَّل في `manara_exports` (المُرسِل) وتُنسخ لكل هدف في `manara_imports` (المستقبل).

- Edge function `manara-sync`: `action=publish` (admin JWT أو توقيع HMAC عبر سر `MANARA_HMAC_SECRET` + هيدر `x-manara-signature`)، `action=pull?site=`، `action=ack`.
- أنواع الشيفرات: domain_change, route_change, status, announcement, asset.
- العميل: `useManaraNetwork` يطبّق شيفرات domain_change في `localStorage:hn_manara_domain_map`؛ `domainFailover.findActiveDomainForRole` يقرأها ويقدّم النطاق المُعلن على القائمة الثابتة.
- الواجهة: `/manara` (كرة + مدارات مواقع + سجل إشارات)، لوحة الإدارة `/admin/manara-network` مع زر "إعلان تغيير نطاق".
- Realtime مفعّل على الجدولين (REPLICA IDENTITY FULL). القراءة عامة؛ الكتابة للمسؤولين أو عبر الدالة.
