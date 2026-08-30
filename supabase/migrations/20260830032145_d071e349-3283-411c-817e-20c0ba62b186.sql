CREATE TABLE public.manara_exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_site TEXT NOT NULL,
  signal_type TEXT NOT NULL DEFAULT 'status',
  signal_key TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  target_sites TEXT[] NOT NULL DEFAULT '{}',
  signature TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.manara_exports TO anon, authenticated;
GRANT ALL ON public.manara_exports TO service_role;

ALTER TABLE public.manara_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manara_exports REPLICA IDENTITY FULL;

CREATE POLICY "Public can read published exports" ON public.manara_exports
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can insert exports" ON public.manara_exports
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update exports" ON public.manara_exports
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete exports" ON public.manara_exports
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX manara_exports_status_idx ON public.manara_exports (status, created_at DESC);
CREATE INDEX manara_exports_key_idx ON public.manara_exports (signal_key, created_at DESC);

CREATE TABLE public.manara_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  export_id UUID,
  sender_site TEXT NOT NULL,
  recipient_site TEXT,
  signal_type TEXT NOT NULL DEFAULT 'status',
  signal_key TEXT NOT NULL,
  signal_value TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  process_status TEXT NOT NULL DEFAULT 'received',
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.manara_imports TO anon, authenticated;
GRANT ALL ON public.manara_imports TO service_role;

ALTER TABLE public.manara_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manara_imports REPLICA IDENTITY FULL;

CREATE POLICY "Public can read imports" ON public.manara_imports
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can insert imports" ON public.manara_imports
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update imports" ON public.manara_imports
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete imports" ON public.manara_imports
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX manara_imports_recipient_idx ON public.manara_imports (recipient_site, process_status, created_at DESC);
CREATE INDEX manara_imports_key_idx ON public.manara_imports (signal_key, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.manara_exports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.manara_imports;