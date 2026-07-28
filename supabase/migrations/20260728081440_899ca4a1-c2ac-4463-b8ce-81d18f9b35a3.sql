-- 1) call_logs: explicit self-scoped read policy
DROP POLICY IF EXISTS "Users can view own call logs" ON public.call_logs;
CREATE POLICY "Users can view own call logs"
ON public.call_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2) ride_requests: prevent drivers from reassigning rides via UPDATE
DROP POLICY IF EXISTS "Drivers can update assigned requests" ON public.ride_requests;
CREATE POLICY "Drivers can update assigned requests"
ON public.ride_requests
FOR UPDATE
TO authenticated
USING (
  driver_id = auth.uid()
  AND status = ANY (ARRAY['accepted'::text, 'in_progress'::text, 'arriving'::text])
)
WITH CHECK (
  driver_id = auth.uid()
  AND status = ANY (ARRAY['in_progress'::text, 'arriving'::text, 'completed'::text, 'cancelled'::text])
);