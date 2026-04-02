-- Add missing coordinate and tracking columns to trips table
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS pickup_lat numeric;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS pickup_lng numeric;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS destination_lat numeric;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS destination_lng numeric;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS estimated_time integer;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES public.zones(id);
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS cancel_reason text;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS cancelled_by uuid;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- Add index for active trips lookup by driver
CREATE INDEX IF NOT EXISTS idx_trips_driver_status ON public.trips(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_trips_user_status ON public.trips(user_id, status);

-- Add index for delivery orders lookup
CREATE INDEX IF NOT EXISTS idx_delivery_orders_driver_status ON public.delivery_orders(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_user_status ON public.delivery_orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON public.delivery_orders(status);

-- Add index for ride_requests
CREATE INDEX IF NOT EXISTS idx_ride_requests_driver_status ON public.ride_requests(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_ride_requests_status ON public.ride_requests(status);