
-- Community chat messages table
CREATE TABLE public.community_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- User mute table for moderation
CREATE TABLE public.community_mutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  muted_by uuid NOT NULL,
  reason text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Driver reward points table
CREATE TABLE public.driver_reward_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  points integer NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_mutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_reward_points ENABLE ROW LEVEL SECURITY;

-- Community messages policies
CREATE POLICY "Anyone authenticated can read community messages"
  ON public.community_messages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Non-muted users can post messages"
  ON public.community_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    NOT EXISTS (SELECT 1 FROM public.community_mutes WHERE community_mutes.user_id = auth.uid())
  );

CREATE POLICY "Admins can delete community messages"
  ON public.community_messages FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Community mutes policies
CREATE POLICY "Admins can manage mutes"
  ON public.community_mutes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can manage mutes"
  ON public.community_mutes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'agent'::app_role))
  WITH CHECK (has_role(auth.uid(), 'agent'::app_role));

CREATE POLICY "Anyone can check mute status"
  ON public.community_mutes FOR SELECT TO authenticated USING (true);

-- Driver reward points policies
CREATE POLICY "Admins can manage reward points"
  ON public.driver_reward_points FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Drivers can view own points"
  ON public.driver_reward_points FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert points"
  ON public.driver_reward_points FOR INSERT TO authenticated
  WITH CHECK (true);

-- Enable realtime for community messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;
