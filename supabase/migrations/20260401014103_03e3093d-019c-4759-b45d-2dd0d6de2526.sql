
-- Wallet recharge requests table
CREATE TABLE public.wallet_recharge_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  handled_by UUID,
  handler_role TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_recharge_requests ENABLE ROW LEVEL SECURITY;

-- Recharge chat messages
CREATE TABLE public.recharge_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.wallet_recharge_requests(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recharge_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS for wallet_recharge_requests
CREATE POLICY "Users can view own recharge requests" ON public.wallet_recharge_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Users can create own recharge requests" ON public.wallet_recharge_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Staff can update recharge requests" ON public.wallet_recharge_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent') OR public.has_role(auth.uid(), 'moderator'));

-- RLS for recharge_chat_messages
CREATE POLICY "Participants can view recharge chat" ON public.recharge_chat_messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.wallet_recharge_requests r WHERE r.id = request_id AND (r.user_id = auth.uid() OR r.handled_by = auth.uid()))
    OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent') OR public.has_role(auth.uid(), 'moderator')
  );

CREATE POLICY "Participants can send recharge chat" ON public.recharge_chat_messages
  FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());

-- Enable realtime for recharge chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.recharge_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_recharge_requests;
