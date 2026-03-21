
ALTER TABLE public.ride_requests 
  ADD COLUMN IF NOT EXISTS pickup_lat numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pickup_lng numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS destination_lat numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS destination_lng numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS distance numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS driver_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS accepted_at timestamp with time zone DEFAULT NULL;
