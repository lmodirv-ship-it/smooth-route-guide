
-- Add PayPal columns to payment_transactions
ALTER TABLE public.payment_transactions 
  ADD COLUMN IF NOT EXISTS paypal_order_id text,
  ADD COLUMN IF NOT EXISTS paypal_payer_id text;

-- Add approved_by to wallet_transactions
ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS approved_by uuid;

-- Create reward stars system
CREATE TABLE IF NOT EXISTS public.reward_stars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stars integer NOT NULL DEFAULT 0,
  level text NOT NULL DEFAULT 'bronze',
  total_earned integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reward_stars ENABLE ROW LEVEL SECURITY;

-- Unique per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_reward_stars_user ON public.reward_stars(user_id);

-- User can see own stars
CREATE POLICY "Users view own stars" ON public.reward_stars
  FOR SELECT USING (auth.uid() = user_id);

-- Admins/agents can view all
CREATE POLICY "Admins view all stars" ON public.reward_stars
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'agent')
  );

-- Admins can update stars
CREATE POLICY "Admins update stars" ON public.reward_stars
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- System can insert stars (via trigger)
CREATE POLICY "System insert stars" ON public.reward_stars
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Star history log
CREATE TABLE IF NOT EXISTS public.star_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stars_change integer NOT NULL,
  reason text NOT NULL DEFAULT '',
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.star_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own star history" ON public.star_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins view all star history" ON public.star_history
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'agent') OR
    public.has_role(auth.uid(), 'moderator')
  );

CREATE POLICY "Admins insert star history" ON public.star_history
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'agent')
  );

-- Auto-create reward_stars on new user
CREATE OR REPLACE FUNCTION public.auto_create_reward_stars()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.reward_stars (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_reward_stars ON public.profiles;
CREATE TRIGGER trg_auto_reward_stars
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_reward_stars();

-- Enable realtime for payment_transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_transactions;
