-- Enable REPLICA IDENTITY FULL for realtime RLS-filtered subscriptions
ALTER TABLE public.delivery_orders REPLICA IDENTITY FULL;
ALTER TABLE public.drivers REPLICA IDENTITY FULL;