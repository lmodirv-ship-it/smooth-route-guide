
-- ============= app_settings: protect sensitive keys =============
DROP POLICY IF EXISTS "Anyone can read settings" ON public.app_settings;

CREATE POLICY "Authenticated can read non-sensitive settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (
  key NOT IN (
    'api_keys',
    'custom_api_keys',
    'stripe_secret_key',
    'paypal_secret_key',
    'twilio_api_key',
    'mailbluster_api_key',
    'google_maps_api_key',
    'lovable_api_key'
  )
);

-- ============= face_auth_attempts: remove agent access to biometric data =============
DROP POLICY IF EXISTS "Agents can view face_auth_attempts" ON public.face_auth_attempts;
DROP POLICY IF EXISTS "Only admins and agents can view face_auth_attempts" ON public.face_auth_attempts;

-- Admin-only SELECT remains via existing "Admins can view attempts" policy

-- ============= twilio_communications: remove agent access to phone numbers / message content =============
DROP POLICY IF EXISTS "Agents can view communications" ON public.twilio_communications;

-- Admin SELECT remains via "Admins can manage all communications"
-- User own-record SELECT remains via existing user policy

-- ============= realtime.messages: tighten broadcast/presence to user-scoped topics =============
DROP POLICY IF EXISTS "Users can only access own channels" ON realtime.messages;

CREATE POLICY "Users can only access own channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- User-scoped topics (topic contains the user id)
  realtime.topic() LIKE ('%' || (auth.uid())::text || '%')
  -- Admin/agent api-sync channels
  OR (realtime.topic() LIKE 'api-sync-%' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role)))
  -- Public broadcast channels (explicit allowlist)
  OR realtime.topic() LIKE 'public-%'
);

-- ============= storage: restaurant-images path-based ownership =============
DROP POLICY IF EXISTS "Store owners and admins can upload restaurant images" ON storage.objects;
DROP POLICY IF EXISTS "Store owners and admins can update restaurant images" ON storage.objects;
DROP POLICY IF EXISTS "Store owners and admins can delete restaurant images" ON storage.objects;

-- Public read is fine (bucket is public). Writes scoped by ownership.
CREATE POLICY "Restaurant images: owners write own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'restaurant-images'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'agent'::app_role)
    OR (
      has_role(auth.uid(), 'store_owner'::app_role)
      AND (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.stores WHERE owner_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Restaurant images: owners update own folder"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'restaurant-images'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'agent'::app_role)
    OR (
      has_role(auth.uid(), 'store_owner'::app_role)
      AND (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.stores WHERE owner_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Restaurant images: owners delete own folder"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'restaurant-images'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'agent'::app_role)
    OR (
      has_role(auth.uid(), 'store_owner'::app_role)
      AND (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.stores WHERE owner_id = auth.uid()
      )
    )
  )
);
