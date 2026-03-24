-- 1. Fix trips INSERT: bind driver_id to authenticated driver
DROP POLICY IF EXISTS "Drivers can create trips" ON public.trips;
CREATE POLICY "Drivers can create trips" ON public.trips
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'driver'::app_role)
  AND driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
);

-- 2. Fix ride_requests: prevent drivers from self-assigning driver_id
-- The issue is that drivers can write driver_id during update
-- We need to ensure driver_id can only be set to their own driver record
DROP POLICY IF EXISTS "Drivers can update pending requests" ON public.ride_requests;
CREATE POLICY "Drivers can update pending requests" ON public.ride_requests
FOR UPDATE TO authenticated
USING (
  status = 'pending'
  AND has_role(auth.uid(), 'driver'::app_role)
  AND (driver_id IS NULL OR driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()))
)
WITH CHECK (
  status IN ('accepted', 'rejected')
  AND (
    status = 'rejected'
    OR (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()))
  )
);