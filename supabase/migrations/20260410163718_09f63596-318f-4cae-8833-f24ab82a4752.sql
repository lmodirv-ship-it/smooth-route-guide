
-- System health check logs
CREATE TABLE public.system_health_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  check_id TEXT NOT NULL,
  check_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'system',
  status TEXT NOT NULL DEFAULT 'pass',
  message TEXT,
  details TEXT,
  source TEXT NOT NULL DEFAULT 'web',
  device_info JSONB DEFAULT '{}',
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- System repair actions log
CREATE TABLE public.system_repairs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repair_type TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  source TEXT NOT NULL DEFAULT 'web',
  auto_triggered BOOLEAN NOT NULL DEFAULT false,
  user_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Periodic health snapshots (summary)
CREATE TABLE public.system_health_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  score INTEGER NOT NULL DEFAULT 0,
  total_checks INTEGER NOT NULL DEFAULT 0,
  pass_count INTEGER NOT NULL DEFAULT 0,
  warn_count INTEGER NOT NULL DEFAULT 0,
  fail_count INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'web',
  snapshot_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX idx_health_logs_created ON public.system_health_logs (created_at DESC);
CREATE INDEX idx_health_logs_status ON public.system_health_logs (status);
CREATE INDEX idx_health_logs_category ON public.system_health_logs (category);
CREATE INDEX idx_repairs_created ON public.system_repairs (created_at DESC);
CREATE INDEX idx_repairs_type ON public.system_repairs (repair_type);
CREATE INDEX idx_snapshots_created ON public.system_health_snapshots (created_at DESC);

-- Enable RLS
ALTER TABLE public.system_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_snapshots ENABLE ROW LEVEL SECURITY;

-- Admins can read all
CREATE POLICY "Admins can view health logs" ON public.system_health_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert health logs" ON public.system_health_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view repairs" ON public.system_repairs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert repairs" ON public.system_repairs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view snapshots" ON public.system_health_snapshots
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert snapshots" ON public.system_health_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for live monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_repairs;

-- Auto-cleanup old logs (keep 30 days) via a function
CREATE OR REPLACE FUNCTION public.cleanup_old_health_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.system_health_logs WHERE created_at < now() - interval '30 days';
  DELETE FROM public.system_repairs WHERE created_at < now() - interval '30 days';
  DELETE FROM public.system_health_snapshots WHERE created_at < now() - interval '90 days';
END;
$$;
