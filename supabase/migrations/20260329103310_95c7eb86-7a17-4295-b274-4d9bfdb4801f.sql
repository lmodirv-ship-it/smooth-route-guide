
-- Customer packages table
CREATE TABLE public.customer_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL DEFAULT '',
  name_fr TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  description_ar TEXT,
  description_fr TEXT,
  package_type TEXT NOT NULL DEFAULT 'credits' CHECK (package_type IN ('credits', 'monthly', 'annual')),
  credits INTEGER DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 30,
  price NUMERIC NOT NULL DEFAULT 0,
  original_price NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active customer packages" ON public.customer_packages
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage customer packages" ON public.customer_packages
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Customer subscriptions table
CREATE TABLE public.customer_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  package_id UUID REFERENCES public.customer_packages(id),
  subscription_type TEXT NOT NULL DEFAULT 'credits' CHECK (subscription_type IN ('credits', 'monthly', 'annual')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  credits_total INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON public.customer_subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can create own subscriptions" ON public.customer_subscriptions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all customer subscriptions" ON public.customer_subscriptions
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Agents can view customer subscriptions" ON public.customer_subscriptions
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'agent'));
