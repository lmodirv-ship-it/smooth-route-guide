-- Add moderator read access to drivers
CREATE POLICY "Moderators can view all drivers"
ON public.drivers FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role));

-- Add moderator read access to stores
CREATE POLICY "Moderators can view all stores"
ON public.stores FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role));

-- Add moderator read access to call_center
CREATE POLICY "Moderators can view call center"
ON public.call_center FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role));

-- Add moderator read access to profiles
CREATE POLICY "Moderators can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role));