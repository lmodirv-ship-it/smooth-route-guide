-- Fix: the "Users can view own roles" already exists, skip it
-- Only apply the remaining fixes

-- 2. Fix profiles INSERT policy  
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- 3. Fix wallet INSERT policy
DROP POLICY IF EXISTS "Users can insert own wallet" ON public.wallet;
CREATE POLICY "Users can insert own wallet"
ON public.wallet FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. Fix notifications INSERT
DROP POLICY IF EXISTS "Admins agents can insert notifications" ON public.notifications;
CREATE POLICY "Admins agents can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'agent'::app_role)
);

-- 5. Fix ride_requests driver update policy
DROP POLICY IF EXISTS "Drivers can update pending requests" ON public.ride_requests;
CREATE POLICY "Drivers can update pending requests"
ON public.ride_requests FOR UPDATE TO authenticated
USING (
  status = 'pending' AND has_role(auth.uid(), 'driver'::app_role)
)
WITH CHECK (
  status IN ('accepted', 'rejected')
  AND (
    status = 'rejected'
    OR EXISTS (
      SELECT 1 FROM public.drivers d 
      WHERE d.id = driver_id AND d.user_id = auth.uid()
    )
  )
);