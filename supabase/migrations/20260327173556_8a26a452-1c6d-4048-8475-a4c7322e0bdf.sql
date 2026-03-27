-- Enable realtime for remaining critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_center;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_packages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.commission_rates;