
-- ═══ Enhanced Ratings ═══
ALTER TABLE public.ratings 
  ADD COLUMN IF NOT EXISTS rating_type text NOT NULL DEFAULT 'customer_to_driver',
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.delivery_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rated_by uuid;

-- Allow drivers to insert ratings (for rating customers)
CREATE POLICY "Drivers can rate customers"
ON public.ratings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = rated_by
  AND rating_type = 'driver_to_customer'
  AND public.has_role(auth.uid(), 'driver'::app_role)
);

-- Allow delivery drivers to rate customers
CREATE POLICY "Delivery drivers can rate customers"
ON public.ratings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = rated_by
  AND rating_type = 'driver_to_customer'
  AND public.has_role(auth.uid(), 'delivery'::app_role)
);

-- Allow clients to insert ratings
CREATE POLICY "Clients can rate drivers"
ON public.ratings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = rated_by
  AND rating_type = 'customer_to_driver'
  AND public.has_role(auth.uid(), 'user'::app_role)
);

-- Users can view their own ratings
CREATE POLICY "Users can view ratings about them"
ON public.ratings
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR rated_by = auth.uid());

-- Admins can view all ratings
CREATE POLICY "Admins can view all ratings"
ON public.ratings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ═══ Coupons System ═══
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
  discount_value numeric NOT NULL DEFAULT 0,
  max_discount numeric, -- max discount for percentage type
  min_order_amount numeric DEFAULT 0,
  max_uses integer DEFAULT 0, -- 0 = unlimited
  current_uses integer DEFAULT 0,
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  applies_to text DEFAULT 'all', -- 'all', 'delivery', 'ride'
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Admins can manage coupons
CREATE POLICY "Admins can manage coupons"
ON public.coupons FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can view active coupons
CREATE POLICY "Users can view active coupons"
ON public.coupons FOR SELECT
TO authenticated
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Coupon usage tracking
CREATE TABLE public.coupon_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  order_id uuid REFERENCES public.delivery_orders(id) ON DELETE SET NULL,
  trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  discount_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(coupon_id, user_id) -- each user can use a coupon once
);

ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own coupon usage"
ON public.coupon_usages FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can use coupons"
ON public.coupon_usages FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all coupon usage"
ON public.coupon_usages FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
