
-- Table to store server backup status pushed from VPS
CREATE TABLE IF NOT EXISTS public.server_backup_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL DEFAULT 'daily',
  file_path TEXT,
  file_size BIGINT DEFAULT 0,
  tables_count INTEGER DEFAULT 0,
  rows_total BIGINT DEFAULT 0,
  duration_sec INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  health_score INTEGER,
  sync_status TEXT,
  disk_usage TEXT,
  source TEXT DEFAULT 'server',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.server_backup_status ENABLE ROW LEVEL SECURITY;

-- Admin can read
CREATE POLICY "Admins can view server backup status"
  ON public.server_backup_status FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Service/edge functions can insert (via service key, or admin)
CREATE POLICY "Admins can insert server backup status"
  ON public.server_backup_status FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Index for fast lookups
CREATE INDEX idx_server_backup_created ON public.server_backup_status (created_at DESC);
CREATE INDEX idx_server_backup_type ON public.server_backup_status (backup_type);
