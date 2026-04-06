
CREATE TABLE public.hn_driver_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL DEFAULT '',
  category text DEFAULT '',
  phone text DEFAULT '',
  address text DEFAULT '',
  city text DEFAULT '',
  segment text DEFAULT '',
  rating numeric DEFAULT 0,
  total_ratings numeric DEFAULT 0,
  source text DEFAULT 'google_maps',
  date_added text DEFAULT '',
  status text DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hn_driver_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON public.hn_driver_leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON public.hn_driver_leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.hn_driver_leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow service role full access" ON public.hn_driver_leads FOR ALL TO service_role USING (true);
