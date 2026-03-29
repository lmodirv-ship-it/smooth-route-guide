
-- Table to track face-based presence intervals for agents
CREATE TABLE public.agent_presence_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid REFERENCES public.agent_sessions(id) ON DELETE CASCADE,
  present_start timestamptz NOT NULL DEFAULT now(),
  present_end timestamptz,
  duration_seconds integer GENERATED ALWAYS AS (
    CASE WHEN present_end IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (present_end - present_start))::integer 
    ELSE NULL END
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_presence_log ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins can manage presence_log" ON public.agent_presence_log
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Agents can manage own presence
CREATE POLICY "Agents can manage own presence" ON public.agent_presence_log
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Moderators can view
CREATE POLICY "Moderators can view presence_log" ON public.agent_presence_log
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'moderator'::app_role));
