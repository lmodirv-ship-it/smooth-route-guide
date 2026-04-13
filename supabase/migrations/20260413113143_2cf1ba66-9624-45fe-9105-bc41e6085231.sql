
-- =============================================
-- 1. FIX: hn_stock_shipments — replace permissive policies
-- =============================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view shipments" ON public.hn_stock_shipments;
DROP POLICY IF EXISTS "Authenticated users can create shipments" ON public.hn_stock_shipments;
DROP POLICY IF EXISTS "Authenticated users can update shipments" ON public.hn_stock_shipments;

-- Admin full access
CREATE POLICY "Admin full access on hn_stock_shipments"
ON public.hn_stock_shipments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Merchants can view shipments for their own orders
CREATE POLICY "Merchant view own shipments"
ON public.hn_stock_shipments
FOR SELECT
TO authenticated
USING (
  order_id IN (
    SELECT o.id FROM public.hn_stock_orders o
    WHERE o.merchant_id IN (
      SELECT m.id FROM public.hn_stock_merchants m WHERE m.user_id = auth.uid()
    )
  )
);

-- Merchants can create shipments for their own orders
CREATE POLICY "Merchant create own shipments"
ON public.hn_stock_shipments
FOR INSERT
TO authenticated
WITH CHECK (
  order_id IN (
    SELECT o.id FROM public.hn_stock_orders o
    WHERE o.merchant_id IN (
      SELECT m.id FROM public.hn_stock_merchants m WHERE m.user_id = auth.uid()
    )
  )
);

-- Drivers can view shipments assigned to them
CREATE POLICY "Driver view assigned shipments"
ON public.hn_stock_shipments
FOR SELECT
TO authenticated
USING (
  driver_id IN (
    SELECT d.id FROM public.hn_stock_drivers d WHERE d.user_id = auth.uid()
  )
);

-- Drivers can update shipments assigned to them (e.g. status)
CREATE POLICY "Driver update assigned shipments"
ON public.hn_stock_shipments
FOR UPDATE
TO authenticated
USING (
  driver_id IN (
    SELECT d.id FROM public.hn_stock_drivers d WHERE d.user_id = auth.uid()
  )
);

-- Agents can view all shipments (for call center)
CREATE POLICY "Agent view shipments"
ON public.hn_stock_shipments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'agent'::app_role));

-- =============================================
-- 2. FIX: hn_stock_merchants — add update own record policy
-- =============================================
CREATE POLICY "Merchant update own record"
ON public.hn_stock_merchants
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- =============================================
-- 3. FIX: Realtime channels — remove public:% pattern
-- =============================================

-- Drop existing overly broad policies
DROP POLICY IF EXISTS "Users can insert to own channels" ON realtime.messages;
DROP POLICY IF EXISTS "Users can only access own channels" ON realtime.messages;

-- Recreate with restricted topic patterns (no public:%)
CREATE POLICY "Users can only access own channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  extension = 'presence'
  OR extension = 'broadcast'
  OR topic ~~ ('%' || auth.uid()::text || '%')
  OR (topic ~~ 'api-sync-%' AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role)))
);

CREATE POLICY "Users can insert to own channels"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  extension = 'presence'
  OR extension = 'broadcast'
  OR topic ~~ ('%' || auth.uid()::text || '%')
  OR (topic ~~ 'api-sync-%' AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role)))
);
