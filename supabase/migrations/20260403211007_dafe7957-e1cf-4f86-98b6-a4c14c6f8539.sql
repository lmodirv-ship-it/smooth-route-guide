
-- 1. CRITICAL: Add RESTRICTIVE policy on user_roles to prevent privilege escalation
-- Only the handle_new_user trigger (service role) and admins can insert
CREATE POLICY "Restrict user_roles inserts to service role or admin"
ON public.user_roles AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. Fix commission_rates: Remove agent UPDATE policy, keep admin only
DROP POLICY IF EXISTS "Agents can update commission rates" ON public.commission_rates;

-- Ensure admin-only update policy exists with value bounds
DROP POLICY IF EXISTS "Admins can update commission rates" ON public.commission_rates;
CREATE POLICY "Admins can update commission rates"
ON public.commission_rates
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND rate >= 0 AND rate <= 50);
