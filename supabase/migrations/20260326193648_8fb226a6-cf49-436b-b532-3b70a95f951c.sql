
-- Add zone_code to zones table (6-digit unique code per zone)
ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS zone_code text;

-- Create geo_codes table for country and city codes
CREATE TABLE IF NOT EXISTS public.geo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'country',
  name text NOT NULL,
  code text NOT NULL,
  parent_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(type, name, parent_name)
);

-- Enable RLS
ALTER TABLE public.geo_codes ENABLE ROW LEVEL SECURITY;

-- Admins can manage geo_codes
CREATE POLICY "Admins can manage geo_codes" ON public.geo_codes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Anyone authenticated can read geo_codes
CREATE POLICY "Anyone can read geo_codes" ON public.geo_codes
  FOR SELECT TO authenticated
  USING (true);
