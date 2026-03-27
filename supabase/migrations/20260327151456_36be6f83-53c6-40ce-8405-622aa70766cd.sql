
-- جدول الباقات المتاحة
CREATE TABLE public.driver_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL DEFAULT '',
  name_fr text NOT NULL DEFAULT '',
  name_en text NOT NULL DEFAULT '',
  description_ar text DEFAULT '',
  description_fr text DEFAULT '',
  duration_days integer NOT NULL DEFAULT 30,
  price numeric NOT NULL DEFAULT 0,
  original_price numeric DEFAULT NULL,
  max_orders integer DEFAULT NULL,
  max_km numeric DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  driver_type text NOT NULL DEFAULT 'both',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- جدول اشتراكات السائقين
CREATE TABLE public.driver_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.driver_packages(id),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  orders_used integer NOT NULL DEFAULT 0,
  km_used numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  payment_status text NOT NULL DEFAULT 'pending',
  amount_paid numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.driver_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_subscriptions ENABLE ROW LEVEL SECURITY;

-- سياسات الباقات - الجميع يرى الباقات النشطة
CREATE POLICY "Anyone can view active packages" ON public.driver_packages
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage packages" ON public.driver_packages
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- سياسات الاشتراكات
CREATE POLICY "Drivers can view own subscriptions" ON public.driver_subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Drivers can create subscriptions" ON public.driver_subscriptions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all subscriptions" ON public.driver_subscriptions
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Agents can view subscriptions" ON public.driver_subscriptions
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'agent'));

-- إضافة باقات افتراضية
INSERT INTO public.driver_packages (name_ar, name_fr, name_en, description_ar, description_fr, duration_days, price, original_price, is_featured, driver_type, sort_order) VALUES
  ('باقة أسبوعية', 'Forfait Hebdomadaire', 'Weekly Package', 'باقة تجريبية لمدة أسبوع', 'Forfait d''essai d''une semaine', 7, 50, NULL, false, 'both', 1),
  ('باقة شهرية', 'Forfait Mensuel', 'Monthly Package', 'باقة شهرية كاملة - الأكثر شعبية', 'Forfait mensuel complet - Le plus populaire', 30, 150, NULL, true, 'both', 2),
  ('باقة شهرين', 'Forfait 2 Mois', '2 Months Package', 'وفّر 20% مع باقة الشهرين', 'Économisez 20% avec le forfait 2 mois', 60, 240, 300, false, 'both', 3),
  ('باقة 3 أشهر', 'Forfait 3 Mois', '3 Months Package', 'أفضل قيمة - وفّر 30%', 'Meilleure valeur - Économisez 30%', 90, 315, 450, false, 'both', 4);
