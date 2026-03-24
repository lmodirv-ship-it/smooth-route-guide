
ALTER TABLE public.ride_requests
  ADD COLUMN IF NOT EXISTS cancelled_by uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cancel_reason text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz DEFAULT NULL;
