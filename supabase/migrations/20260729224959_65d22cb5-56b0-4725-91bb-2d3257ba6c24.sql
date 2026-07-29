-- payment_transactions: users may only create pending, positive-amount rows for themselves
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.payment_transactions;
CREATE POLICY "Users can insert own pending transactions"
ON public.payment_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND amount > 0
  AND completed_at IS NULL
  AND stripe_payment_intent_id IS NULL
  AND stripe_charge_id IS NULL
  AND paypal_order_id IS NULL
  AND paypal_payer_id IS NULL
);

-- reward_stars: users may only create an empty row for themselves
DROP POLICY IF EXISTS "Users create empty own reward row" ON public.reward_stars;
CREATE POLICY "Users create empty own reward row"
ON public.reward_stars
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND COALESCE(stars, 0) = 0
  AND COALESCE(total_earned, 0) = 0
  AND COALESCE(level, 'bronze') = 'bronze'
);

CREATE POLICY "Admins insert reward rows"
ON public.reward_stars
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role)
);

-- coupon_usages: only for own user and a valid, active coupon; non-negative discount
DROP POLICY IF EXISTS "Users can use coupons" ON public.coupon_usages;
CREATE POLICY "Users can use valid coupons"
ON public.coupon_usages
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND COALESCE(discount_amount, 0) >= 0
  AND EXISTS (
    SELECT 1 FROM public.coupons c
    WHERE c.id = coupon_id
      AND COALESCE(c.is_active, false) = true
      AND (c.expires_at IS NULL OR c.expires_at > now())
  )
);

CREATE POLICY "Admins insert coupon usage"
ON public.coupon_usages
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));