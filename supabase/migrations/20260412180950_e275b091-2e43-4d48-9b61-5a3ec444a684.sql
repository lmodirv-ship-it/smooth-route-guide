CREATE OR REPLACE FUNCTION public.record_visit(
  p_session_id text,
  p_page_path text DEFAULT '/'::text,
  p_country text DEFAULT ''::text,
  p_city text DEFAULT ''::text,
  p_device_type text DEFAULT 'desktop'::text,
  p_browser text DEFAULT ''::text,
  p_os text DEFAULT ''::text,
  p_referrer text DEFAULT ''::text,
  p_language text DEFAULT ''::text,
  p_utm_source text DEFAULT ''::text,
  p_utm_medium text DEFAULT ''::text,
  p_utm_campaign text DEFAULT ''::text,
  p_utm_content text DEFAULT ''::text,
  p_utm_term text DEFAULT ''::text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_new_session boolean;
  v_result jsonb;
BEGIN
  SELECT NOT EXISTS(
    SELECT 1 FROM site_visits WHERE session_id = p_session_id
  ) INTO v_is_new_session;

  INSERT INTO site_visits (session_id, page_path, country, city, device_type, browser, os, referrer, language, utm_source, utm_medium, utm_campaign, utm_content, utm_term)
  VALUES (p_session_id, p_page_path, p_country, p_city, p_device_type, p_browser, p_os, p_referrer, p_language, p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term);

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
$function$;