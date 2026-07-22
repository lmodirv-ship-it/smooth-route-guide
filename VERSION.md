# HN Driver — Version v2026.07.22

- **Version code:** `v2026.07.22`
- **Released:** 22 July 2026
- **Status:** Stable snapshot (frozen for archive)

## Highlights included in this snapshot

- الأدوار الموحّدة (admin, moderator, call_center, driver ركاب/توصيل, store owner, client, supervisor).
- صفحة العميل الكاملة `/customer/*` + توافقية `/client/*`.
- نظام الرحلات المنتظمة والحجوزات (`routes` + `reservations`) مع Realtime.
- صفحة السائق **"رحلاتي المنتظمة"** `/driver/my-routes`.
- تحصين RLS الشامل (409 سياسة، 130 جدول، 59 دالة).
- HIBP للحماية من كلمات المرور المسربة + سجل تدقيق.
- صفحات خطأ مخصصة + شريط تقدم بين المسارات.
- توحيد مزوّد AI (Gemini أولاً، ثم Lovable AI) في Edge Functions.

## Files in the backup bundle

راجع `EXPORT_GUIDE.md` وحزمة `/mnt/documents/backup-2026-07-22/`.
