-- 1. Fix user_roles: replace ALL policy with explicit ones
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can select roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins can select roles" ON public.user_roles
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert roles" ON public.user_roles
FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roles" ON public.user_roles
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles" ON public.user_roles
FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Fix wallet INSERT to only allow balance=0
DROP POLICY IF EXISTS "Users can insert own wallet" ON public.wallet;
CREATE POLICY "Users can insert own wallet" ON public.wallet
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND balance = 0);

-- 3. Fix ride_messages policy for drivers
DROP POLICY IF EXISTS "Users can view ride messages" ON public.ride_messages;
CREATE POLICY "Users can view ride messages" ON public.ride_messages
FOR SELECT TO authenticated
USING (
  sender_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.ride_requests rr
    WHERE rr.id = ride_id AND (
      rr.user_id = auth.uid()
      OR rr.driver_id IN (SELECT d.id FROM public.drivers d WHERE d.user_id = auth.uid())
    )
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'agent'::app_role)
);

-- 4. active_drivers_public is a VIEW with security_invoker=true
-- RLS on the underlying drivers table already applies
-- The scanner flags it because views don't have their own RLS
-- This is expected behavior with security_invoker views