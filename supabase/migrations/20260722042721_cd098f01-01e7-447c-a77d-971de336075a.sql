
-- Unified audit trigger for sensitive tables
CREATE OR REPLACE FUNCTION public.audit_sensitive_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_row_id text;
BEGIN
  v_actor := auth.uid();
  BEGIN
    v_row_id := COALESCE(
      (CASE WHEN TG_OP = 'DELETE' THEN OLD.id::text ELSE NEW.id::text END),
      'unknown'
    );
  EXCEPTION WHEN OTHERS THEN
    v_row_id := 'n/a';
  END;

  INSERT INTO public.db_audit_log (
    table_name, operation, row_id, actor_id, old_data, new_data, created_at
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    v_row_id,
    v_actor,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    now()
  );
  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach to sensitive tables (idempotent)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['payments','wallet','wallet_transactions','user_roles','coupons','commission_rates'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%1$I ON public.%1$I', t);
      EXECUTE format('CREATE TRIGGER trg_audit_%1$I AFTER INSERT OR UPDATE OR DELETE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_changes()', t);
    END IF;
  END LOOP;
END $$;
