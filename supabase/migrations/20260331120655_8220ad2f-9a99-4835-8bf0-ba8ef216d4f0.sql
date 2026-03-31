
-- 1. call_notes table for notes on any call
CREATE TABLE IF NOT EXISTS public.call_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_log_id UUID REFERENCES public.call_logs(id) ON DELETE CASCADE,
  call_session_id UUID REFERENCES public.call_sessions(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.call_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage call_notes"
  ON public.call_notes FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 2. Add reference codes and order linking to call_logs
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS call_reference TEXT;
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS order_id UUID;
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS party_type TEXT DEFAULT 'client';
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS party_reference TEXT;
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS call_session_id UUID REFERENCES public.call_sessions(id);

-- 3. Add agent status tracking
ALTER TABLE public.agent_sessions ADD COLUMN IF NOT EXISTS agent_status TEXT DEFAULT 'available';

-- 4. Auto-generate call reference
CREATE OR REPLACE FUNCTION public.auto_generate_call_reference()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.call_reference IS NULL OR NEW.call_reference = '' THEN
    NEW.call_reference := 'L' || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_call_reference ON public.call_logs;
CREATE TRIGGER trg_call_reference
  BEFORE INSERT ON public.call_logs
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_call_reference();

-- 5. Add call_reference to call_sessions too
ALTER TABLE public.call_sessions ADD COLUMN IF NOT EXISTS call_reference TEXT;
ALTER TABLE public.call_sessions ADD COLUMN IF NOT EXISTS party_type TEXT DEFAULT 'client';
ALTER TABLE public.call_sessions ADD COLUMN IF NOT EXISTS party_reference TEXT;
ALTER TABLE public.call_sessions ADD COLUMN IF NOT EXISTS order_id UUID;
ALTER TABLE public.call_sessions ADD COLUMN IF NOT EXISTS notes TEXT;

-- Auto-generate for call_sessions
CREATE OR REPLACE FUNCTION public.auto_generate_session_call_reference()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.call_reference IS NULL OR NEW.call_reference = '' THEN
    NEW.call_reference := 'L' || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_session_call_reference ON public.call_sessions;
CREATE TRIGGER trg_session_call_reference
  BEFORE INSERT ON public.call_sessions
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_session_call_reference();

-- 6. Enable realtime for call_sessions and call_notes
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_notes;
