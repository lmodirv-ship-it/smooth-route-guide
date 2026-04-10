ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS description text DEFAULT '',
  ADD COLUMN IF NOT EXISTS max_uses_per_user integer DEFAULT 1;