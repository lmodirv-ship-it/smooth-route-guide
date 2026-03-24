# Legacy & Migration Notes

## ✅ Fully Removed

| Item | Description |
|------|------------|
| `firebase` npm package | Removed from `package.json` |
| `src/lib/legacy/` | Firebase adapters, orderService, firestoreClient — deleted |
| `src/pages/AdminDashboard.tsx` | Old 874-line standalone admin page — replaced by `src/admin/` module |
| `src/pages/CallCenter.tsx` | Old standalone call center page — replaced by `src/admin/pages/callcenter/` |
| `src/pages/Login.tsx` | Dead redirect file — `/login` route handled directly by `AuthPage` |
| `src/pages/client/RideTracking.tsx` | Dead redirect file — tracking handled by `/customer/tracking` route |

## 🔄 Legacy Redirects (kept for backward compatibility)

These redirects exist in `src/App.tsx` and ensure old links/bookmarks still work:

| Old Path | Redirects To |
|----------|-------------|
| `/client/*` | `/customer/*` |
| `/client/tracking` | `/customer/tracking` |
| `/customer-tracking` | `/customer/tracking` |
| `/driver-panel/*` | `/driver/*` |
| `/driver-tracking` | `/driver/tracking` |

> These can be removed once all users have migrated to the new paths.

## 🏗 Current Architecture

- **Auth**: Supabase only (`RequireRole` component)
- **Pricing**: DB-driven via `app_settings` table + `usePricingSettings` hook
- **Admin Panel**: Self-contained module in `src/admin/`
- **Routing**: Canonical paths defined in `src/lib/routes.ts`
