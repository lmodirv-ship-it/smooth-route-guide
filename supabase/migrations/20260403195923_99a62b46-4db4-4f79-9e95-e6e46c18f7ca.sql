-- Allow drivers to update delivery_orders when status is 'pending' (not just 'ready_for_driver')
-- Drop the old policy and recreate with expanded statuses
DROP POLICY IF EXISTS "Drivers can accept ready orders" ON public.delivery_orders;

CREATE POLICY "Drivers can accept ready orders"
ON public.delivery_orders
FOR UPDATE
TO authenticated
USING (
  status IN ('pending', 'ready_for_driver')
  AND driver_id IS NULL
)
WITH CHECK (
  status = 'driver_assigned'
  AND driver_id IS NOT NULL
);

-- Ensure call_signals has proper RLS policies for participants
DROP POLICY IF EXISTS "Participants can read call signals" ON public.call_signals;
DROP POLICY IF EXISTS "Participants can insert call signals" ON public.call_signals;

CREATE POLICY "Participants can read call signals"
ON public.call_signals
FOR SELECT
TO authenticated
USING (
  sender_id = auth.uid() OR recipient_id = auth.uid()
);

CREATE POLICY "Participants can insert call signals"
ON public.call_signals
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
);

-- Ensure call_sessions has proper RLS policies
DROP POLICY IF EXISTS "Participants can read call sessions" ON public.call_sessions;
DROP POLICY IF EXISTS "Users can create call sessions" ON public.call_sessions;
DROP POLICY IF EXISTS "Participants can update call sessions" ON public.call_sessions;

CREATE POLICY "Participants can read call sessions"
ON public.call_sessions
FOR SELECT
TO authenticated
USING (
  caller_id = auth.uid() OR callee_id = auth.uid()
);

CREATE POLICY "Users can create call sessions"
ON public.call_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  caller_id = auth.uid()
);

CREATE POLICY "Participants can update call sessions"
ON public.call_sessions
FOR UPDATE
TO authenticated
USING (
  caller_id = auth.uid() OR callee_id = auth.uid()
);