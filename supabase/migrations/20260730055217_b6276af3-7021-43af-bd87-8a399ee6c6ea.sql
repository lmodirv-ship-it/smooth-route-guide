-- 1) delivery_orders: agents update must mirror USING in WITH CHECK
DROP POLICY IF EXISTS "Agents can update delivery orders" ON public.delivery_orders;
CREATE POLICY "Agents can update delivery orders"
ON public.delivery_orders
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'agent'::app_role)
  AND (status <> ALL (ARRAY['delivered','cancelled','completed','refunded','failed']))
  AND created_at > (now() - interval '7 days')
)
WITH CHECK (
  has_role(auth.uid(), 'agent'::app_role)
  AND (status <> ALL (ARRAY['delivered','cancelled','completed','refunded','failed']))
  AND created_at > (now() - interval '7 days')
);

-- 2) reward_stars: admin update needs WITH CHECK and authenticated scope
DROP POLICY IF EXISTS "Admins update stars" ON public.reward_stars;
CREATE POLICY "Admins update stars"
ON public.reward_stars
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins view all stars" ON public.reward_stars;
CREATE POLICY "Admins view all stars"
ON public.reward_stars
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role));

DROP POLICY IF EXISTS "Users view own stars" ON public.reward_stars;
CREATE POLICY "Users view own stars"
ON public.reward_stars
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

REVOKE ALL ON public.reward_stars FROM anon;

-- 3) call_signals: no anon access; participant-only reads (single explicit policy)
REVOKE ALL ON public.call_signals FROM anon;
DROP POLICY IF EXISTS "Participants can view own signals" ON public.call_signals;
DROP POLICY IF EXISTS "Participants can read call signals" ON public.call_signals;
CREATE POLICY "Participants can read call signals"
ON public.call_signals
FOR SELECT
TO authenticated
USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- 4) hn_stock_products: guarantee internal fields stay hidden from anonymous visitors
REVOKE ALL ON public.hn_stock_products FROM anon;
GRANT SELECT (id, name, description, price, image_url, marketplace_listed, created_at)
  ON public.hn_stock_products TO anon;