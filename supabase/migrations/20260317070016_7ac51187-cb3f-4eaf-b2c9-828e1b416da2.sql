-- Allow drivers to update ride_requests (accept/reject)
CREATE POLICY "Drivers can update pending requests"
ON public.ride_requests
FOR UPDATE
TO authenticated
USING (
  (status = 'pending') AND has_role(auth.uid(), 'driver'::app_role)
)
WITH CHECK (
  status IN ('accepted', 'rejected')
);

-- Allow drivers to insert trips when accepting
CREATE POLICY "Drivers can create trips"
ON public.trips
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'driver'::app_role)
);