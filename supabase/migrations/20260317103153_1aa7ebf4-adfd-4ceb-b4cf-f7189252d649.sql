ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS google_place_id text DEFAULT NULL;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS area text DEFAULT '';