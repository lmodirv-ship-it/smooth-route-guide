
-- Add prospect_code column
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS prospect_code TEXT UNIQUE;

-- Generate codes for existing rows that don't have one
UPDATE public.prospects
SET prospect_code = 'P' || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0')
WHERE prospect_code IS NULL;

-- Create trigger to auto-generate prospect_code
CREATE OR REPLACE FUNCTION public.auto_generate_prospect_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  IF NEW.prospect_code IS NULL OR NEW.prospect_code = '' THEN
    LOOP
      v_code := 'P' || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0');
      SELECT NOT EXISTS(SELECT 1 FROM public.prospects WHERE prospect_code = v_code) INTO v_exists;
      EXIT WHEN v_exists;
    END LOOP;
    NEW.prospect_code := v_code;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_prospect_code ON public.prospects;
CREATE TRIGGER trg_auto_prospect_code
  BEFORE INSERT ON public.prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_prospect_code();
