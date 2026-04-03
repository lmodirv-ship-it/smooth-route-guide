
-- Communication logs table for SMS and calls via Twilio
CREATE TABLE public.twilio_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  direction TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  comm_type TEXT NOT NULL CHECK (comm_type IN ('sms', 'call', 'whatsapp')),
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  twilio_sid TEXT,
  duration_seconds INTEGER,
  cost NUMERIC(10,4),
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.twilio_communications ENABLE ROW LEVEL SECURITY;

-- Admins can see all communications
CREATE POLICY "Admins can manage all communications"
ON public.twilio_communications
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Agents can view communications
CREATE POLICY "Agents can view communications"
ON public.twilio_communications
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'agent'::public.app_role));

-- Users can see their own communications
CREATE POLICY "Users can view own communications"
ON public.twilio_communications
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_twilio_comms_user ON public.twilio_communications(user_id);
CREATE INDEX idx_twilio_comms_type_status ON public.twilio_communications(comm_type, status);
CREATE INDEX idx_twilio_comms_created ON public.twilio_communications(created_at DESC);
