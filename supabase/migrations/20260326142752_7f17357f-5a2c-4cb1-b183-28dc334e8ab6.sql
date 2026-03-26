
CREATE POLICY "Moderators can view stores" ON public.stores FOR SELECT TO authenticated USING (has_role(auth.uid(), 'moderator'::app_role));
