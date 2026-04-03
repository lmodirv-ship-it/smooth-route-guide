
-- 1. Fix face_auth_attempts: restrict to own email
DROP POLICY IF EXISTS "Users can insert own face auth attempts" ON public.face_auth_attempts;

CREATE POLICY "Users can insert own face auth attempts"
  ON public.face_auth_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    target_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- 2. Fix recharge_chat_messages: restrict to participants only
DROP POLICY IF EXISTS "Participants can send recharge chat" ON public.recharge_chat_messages;

CREATE POLICY "Participants can send recharge chat"
  ON public.recharge_chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.wallet_recharge_requests r
      WHERE r.id = request_id
        AND (r.user_id = auth.uid() OR r.handled_by = auth.uid())
    )
  );
