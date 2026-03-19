CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  window_bucket TIMESTAMP WITH TIME ZONE NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (route_name, key_hash, window_bucket)
);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view api rate limits" ON public.api_rate_limits;
CREATE POLICY "Admins can view api rate limits"
ON public.api_rate_limits
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.enforce_rate_limit(
  p_route_name TEXT,
  p_key TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMP WITH TIME ZONE := now();
  v_bucket TIMESTAMP WITH TIME ZONE;
  v_key_hash TEXT;
  v_count INTEGER;
  v_retry_after INTEGER := 0;
BEGIN
  IF COALESCE(trim(p_route_name), '') = '' THEN
    RAISE EXCEPTION 'route_name_required';
  END IF;

  IF COALESCE(trim(p_key), '') = '' THEN
    RAISE EXCEPTION 'rate_limit_key_required';
  END IF;

  IF p_max_requests IS NULL OR p_max_requests < 1 THEN
    RAISE EXCEPTION 'invalid_rate_limit_max_requests';
  END IF;

  IF p_window_seconds IS NULL OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'invalid_rate_limit_window';
  END IF;

  v_bucket := to_timestamp(floor(extract(epoch FROM v_now) / p_window_seconds) * p_window_seconds);
  v_key_hash := encode(digest(p_key, 'sha256'), 'hex');

  INSERT INTO public.api_rate_limits (route_name, key_hash, window_bucket, request_count)
  VALUES (p_route_name, v_key_hash, v_bucket, 1)
  ON CONFLICT (route_name, key_hash, window_bucket)
  DO UPDATE SET
    request_count = public.api_rate_limits.request_count + 1,
    updated_at = now()
  RETURNING request_count INTO v_count;

  IF v_count > p_max_requests THEN
    v_retry_after := GREATEST(
      1,
      p_window_seconds - (extract(epoch FROM v_now)::INTEGER % p_window_seconds)
    );
  END IF;

  DELETE FROM public.api_rate_limits
  WHERE updated_at < v_now - make_interval(secs => GREATEST(p_window_seconds * 10, 3600));

  RETURN jsonb_build_object(
    'allowed', v_count <= p_max_requests,
    'count', v_count,
    'limit', p_max_requests,
    'remaining', GREATEST(p_max_requests - v_count, 0),
    'retry_after', v_retry_after
  );
END;
$$;