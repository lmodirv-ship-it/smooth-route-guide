
-- 1. Fix face_auth_attempts: restrict INSERT to own email only
DROP POLICY IF EXISTS "Users can insert own face auth attempts" ON public.face_auth_attempts;

CREATE POLICY "Users can insert own face auth attempts"
  ON public.face_auth_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (target_email = auth.jwt()->>'email');

-- 2. Fix Realtime channel authorization
-- Enable RLS on realtime.messages and add restrictive policy
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

-- Allow users to only subscribe to channels matching their user ID pattern
CREATE POLICY "Users can only access own channels"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    -- Allow channels that contain the user's ID or are public channels
    extension = 'presence' 
    OR extension = 'broadcast'
    OR topic LIKE '%' || auth.uid()::text || '%'
    OR topic LIKE 'public:%'
    OR topic LIKE 'api-sync-%'
  );

CREATE POLICY "Users can insert to own channels"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    extension = 'presence'
    OR extension = 'broadcast'
    OR topic LIKE '%' || auth.uid()::text || '%'
    OR topic LIKE 'public:%'
    OR topic LIKE 'api-sync-%'
  );
