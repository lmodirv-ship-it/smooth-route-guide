
-- Remove sensitive tables from Realtime publication safely
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'wallet', 'payment_transactions', 'call_sessions', 'call_signals',
    'recharge_chat_messages', 'customer_subscriptions', 'driver_subscriptions', 'internal_messages'
  ])
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', tbl);
    END IF;
  END LOOP;
END;
$$;
