
-- 1) Tighten agent SELECT on delivery_orders to active orders only
DROP POLICY IF EXISTS "Agents can view delivery orders" ON public.delivery_orders;
CREATE POLICY "Agents can view active delivery orders"
ON public.delivery_orders
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'agent'::app_role)
  AND status NOT IN ('delivered','cancelled','completed','refunded','failed')
);

-- 2) Add driver self-read on hn_stock_drivers (scoped by user_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='hn_stock_drivers' AND column_name='user_id'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Drivers can view own hn_stock_drivers record" ON public.hn_stock_drivers';
    EXECUTE 'CREATE POLICY "Drivers can view own hn_stock_drivers record" ON public.hn_stock_drivers FOR SELECT TO authenticated USING (user_id = auth.uid())';
  END IF;
END$$;
