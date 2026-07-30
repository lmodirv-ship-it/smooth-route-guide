-- 1) blog_ratings: remove public exposure of user_id linkage
DROP POLICY IF EXISTS "Anyone can read ratings" ON public.blog_ratings;

CREATE POLICY "Users can view their own rating"
ON public.blog_ratings FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all ratings"
ON public.blog_ratings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.get_blog_rating_summary(_post_id uuid)
RETURNS TABLE(post_id uuid, avg_score numeric, ratings_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _post_id,
         COALESCE(ROUND(AVG(r.score)::numeric, 2), 0),
         COUNT(*)::int
  FROM public.blog_ratings r
  WHERE r.post_id = _post_id
$$;

GRANT EXECUTE ON FUNCTION public.get_blog_rating_summary(uuid) TO anon, authenticated;

-- 2) coupons: stop exposing all active coupon codes
DROP POLICY IF EXISTS "Users can view active coupons" ON public.coupons;

REVOKE SELECT ON public.coupons FROM anon;

CREATE OR REPLACE FUNCTION public.validate_coupon(_code text, _order_amount numeric DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.coupons%ROWTYPE;
  used_by_user int;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'unauthorized');
  END IF;

  SELECT * INTO c FROM public.coupons
  WHERE upper(code) = upper(trim(_code))
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;

  IF COALESCE(c.max_uses, 0) > 0 AND COALESCE(c.current_uses, 0) >= c.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'exhausted');
  END IF;

  SELECT COUNT(*) INTO used_by_user FROM public.coupon_usages
  WHERE coupon_id = c.id AND user_id = auth.uid();

  IF COALESCE(c.max_uses_per_user, 1) > 0 AND used_by_user >= c.max_uses_per_user THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'user_limit_reached');
  END IF;

  IF COALESCE(_order_amount, 0) < COALESCE(c.min_order_amount, 0) THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'min_order_amount', 'min_order_amount', c.min_order_amount);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'coupon_id', c.id,
    'discount_type', c.discount_type,
    'discount_value', c.discount_value,
    'max_discount', c.max_discount,
    'applies_to', c.applies_to
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO authenticated;