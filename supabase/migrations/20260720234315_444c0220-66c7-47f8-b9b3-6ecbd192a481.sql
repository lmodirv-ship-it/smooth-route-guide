DROP POLICY IF EXISTS "Public read warehouses" ON public.hn_stock_warehouses;
REVOKE SELECT ON public.hn_stock_warehouses FROM anon;
GRANT SELECT ON public.hn_stock_warehouses TO authenticated;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='hn_stock_warehouses'
      AND policyname='Authenticated users can view warehouses'
  ) THEN
    CREATE POLICY "Authenticated users can view warehouses"
      ON public.hn_stock_warehouses FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;