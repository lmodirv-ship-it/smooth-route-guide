-- Add remaining tables to realtime publication (skip already-added ones)
DO $$
DECLARE
  tbl TEXT;
  tables_to_add TEXT[] := ARRAY[
    'delivery_orders','drivers','trips','app_settings',
    'driver_subscriptions','customer_subscriptions','wallet',
    'notifications','alerts','earnings','commission_rates'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_to_add LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;