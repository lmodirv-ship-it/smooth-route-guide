ALTER TABLE public.site_visits
  ADD COLUMN IF NOT EXISTS utm_source text DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_medium text DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_campaign text DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_content text DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_term text DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_site_visits_utm_source ON public.site_visits (utm_source) WHERE utm_source != '';
CREATE INDEX IF NOT EXISTS idx_site_visits_utm_campaign ON public.site_visits (utm_campaign) WHERE utm_campaign != '';