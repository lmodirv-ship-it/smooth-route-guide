ALTER PUBLICATION supabase_realtime DROP TABLE public.user_roles;
ALTER PUBLICATION supabase_realtime DROP TABLE public.wallet;
ALTER PUBLICATION supabase_realtime DROP TABLE public.earnings;
ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;
ALTER PUBLICATION supabase_realtime DROP TABLE public.agent_sessions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.internal_chats;
ALTER PUBLICATION supabase_realtime DROP TABLE public.internal_messages;
ALTER PUBLICATION supabase_realtime DROP TABLE public.call_sessions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.call_signals;
ALTER PUBLICATION supabase_realtime DROP TABLE public.site_analytics_daily;
ALTER PUBLICATION supabase_realtime DROP TABLE public.customer_subscriptions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.driver_subscriptions;

DROP POLICY IF EXISTS "Anyone can check mute status" ON public.community_mutes;
CREATE POLICY "Users can check own mute status"
  ON public.community_mutes FOR SELECT TO authenticated
  USING (user_id = auth.uid());
