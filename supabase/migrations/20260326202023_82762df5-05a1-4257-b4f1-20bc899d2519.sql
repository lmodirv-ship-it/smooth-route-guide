ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_code text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_confirmed boolean NOT NULL DEFAULT false;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS ticket_code text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS driver_code text;