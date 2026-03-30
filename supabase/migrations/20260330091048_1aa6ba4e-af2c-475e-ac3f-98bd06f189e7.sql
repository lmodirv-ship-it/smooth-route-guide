-- 1. Remove agent access to biometric data (already dropped by previous partial migration? re-drop safely)
DROP POLICY IF EXISTS "Agents can view face auth attempts" ON public.face_auth_attempts;

-- 2. Secure customer subscription creation - force pending status
DROP POLICY IF EXISTS "Users can create own subscriptions" ON public.customer_subscriptions;
DROP POLICY IF EXISTS "Users can create own subscriptions with pending status" ON public.customer_subscriptions;
CREATE POLICY "Users can create own subscriptions with pending status"
ON public.customer_subscriptions FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND status = 'pending'
);

-- Secure driver subscription creation - force pending payment
DROP POLICY IF EXISTS "Drivers can create subscriptions" ON public.driver_subscriptions;
DROP POLICY IF EXISTS "Drivers can create subscriptions with pending status" ON public.driver_subscriptions;
CREATE POLICY "Drivers can create subscriptions with pending status"
ON public.driver_subscriptions FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND status = 'pending'
  AND payment_status = 'pending'
);

-- 3. Secure restaurant images storage
DROP POLICY IF EXISTS "Authenticated users can upload restaurant images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update restaurant images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete restaurant images" ON storage.objects;

CREATE POLICY "Store owners and admins can upload restaurant images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'restaurant-images' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    public.has_role(auth.uid(), 'agent'::public.app_role) OR
    public.has_role(auth.uid(), 'store_owner'::public.app_role)
  )
);

CREATE POLICY "Store owners and admins can update restaurant images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'restaurant-images' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    public.has_role(auth.uid(), 'agent'::public.app_role) OR
    public.has_role(auth.uid(), 'store_owner'::public.app_role)
  )
);

CREATE POLICY "Store owners and admins can delete restaurant images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'restaurant-images' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    public.has_role(auth.uid(), 'agent'::public.app_role) OR
    public.has_role(auth.uid(), 'store_owner'::public.app_role)
  )
);