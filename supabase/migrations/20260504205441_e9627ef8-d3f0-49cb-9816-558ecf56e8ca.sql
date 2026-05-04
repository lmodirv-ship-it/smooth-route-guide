DROP POLICY IF EXISTS "Drivers can update pending requests" ON public.ride_requests;

CREATE POLICY "Drivers can update pending requests"
ON public.ride_requests
FOR UPDATE
USING (
  status = 'pending'
  AND (
    driver_id IS NULL
    OR driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  )
  AND EXISTS (SELECT 1 FROM public.drivers WHERE user_id = auth.uid())
)
WITH CHECK (
  status IN ('accepted', 'rejected')
  AND (
    status = 'rejected'
    OR driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Drivers can view pending requests in area" ON public.ride_requests;

CREATE POLICY "Drivers can view pending requests in area"
ON public.ride_requests
FOR SELECT
USING (
  status = 'pending'
  AND (
    EXISTS (SELECT 1 FROM public.drivers WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'agent'::app_role)
  )
);