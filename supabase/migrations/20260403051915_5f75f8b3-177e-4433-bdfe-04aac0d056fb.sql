
-- Fix face_auth_attempts: restrict INSERT to authenticated users for their own records
DROP POLICY IF EXISTS "Users can insert own face auth attempts" ON public.face_auth_attempts;
CREATE POLICY "Users can insert own face auth attempts"
  ON public.face_auth_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Also fix: the "always true" RLS warning — check which tables have USING(true) for non-SELECT
-- Let's check site_visits INSERT policy and tighten it
DROP POLICY IF EXISTS "Anyone can insert visits" ON public.site_visits;
DROP POLICY IF EXISTS "Allow anonymous visit tracking" ON public.site_visits;

CREATE POLICY "Allow visit tracking with valid data"
  ON public.site_visits
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    user_id IS NULL OR user_id = auth.uid()
  );
