
-- Fix overly permissive policy
DROP POLICY "System can insert points" ON public.driver_reward_points;

CREATE POLICY "Agents can insert reward points"
  ON public.driver_reward_points FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'agent'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );
