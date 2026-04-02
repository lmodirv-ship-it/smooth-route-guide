
-- Add referral_code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- Generate referral codes for existing users that don't have one
UPDATE public.profiles 
SET referral_code = 'REF' || UPPER(SUBSTRING(id::text, 1, 6))
WHERE referral_code IS NULL;

-- Referrals table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  referral_code text NOT NULL,
  reward_amount numeric NOT NULL DEFAULT 5,
  reward_given boolean DEFAULT false,
  status text NOT NULL DEFAULT 'pending', -- pending, completed, expired
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(referred_id) -- each user can only be referred once
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can see their own referrals (as referrer or referred)
CREATE POLICY "Users can view own referrals"
ON public.referrals FOR SELECT
TO authenticated
USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- System can insert referrals
CREATE POLICY "Authenticated users can create referrals"
ON public.referrals FOR INSERT
TO authenticated
WITH CHECK (referred_id = auth.uid());

-- Admins can view and manage all referrals
CREATE POLICY "Admins can manage referrals"
ON public.referrals FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Auto-generate referral code for new profiles
CREATE OR REPLACE FUNCTION public.auto_generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code text;
BEGIN
  IF NEW.referral_code IS NULL THEN
    v_code := 'REF' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 6));
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_code) LOOP
      v_code := 'REF' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 6));
    END LOOP;
    NEW.referral_code := v_code;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_referral_code();
