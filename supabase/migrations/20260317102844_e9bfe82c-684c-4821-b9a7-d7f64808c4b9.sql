
CREATE TABLE public.import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url text NOT NULL DEFAULT '',
  source_type text NOT NULL DEFAULT 'website',
  city text NOT NULL DEFAULT 'Tanger',
  restaurants_count integer NOT NULL DEFAULT 0,
  products_count integer NOT NULL DEFAULT 0,
  categories_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  imported_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage import_logs" ON public.import_logs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Agents can manage import_logs" ON public.import_logs FOR ALL TO authenticated USING (has_role(auth.uid(), 'agent'::app_role));
