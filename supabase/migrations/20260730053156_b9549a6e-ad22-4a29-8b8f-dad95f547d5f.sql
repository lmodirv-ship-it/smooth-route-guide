-- ============================================================
-- 1) delivery_orders: narrow agent access to customer PII
-- ============================================================

-- This policy granted agents FULL (ALL) access to every delivery order,
-- including completed/historical orders containing customer PII.
DROP POLICY IF EXISTS "Admins manage all delivery orders" ON public.delivery_orders;

-- Admin-only replacement (with proper WITH CHECK)
DROP POLICY IF EXISTS "Admins can manage all delivery orders" ON public.delivery_orders;
CREATE POLICY "Admins can manage all delivery orders"
ON public.delivery_orders
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Agents: only operationally-relevant orders (in progress, recent)
DROP POLICY IF EXISTS "Agents can view active delivery orders" ON public.delivery_orders;
CREATE POLICY "Agents can view active delivery orders"
ON public.delivery_orders
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'agent'::app_role)
  AND status <> ALL (ARRAY['delivered','cancelled','completed','refunded','failed'])
  AND created_at > (now() - interval '7 days')
);

DROP POLICY IF EXISTS "Agents can update delivery orders" ON public.delivery_orders;
CREATE POLICY "Agents can update delivery orders"
ON public.delivery_orders
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'agent'::app_role)
  AND status <> ALL (ARRAY['delivered','cancelled','completed','refunded','failed'])
  AND created_at > (now() - interval '7 days')
)
WITH CHECK (public.has_role(auth.uid(), 'agent'::app_role));

-- ============================================================
-- 2) hn_stock_products: hide internal fields from anonymous users
-- ============================================================
REVOKE SELECT ON public.hn_stock_products FROM anon;
GRANT SELECT (id, name, description, price, image_url, marketplace_listed, created_at)
  ON public.hn_stock_products TO anon;

-- ============================================================
-- 3) menu_items / menu_categories: public catalog limited to confirmed stores
-- ============================================================
DROP POLICY IF EXISTS "Public can view active categories" ON public.menu_categories;
CREATE POLICY "Public can view active categories"
ON public.menu_categories
FOR SELECT
TO anon
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = menu_categories.store_id AND s.is_confirmed = true
  )
);

DROP POLICY IF EXISTS "Anyone can view active categories" ON public.menu_categories;
CREATE POLICY "Anyone can view active categories"
ON public.menu_categories
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = menu_categories.store_id AND s.is_confirmed = true
  )
);

DROP POLICY IF EXISTS "Public can view available items" ON public.menu_items;
CREATE POLICY "Public can view available items"
ON public.menu_items
FOR SELECT
TO anon
USING (
  is_available = true
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = menu_items.store_id AND s.is_confirmed = true
  )
);

DROP POLICY IF EXISTS "Anyone can view available items" ON public.menu_items;
CREATE POLICY "Anyone can view available items"
ON public.menu_items
FOR SELECT
TO authenticated
USING (
  is_available = true
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = menu_items.store_id AND s.is_confirmed = true
  )
);