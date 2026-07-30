CREATE TABLE IF NOT EXISTS public.ai_endpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service TEXT NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  health_path TEXT DEFAULT '/',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'unknown',
  latency_ms INTEGER,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (service)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_endpoints TO authenticated;
GRANT ALL ON public.ai_endpoints TO service_role;

ALTER TABLE public.ai_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ai endpoints"
ON public.ai_endpoints FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER ai_endpoints_set_updated_at
BEFORE UPDATE ON public.ai_endpoints
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();