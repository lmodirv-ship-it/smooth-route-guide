-- 1. Fix the view: remove user_id, keep only what customers need
DROP VIEW IF EXISTS public.active_drivers_public;

CREATE VIEW public.active_drivers_public 
WITH (security_invoker = true) AS
SELECT 
  id,
  car_id,
  status,
  rating,
  ROUND(current_lat::numeric, 2) AS current_lat,
  ROUND(current_lng::numeric, 2) AS current_lng
FROM public.drivers
WHERE status = 'active';

-- 2. Fix the drivers policy: restrict so drivers only see own record
-- Other drivers are visible via the safe view above
DROP POLICY IF EXISTS "Users can view active drivers limited" ON public.drivers;

-- Regular authenticated users (customers) should use the view, not the table directly
-- Only own record, admins, and agents get direct table access
CREATE POLICY "Authenticated users can view own driver record"
ON public.drivers
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'agent'::app_role)
);