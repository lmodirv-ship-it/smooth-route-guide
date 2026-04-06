
-- 1. Fix delivery_orders: drop old policy and create secure one
DROP POLICY IF EXISTS "Drivers can accept ready orders" ON public.delivery_orders;

CREATE POLICY "Drivers can accept ready orders"
ON public.delivery_orders
FOR UPDATE
TO authenticated
USING (
  (status = ANY (ARRAY['pending'::text, 'ready_for_driver'::text]))
  AND driver_id IS NULL
  AND (public.has_role(auth.uid(), 'driver') OR public.has_role(auth.uid(), 'delivery'))
)
WITH CHECK (
  status = 'driver_assigned'
  AND driver_id IS NOT NULL
  AND driver_id = (SELECT id FROM public.drivers WHERE user_id = auth.uid() LIMIT 1)
);

-- 2. Fix site_visits: drop the overly permissive insert policy
DROP POLICY IF EXISTS "Authenticated users can insert own visits" ON public.site_visits;

-- 3. Fix realtime api-sync wildcard: drop old and create role-restricted policy
DROP POLICY IF EXISTS "Allow api-sync broadcast" ON realtime.messages;

CREATE POLICY "Allow api-sync broadcast for admin/agent"
ON realtime.messages
FOR ALL
TO authenticated
USING (
  realtime.topic() LIKE 'api-sync-%'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'))
)
WITH CHECK (
  realtime.topic() LIKE 'api-sync-%'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'))
);
