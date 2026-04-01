
-- 1. Remove sensitive tables from Realtime (no IF EXISTS syntax)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.site_visits;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.call_logs;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2. Fix call_notes: restrict SELECT to agents/admins only
DROP POLICY IF EXISTS "Agents can read all call_notes" ON public.call_notes;
CREATE POLICY "Agents and admins can read call_notes"
ON public.call_notes FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'agent') OR public.has_role(auth.uid(), 'admin')
);

-- 3. Fix face_auth_attempts: ensure only admins/agents can SELECT
DROP POLICY IF EXISTS "Admins and agents can view attempts" ON public.face_auth_attempts;
DROP POLICY IF EXISTS "Anyone can read face_auth_attempts" ON public.face_auth_attempts;
CREATE POLICY "Only admins and agents can view face_auth_attempts"
ON public.face_auth_attempts FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'agent') OR public.has_role(auth.uid(), 'admin')
);

-- 4. Fix api_rate_limits: block user writes
DROP POLICY IF EXISTS "rate_limits_no_user_write" ON public.api_rate_limits;
CREATE POLICY "rate_limits_no_user_write"
ON public.api_rate_limits FOR INSERT TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "rate_limits_no_user_update" ON public.api_rate_limits;
CREATE POLICY "rate_limits_no_user_update"
ON public.api_rate_limits FOR UPDATE TO authenticated
USING (false);

DROP POLICY IF EXISTS "rate_limits_no_user_delete" ON public.api_rate_limits;
CREATE POLICY "rate_limits_no_user_delete"
ON public.api_rate_limits FOR DELETE TO authenticated
USING (false);
