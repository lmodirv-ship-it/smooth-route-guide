
-- Fix RLS: restrict call_notes to the agent who created them or admins
DROP POLICY IF EXISTS "Authenticated users can manage call_notes" ON public.call_notes;

CREATE POLICY "Agents can read all call_notes"
  ON public.call_notes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Agents can insert own call_notes"
  ON public.call_notes FOR INSERT TO authenticated
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update own call_notes"
  ON public.call_notes FOR UPDATE TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Admins can delete call_notes"
  ON public.call_notes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
