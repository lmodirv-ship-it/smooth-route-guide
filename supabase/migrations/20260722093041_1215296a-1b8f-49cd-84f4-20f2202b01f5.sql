
-- Harden face_auth_attempts: only service role (edge functions) inserts audit rows.
DROP POLICY IF EXISTS "Users can insert own face auth attempts" ON public.face_auth_attempts;

-- Restrict platform_translations to only active locales? Keep read for authenticated + anon (UI needs them),
-- but the finding worries about business-sensitive strings. Keep authenticated-only read as-is (already restricted, no anon).
-- No change needed here beyond documentation; keep policy.

-- Restrict geo_codes broad read remains as-is (public reference).
-- Restrict restaurant_ratings and hn_stock_contact_messages remain as-is (intentional public UX).
