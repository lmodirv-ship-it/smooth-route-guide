CREATE TABLE IF NOT EXISTS public.ai_tool_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'read',
  risk text NOT NULL DEFAULT 'low',
  is_enabled boolean NOT NULL DEFAULT true,
  auto_execute boolean NOT NULL DEFAULT false,
  daily_limit integer NOT NULL DEFAULT 50,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_tool_permissions TO authenticated;
GRANT ALL ON public.ai_tool_permissions TO service_role;

ALTER TABLE public.ai_tool_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage ai tool permissions" ON public.ai_tool_permissions;
CREATE POLICY "Admins manage ai tool permissions"
ON public.ai_tool_permissions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_ai_tool_permissions_updated ON public.ai_tool_permissions;
CREATE TRIGGER trg_ai_tool_permissions_updated
BEFORE UPDATE ON public.ai_tool_permissions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- write operations must never be auto-executed
CREATE OR REPLACE FUNCTION public.guard_ai_tool_auto_execute()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.kind <> 'read' THEN
    NEW.auto_execute := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_tool_guard_auto ON public.ai_tool_permissions;
CREATE TRIGGER trg_ai_tool_guard_auto
BEFORE INSERT OR UPDATE ON public.ai_tool_permissions
FOR EACH ROW EXECUTE FUNCTION public.guard_ai_tool_auto_execute();

-- pending operations metadata on the existing assistant commands table
ALTER TABLE public.smart_assistant_commands
  ADD COLUMN IF NOT EXISTS chat_id uuid,
  ADD COLUMN IF NOT EXISTS tool_name text,
  ADD COLUMN IF NOT EXISTS tool_args jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tool_result jsonb,
  ADD COLUMN IF NOT EXISTS executed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_sac_chat_id ON public.smart_assistant_commands (chat_id);