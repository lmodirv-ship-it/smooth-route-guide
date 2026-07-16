
-- 1) call_signals: drop loose insert policy
DROP POLICY IF EXISTS "Participants can insert call signals" ON public.call_signals;

-- 2) payment_transactions: force safe defaults on user-originated inserts
CREATE OR REPLACE FUNCTION public.enforce_payment_transaction_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    NEW.status := 'pending';
    NEW.completed_at := NULL;
    NEW.stripe_payment_intent_id := NULL;
    NEW.stripe_charge_id := NULL;
    NEW.paypal_order_id := NULL;
    NEW.paypal_payer_id := NULL;
    NEW.failure_reason := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_payment_transaction_insert ON public.payment_transactions;
CREATE TRIGGER trg_enforce_payment_transaction_insert
  BEFORE INSERT ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_payment_transaction_insert();

-- Also prevent users from flipping status/provider fields via UPDATE
CREATE OR REPLACE FUNCTION public.enforce_payment_transaction_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
       OR NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id
       OR NEW.stripe_charge_id IS DISTINCT FROM OLD.stripe_charge_id
       OR NEW.paypal_order_id IS DISTINCT FROM OLD.paypal_order_id
       OR NEW.paypal_payer_id IS DISTINCT FROM OLD.paypal_payer_id
       OR NEW.provider IS DISTINCT FROM OLD.provider THEN
      RAISE EXCEPTION 'payment_transaction_protected_fields'
        USING HINT = 'Only admins/service role may change status, amount, or provider fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_payment_transaction_update ON public.payment_transactions;
CREATE TRIGGER trg_enforce_payment_transaction_update
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_payment_transaction_update();

-- 3) reward_stars: users can only insert an empty row for themselves; only admin/agent can seed values
DROP POLICY IF EXISTS "System insert stars" ON public.reward_stars;

CREATE POLICY "Users create empty own reward row"
  ON public.reward_stars
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.enforce_reward_stars_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role)
     AND NOT public.has_role(auth.uid(), 'agent'::public.app_role) THEN
    NEW.stars := 0;
    NEW.total_earned := 0;
    NEW.level := 'bronze';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_reward_stars_insert ON public.reward_stars;
CREATE TRIGGER trg_enforce_reward_stars_insert
  BEFORE INSERT ON public.reward_stars
  FOR EACH ROW EXECUTE FUNCTION public.enforce_reward_stars_insert();

-- Prevent users from raising their own stars via UPDATE
CREATE OR REPLACE FUNCTION public.enforce_reward_stars_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role)
     AND NOT public.has_role(auth.uid(), 'agent'::public.app_role) THEN
    IF NEW.stars IS DISTINCT FROM OLD.stars
       OR NEW.total_earned IS DISTINCT FROM OLD.total_earned
       OR NEW.level IS DISTINCT FROM OLD.level THEN
      RAISE EXCEPTION 'reward_stars_protected_fields'
        USING HINT = 'Only admins/agents can change reward star values';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_reward_stars_update ON public.reward_stars;
CREATE TRIGGER trg_enforce_reward_stars_update
  BEFORE UPDATE ON public.reward_stars
  FOR EACH ROW EXECUTE FUNCTION public.enforce_reward_stars_update();

-- 4) coupon_usages: recompute discount server-side and enforce per-user limit
CREATE OR REPLACE FUNCTION public.enforce_coupon_usage_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon RECORD;
  v_user_uses INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_coupon FROM public.coupons WHERE id = NEW.coupon_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'coupon_not_found';
  END IF;

  IF NOT COALESCE(v_coupon.is_active, false) THEN
    RAISE EXCEPTION 'coupon_inactive';
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RAISE EXCEPTION 'coupon_expired';
  END IF;

  IF v_coupon.max_uses > 0 AND v_coupon.current_uses >= v_coupon.max_uses THEN
    RAISE EXCEPTION 'coupon_max_uses_reached';
  END IF;

  SELECT COUNT(*) INTO v_user_uses
  FROM public.coupon_usages
  WHERE coupon_id = NEW.coupon_id AND user_id = NEW.user_id;

  IF COALESCE(v_coupon.max_uses_per_user, 1) > 0
     AND v_user_uses >= COALESCE(v_coupon.max_uses_per_user, 1) THEN
    RAISE EXCEPTION 'coupon_user_limit_reached';
  END IF;

  -- Recompute discount server-side; cap for percentage type
  IF v_coupon.discount_type = 'percentage' THEN
    -- Without order context we cap discount by max_discount if provided, else set to 0
    NEW.discount_amount := LEAST(
      COALESCE(NEW.discount_amount, 0),
      COALESCE(v_coupon.max_discount, COALESCE(NEW.discount_amount, 0))
    );
  ELSE
    -- fixed: force to coupon's discount_value
    NEW.discount_amount := COALESCE(v_coupon.discount_value, 0);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_coupon_usage_insert ON public.coupon_usages;
CREATE TRIGGER trg_enforce_coupon_usage_insert
  BEFORE INSERT ON public.coupon_usages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_coupon_usage_insert();
