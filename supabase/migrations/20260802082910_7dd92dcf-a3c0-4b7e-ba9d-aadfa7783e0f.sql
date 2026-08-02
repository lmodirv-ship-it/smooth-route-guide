-- 1) UI Studio settings
CREATE TABLE IF NOT EXISTS public.ui_studio_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL UNIQUE,
  layout text NOT NULL DEFAULT 'classic',
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ui_studio_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ui_studio_settings TO authenticated;
GRANT ALL ON public.ui_studio_settings TO service_role;

ALTER TABLE public.ui_studio_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ui_studio_public_read" ON public.ui_studio_settings;
CREATE POLICY "ui_studio_public_read" ON public.ui_studio_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "ui_studio_admin_write" ON public.ui_studio_settings;
CREATE POLICY "ui_studio_admin_write" ON public.ui_studio_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_ui_studio_updated_at ON public.ui_studio_settings;
CREATE TRIGGER trg_ui_studio_updated_at
  BEFORE UPDATE ON public.ui_studio_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.ui_studio_settings REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ui_studio_settings;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO public.ui_studio_settings (scope, layout, options)
VALUES
  ('customer', 'studio', '{"showTopBar":true,"showQuickCards":true,"showOptionsBar":true,"showFareCard":true,"showSafetyStrip":true,"showBottomNav":true,"mapHeight":320,"radius":18,"density":"comfortable","glow":40}'::jsonb),
  ('driver', 'classic', '{}'::jsonb),
  ('delivery', 'classic', '{}'::jsonb),
  ('store', 'classic', '{}'::jsonb),
  ('callcenter', 'classic', '{}'::jsonb)
ON CONFLICT (scope) DO NOTHING;

-- 2) Vehicle types
CREATE TABLE IF NOT EXISTS public.ride_vehicle_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_fr text NOT NULL DEFAULT '',
  name_en text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'car',
  price_multiplier numeric NOT NULL DEFAULT 1,
  max_passengers integer NOT NULL DEFAULT 4,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ride_vehicle_types TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ride_vehicle_types TO authenticated;
GRANT ALL ON public.ride_vehicle_types TO service_role;

ALTER TABLE public.ride_vehicle_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_types_public_read" ON public.ride_vehicle_types;
CREATE POLICY "vehicle_types_public_read" ON public.ride_vehicle_types
  FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "vehicle_types_admin_write" ON public.ride_vehicle_types;
CREATE POLICY "vehicle_types_admin_write" ON public.ride_vehicle_types
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_vehicle_types_updated_at ON public.ride_vehicle_types;
CREATE TRIGGER trg_vehicle_types_updated_at
  BEFORE UPDATE ON public.ride_vehicle_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.ride_vehicle_types (code, name_ar, name_fr, name_en, icon, price_multiplier, max_passengers, sort_order)
VALUES
  ('economy', 'اقتصادية', 'Economique', 'Economy', 'car', 1.0, 4, 1),
  ('family',  'عائلية',   'Familiale',  'Family',  'bus', 1.35, 6, 2),
  ('vip',     'VIP',      'VIP',        'VIP',     'crown', 1.8, 4, 3),
  ('electric','كهربائية', 'Electrique', 'Electric','zap', 1.2, 4, 4)
ON CONFLICT (code) DO NOTHING;

-- 3) Safety contacts
CREATE TABLE IF NOT EXISTS public.ride_safety_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  relation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ride_safety_contacts TO authenticated;
GRANT ALL ON public.ride_safety_contacts TO service_role;

ALTER TABLE public.ride_safety_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "safety_contacts_own" ON public.ride_safety_contacts;
CREATE POLICY "safety_contacts_own" ON public.ride_safety_contacts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "safety_contacts_admin_read" ON public.ride_safety_contacts;
CREATE POLICY "safety_contacts_admin_read" ON public.ride_safety_contacts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_safety_contacts_updated_at ON public.ride_safety_contacts;
CREATE TRIGGER trg_safety_contacts_updated_at
  BEFORE UPDATE ON public.ride_safety_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Additive columns on ride_requests
ALTER TABLE public.ride_requests
  ADD COLUMN IF NOT EXISTS vehicle_type text DEFAULT 'economy',
  ADD COLUMN IF NOT EXISTS passengers integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS customer_notes text,
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;