
-- Audit log for all DB manager operations
CREATE TABLE public.db_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.db_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can access audit log"
  ON public.db_audit_log FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_db_audit_log_table ON public.db_audit_log(table_name);
CREATE INDEX idx_db_audit_log_created ON public.db_audit_log(created_at DESC);
