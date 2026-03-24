
-- Languages table
CREATE TABLE public.platform_languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  flag text NOT NULL DEFAULT '',
  is_rtl boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read languages" ON public.platform_languages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage languages" ON public.platform_languages
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Translations table
CREATE TABLE public.platform_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locale text NOT NULL,
  namespace text NOT NULL DEFAULT 'common',
  key text NOT NULL,
  value text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (locale, namespace, key)
);

ALTER TABLE public.platform_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read translations" ON public.platform_translations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage translations" ON public.platform_translations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Seed default languages
INSERT INTO public.platform_languages (code, label, flag, is_rtl, sort_order) VALUES
  ('ar', 'العربية', '🇲🇦', true, 1),
  ('fr', 'Français', '🇫🇷', false, 2),
  ('en', 'English', '🇬🇧', false, 3),
  ('es', 'Español', '🇪🇸', false, 4);
