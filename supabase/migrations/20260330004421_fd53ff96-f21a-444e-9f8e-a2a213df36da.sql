
-- Add geo and analytics columns to site_visits
ALTER TABLE public.site_visits
  ADD COLUMN IF NOT EXISTS country text DEFAULT '',
  ADD COLUMN IF NOT EXISTS city text DEFAULT '',
  ADD COLUMN IF NOT EXISTS device_type text DEFAULT 'desktop',
  ADD COLUMN IF NOT EXISTS browser text DEFAULT '',
  ADD COLUMN IF NOT EXISTS os text DEFAULT '',
  ADD COLUMN IF NOT EXISTS referrer text DEFAULT '',
  ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS language text DEFAULT '';

-- Create daily analytics summary table
CREATE TABLE IF NOT EXISTS public.site_analytics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  country text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  total_visits bigint NOT NULL DEFAULT 0,
  unique_visitors bigint NOT NULL DEFAULT 0,
  mobile_visits bigint NOT NULL DEFAULT 0,
  desktop_visits bigint NOT NULL DEFAULT 0,
  top_pages jsonb DEFAULT '[]'::jsonb,
  top_referrers jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(date, country, city)
);

-- Enable RLS
ALTER TABLE public.site_analytics_daily ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins can manage analytics" ON public.site_analytics_daily
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Moderators can view
CREATE POLICY "Moderators can view analytics" ON public.site_analytics_daily
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'moderator'::app_role));

-- Agents can view
CREATE POLICY "Agents can view analytics" ON public.site_analytics_daily
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'agent'::app_role));

-- Smart assistant can view
CREATE POLICY "Smart assistant can view analytics" ON public.site_analytics_daily
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'smart_admin_assistant'::app_role));

-- Update record_visit function to accept geo data
CREATE OR REPLACE FUNCTION public.record_visit(
  p_session_id text,
  p_page_path text DEFAULT '/',
  p_country text DEFAULT '',
  p_city text DEFAULT '',
  p_device_type text DEFAULT 'desktop',
  p_browser text DEFAULT '',
  p_os text DEFAULT '',
  p_referrer text DEFAULT '',
  p_language text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_new_session boolean;
  v_result jsonb;
BEGIN
  SELECT NOT EXISTS(
    SELECT 1 FROM site_visits WHERE session_id = p_session_id
  ) INTO v_is_new_session;

  INSERT INTO site_visits (session_id, page_path, country, city, device_type, browser, os, referrer, language)
  VALUES (p_session_id, p_page_path, p_country, p_city, p_device_type, p_browser, p_os, p_referrer, p_language);

  UPDATE site_visit_counter
  SET today_visits = 0, today_date = CURRENT_DATE
  WHERE id = 1 AND today_date < CURRENT_DATE;

  UPDATE site_visit_counter
  SET total_visits = total_visits + 1,
      unique_visitors = unique_visitors + CASE WHEN v_is_new_session THEN 1 ELSE 0 END,
      today_visits = today_visits + 1,
      updated_at = now()
  WHERE id = 1;

  SELECT jsonb_build_object(
    'total_visits', total_visits,
    'unique_visitors', unique_visitors,
    'today_visits', today_visits
  ) INTO v_result
  FROM site_visit_counter WHERE id = 1;

  RETURN v_result;
END;
$$;

-- Enable realtime for analytics
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_analytics_daily;
