
CREATE TABLE public.prospects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  area TEXT DEFAULT '',
  city TEXT NOT NULL DEFAULT 'Tanger',
  category TEXT NOT NULL DEFAULT 'restaurant',
  rating NUMERIC DEFAULT 0,
  website TEXT DEFAULT '',
  google_place_id TEXT UNIQUE,
  mailbluster_synced BOOLEAN DEFAULT false,
  mailbluster_synced_at TIMESTAMPTZ,
  source TEXT DEFAULT 'google',
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and agents can manage prospects"
ON public.prospects FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'agent')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'agent')
);

CREATE POLICY "Service role full access on prospects"
ON public.prospects FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE INDEX idx_prospects_city ON public.prospects(city);
CREATE INDEX idx_prospects_category ON public.prospects(category);
CREATE INDEX idx_prospects_status ON public.prospects(status);
CREATE INDEX idx_prospects_mailbluster ON public.prospects(mailbluster_synced);
