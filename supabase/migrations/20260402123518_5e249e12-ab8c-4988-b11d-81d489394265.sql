
-- Add estimated_time column (minutes) to ride_requests
ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS estimated_time integer;

-- Also add to delivery_orders for consistency
ALTER TABLE public.delivery_orders ADD COLUMN IF NOT EXISTS estimated_time integer;
ALTER TABLE public.delivery_orders ADD COLUMN IF NOT EXISTS distance numeric;
