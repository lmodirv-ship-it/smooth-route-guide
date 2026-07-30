CREATE TABLE public.ai_quick_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  prompt text NOT NULL,
  icon text NOT NULL DEFAULT 'Sparkle',
  sort_order integer NOT NULL DEFAULT 0,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_quick_commands TO authenticated;
GRANT ALL ON public.ai_quick_commands TO service_role;

ALTER TABLE public.ai_quick_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read quick commands"
ON public.ai_quick_commands FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage quick commands"
ON public.ai_quick_commands FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_ai_quick_commands_updated_at
BEFORE UPDATE ON public.ai_quick_commands
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();