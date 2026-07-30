CREATE TABLE IF NOT EXISTS public.ai_chat_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  skin_id text NOT NULL DEFAULT 'classic',
  color_mode text NOT NULL DEFAULT 'system',
  custom jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_chat_preferences TO authenticated;
GRANT ALL ON public.ai_chat_preferences TO service_role;

ALTER TABLE public.ai_chat_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own chat preferences" ON public.ai_chat_preferences;
CREATE POLICY "Users manage own chat preferences"
ON public.ai_chat_preferences FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_ai_chat_preferences_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_chat_preferences_updated_at ON public.ai_chat_preferences;
CREATE TRIGGER trg_ai_chat_preferences_updated_at
BEFORE UPDATE ON public.ai_chat_preferences
FOR EACH ROW EXECUTE FUNCTION public.set_ai_chat_preferences_updated_at();