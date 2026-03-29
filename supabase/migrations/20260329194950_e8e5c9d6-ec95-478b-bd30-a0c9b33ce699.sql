
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;
