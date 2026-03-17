-- Add location columns to drivers table
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS current_lat numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS current_lng numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS location_updated_at timestamp with time zone DEFAULT NULL;