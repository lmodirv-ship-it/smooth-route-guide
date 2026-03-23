-- Allow drivers to update ride_requests assigned to them (after acceptance)
CREATE POLICY "Drivers can update assigned requests"
ON public.ride_requests
FOR UPDATE
TO authenticated
USING (driver_id = auth.uid() AND status IN ('accepted', 'in_progress', 'arriving'))
WITH CHECK (status IN ('in_progress', 'arriving', 'completed', 'cancelled'));