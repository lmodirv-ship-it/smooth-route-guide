-- Internal messaging system between all platform apps
CREATE TABLE public.internal_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_text text DEFAULT '',
  last_message_at timestamptz DEFAULT now()
);

CREATE TABLE public.internal_chat_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.internal_chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  unread_count integer NOT NULL DEFAULT 0,
  UNIQUE(chat_id, user_id)
);

CREATE TABLE public.internal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.internal_chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  message_type text NOT NULL DEFAULT 'text',
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

-- Indexes
CREATE INDEX idx_internal_chat_members_user ON public.internal_chat_members(user_id);
CREATE INDEX idx_internal_chat_members_chat ON public.internal_chat_members(chat_id);
CREATE INDEX idx_internal_messages_chat ON public.internal_messages(chat_id);
CREATE INDEX idx_internal_messages_sender ON public.internal_messages(sender_id);
CREATE INDEX idx_internal_messages_created ON public.internal_messages(created_at DESC);

-- RLS
ALTER TABLE public.internal_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY;

-- Chat policies: members can view their chats
CREATE POLICY "Members can view own chats" ON public.internal_chats
  FOR SELECT TO authenticated
  USING (id IN (SELECT chat_id FROM public.internal_chat_members WHERE user_id = auth.uid()));

-- Admins full access to chats
CREATE POLICY "Admins full access chats" ON public.internal_chats
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Agents can create chats
CREATE POLICY "Agents can create chats" ON public.internal_chats
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'agent'::app_role));

-- Chat members policies
CREATE POLICY "Members can view own memberships" ON public.internal_chat_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Members can view chat memberships" ON public.internal_chat_members
  FOR SELECT TO authenticated
  USING (chat_id IN (SELECT chat_id FROM public.internal_chat_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins full access members" ON public.internal_chat_members
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can add members" ON public.internal_chat_members
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'agent'::app_role));

CREATE POLICY "Members can update own unread" ON public.internal_chat_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Messages policies
CREATE POLICY "Members can view chat messages" ON public.internal_messages
  FOR SELECT TO authenticated
  USING (chat_id IN (SELECT chat_id FROM public.internal_chat_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can send messages" ON public.internal_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    chat_id IN (SELECT chat_id FROM public.internal_chat_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins full access messages" ON public.internal_messages
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_chat_members;