
-- Admin export whitelist
CREATE OR REPLACE FUNCTION public.admin_export_table(_table text)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed_tables text[] := ARRAY[
    'profiles','drivers','stores','delivery_orders','ride_requests','trips',
    'payments','wallet_transactions','coupons','user_roles','analytics_events',
    'db_audit_log','call_logs','ratings','notifications'
  ];
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF NOT (_table = ANY(allowed_tables)) THEN
    RAISE EXCEPTION 'table not allowed: %', _table;
  END IF;
  RETURN QUERY EXECUTE format('SELECT to_jsonb(t) FROM public.%I t LIMIT 10000', _table);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_export_table(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_export_table(text) TO authenticated;

-- Recent audit
CREATE OR REPLACE FUNCTION public.admin_get_recent_audit(_limit int DEFAULT 200)
RETURNS SETOF public.db_audit_log
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY SELECT * FROM public.db_audit_log ORDER BY created_at DESC LIMIT LEAST(_limit, 1000);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_recent_audit(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_recent_audit(int) TO authenticated;

-- Client error logging (open to authenticated for observability)
CREATE OR REPLACE FUNCTION public.log_client_error(_context text, _message text, _meta jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.analytics_events (event_type, event_name, user_id, properties, created_at)
  VALUES ('error', COALESCE(_context, 'client_error'), auth.uid(), jsonb_build_object('message', _message) || COALESCE(_meta, '{}'::jsonb), now());
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.log_client_error(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_client_error(text, text, jsonb) TO anon, authenticated;
