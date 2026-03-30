
-- Table to track site visits
CREATE TABLE public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_ip text,
  user_agent text,
  page_path text NOT NULL DEFAULT '/',
  session_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Counter cache for fast reads
CREATE TABLE public.site_visit_counter (
  id integer PRIMARY KEY DEFAULT 1,
  total_visits bigint NOT NULL DEFAULT 0,
  unique_visitors bigint NOT NULL DEFAULT 0,
  today_visits bigint NOT NULL DEFAULT 0,
  today_date date NOT NULL DEFAULT CURRENT_DATE,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Initialize counter
INSERT INTO public.site_visit_counter (id, total_visits, unique_visitors, today_visits, today_date)
VALUES (1, 0, 0, 0, CURRENT_DATE);

-- Enable RLS
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_visit_counter ENABLE ROW LEVEL SECURITY;

-- Anyone can insert visits (anonymous tracking)
CREATE POLICY "Anyone can insert visits" ON public.site_visits
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Anyone can read counter
CREATE POLICY "Anyone can read counter" ON public.site_visit_counter
  FOR SELECT TO anon, authenticated USING (true);

-- Admins can manage all
CREATE POLICY "Admins manage visits" ON public.site_visits
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage counter" ON public.site_visit_counter
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to record a visit and update counter atomically
CREATE OR REPLACE FUNCTION public.record_visit(p_session_id text, p_page_path text DEFAULT '/')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_new_session boolean;
  v_result jsonb;
BEGIN
  -- Check if this session already visited
  SELECT NOT EXISTS(
    SELECT 1 FROM site_visits WHERE session_id = p_session_id
  ) INTO v_is_new_session;

  -- Insert visit record
  INSERT INTO site_visits (session_id, page_path)
  VALUES (p_session_id, p_page_path);

  -- Reset today counter if date changed
  UPDATE site_visit_counter
  SET today_visits = 0, today_date = CURRENT_DATE
  WHERE id = 1 AND today_date < CURRENT_DATE;

  -- Update counter
  UPDATE site_visit_counter
  SET total_visits = total_visits + 1,
      unique_visitors = unique_visitors + CASE WHEN v_is_new_session THEN 1 ELSE 0 END,
      today_visits = today_visits + 1,
      updated_at = now()
  WHERE id = 1;

  -- Return current stats
  SELECT jsonb_build_object(
    'total_visits', total_visits,
    'unique_visitors', unique_visitors,
    'today_visits', today_visits
  ) INTO v_result
  FROM site_visit_counter WHERE id = 1;

  RETURN v_result;
END;
$$;
