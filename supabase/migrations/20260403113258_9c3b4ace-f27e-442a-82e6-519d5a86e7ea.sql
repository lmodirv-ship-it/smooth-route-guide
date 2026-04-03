
-- Function to complete referral and grant rewards
CREATE OR REPLACE FUNCTION public.complete_referral_reward()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_referral RECORD;
BEGIN
  -- Get the user who completed the trip/order
  v_user_id := NEW.user_id;
  
  -- Only process completed trips/orders
  IF TG_TABLE_NAME = 'trips' AND NEW.status != 'completed' THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'delivery_orders' AND NEW.status != 'delivered' THEN RETURN NEW; END IF;
  
  -- Find pending referral for this user
  SELECT * INTO v_referral
  FROM public.referrals
  WHERE referred_id = v_user_id AND status = 'pending' AND reward_given = false
  LIMIT 1;
  
  IF NOT FOUND THEN RETURN NEW; END IF;
  
  -- Grant reward to both referrer and referred
  UPDATE public.wallet SET balance = balance + v_referral.reward_amount WHERE user_id = v_referral.referrer_id;
  UPDATE public.wallet SET balance = balance + v_referral.reward_amount WHERE user_id = v_referral.referred_id;
  
  -- Mark referral as completed
  UPDATE public.referrals SET status = 'completed', reward_given = true, completed_at = now() WHERE id = v_referral.id;
  
  RETURN NEW;
END;
$$;

-- Trigger on trips completion
CREATE TRIGGER trg_referral_on_trip_complete
  AFTER UPDATE OF status ON public.trips
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION public.complete_referral_reward();

-- Trigger on delivery order completion  
CREATE TRIGGER trg_referral_on_delivery_complete
  AFTER UPDATE OF status ON public.delivery_orders
  FOR EACH ROW
  WHEN (NEW.status = 'delivered')
  EXECUTE FUNCTION public.complete_referral_reward();
