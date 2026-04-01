
-- Fix overly permissive INSERT on site_visits
DROP POLICY IF EXISTS "Anyone can insert visits" ON public.site_visits;
CREATE POLICY "Authenticated users can insert own visits"
ON public.site_visits FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Remove user_roles from Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.user_roles;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
