-- Add commission_rate, store_code (6-digit), and is_confirmed columns to stores (ADDITIVE ONLY)
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 5;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS store_code text DEFAULT '';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_confirmed boolean DEFAULT false;