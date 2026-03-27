
-- Agent sessions table for tracking login/logout and activity
CREATE TABLE public.agent_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_code text NOT NULL DEFAULT '',
  login_at timestamp with time zone NOT NULL DEFAULT now(),
  logout_at timestamp with time zone,
  status text NOT NULL DEFAULT 'online',
  ip_address text,
  user_agent text,
  actions_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins can manage agent_sessions" ON public.agent_sessions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Agents can view and manage own sessions
CREATE POLICY "Agents can manage own sessions" ON public.agent_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Moderators can view all sessions
CREATE POLICY "Moderators can view agent_sessions" ON public.agent_sessions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'moderator'::app_role));

-- Smart assistant can view sessions
CREATE POLICY "Smart assistant can view agent_sessions" ON public.agent_sessions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'smart_admin_assistant'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_sessions;
