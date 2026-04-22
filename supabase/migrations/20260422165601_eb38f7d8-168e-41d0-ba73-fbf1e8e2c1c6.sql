ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_count ON public.profiles(referral_count DESC);

-- Increment referrer count when a referral is completed
CREATE OR REPLACE FUNCTION public.bump_referrer_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    UPDATE public.profiles SET referral_count = referral_count + 1 WHERE id = NEW.referrer_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_referrer_count ON public.referrals;
CREATE TRIGGER trg_bump_referrer_count AFTER INSERT OR UPDATE ON public.referrals
FOR EACH ROW EXECUTE FUNCTION public.bump_referrer_count();