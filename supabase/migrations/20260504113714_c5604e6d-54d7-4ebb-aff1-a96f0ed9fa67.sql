-- Helper function for updated_at (created if missing)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS lat NUMERIC,
  ADD COLUMN IF NOT EXISTS lng NUMERIC,
  ADD COLUMN IF NOT EXISTS opening_hours JSONB,
  ADD COLUMN IF NOT EXISTS user_ratings_total INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS business_status TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS price_level INTEGER,
  ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS menu_scraped_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_prospects_enriched ON public.prospects(enriched_at);
CREATE INDEX IF NOT EXISTS idx_prospects_rating_desc ON public.prospects(rating DESC);

CREATE TABLE IF NOT EXISTS public.prospect_menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2),
  currency TEXT DEFAULT 'MAD',
  image_url TEXT,
  category TEXT,
  is_available BOOLEAN DEFAULT true,
  source TEXT DEFAULT 'manual',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prospect_menu_prospect ON public.prospect_menu_items(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_menu_category ON public.prospect_menu_items(category);

ALTER TABLE public.prospect_menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and agents can manage prospect menu items" ON public.prospect_menu_items;
CREATE POLICY "Admins and agents can manage prospect menu items"
  ON public.prospect_menu_items
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role));

DROP POLICY IF EXISTS "Service role full access on prospect menu items" ON public.prospect_menu_items;
CREATE POLICY "Service role full access on prospect menu items"
  ON public.prospect_menu_items
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_prospect_menu_updated_at ON public.prospect_menu_items;
CREATE TRIGGER trg_prospect_menu_updated_at
  BEFORE UPDATE ON public.prospect_menu_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();