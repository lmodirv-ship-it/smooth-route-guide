
-- ═══════════════════════════════════════════════════
-- Restrict agent (call center) RLS policies
-- Agents can: view orders, update status, view customers, view drivers
-- Agents cannot: delete orders, change prices, manage users/roles/settings
-- ═══════════════════════════════════════════════════

-- 1. delivery_orders: Replace ALL with SELECT + UPDATE only (no INSERT/DELETE)
DROP POLICY IF EXISTS "Agents can manage delivery orders" ON public.delivery_orders;
CREATE POLICY "Agents can view delivery orders" ON public.delivery_orders
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'agent'::app_role));

CREATE POLICY "Agents can update delivery orders" ON public.delivery_orders
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'agent'::app_role));

-- 2. stores: Replace ALL with SELECT only (no price/data modification)
DROP POLICY IF EXISTS "Agents can manage stores" ON public.stores;
CREATE POLICY "Agents can view stores" ON public.stores
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'agent'::app_role));

-- 3. menu_categories: Replace ALL with SELECT only
DROP POLICY IF EXISTS "Agents can manage categories" ON public.menu_categories;
CREATE POLICY "Agents can view categories" ON public.menu_categories
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'agent'::app_role));

-- 4. menu_items: Replace ALL with SELECT only (no price editing)
DROP POLICY IF EXISTS "Agents can manage items" ON public.menu_items;
CREATE POLICY "Agents can view items" ON public.menu_items
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'agent'::app_role));

-- 5. ride_requests: Add agent SELECT on all statuses + UPDATE for status tracking
CREATE POLICY "Agents can view all ride requests" ON public.ride_requests
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'agent'::app_role));

CREATE POLICY "Agents can update ride requests" ON public.ride_requests
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'agent'::app_role));

-- 6. drivers: Add agent SELECT on all drivers (for tracking)
CREATE POLICY "Agents can view all drivers" ON public.drivers
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'agent'::app_role));

-- 7. import_logs: Replace ALL with SELECT only (view logs, no import management)
DROP POLICY IF EXISTS "Agents can manage import_logs" ON public.import_logs;
CREATE POLICY "Agents can view import_logs" ON public.import_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'agent'::app_role));
