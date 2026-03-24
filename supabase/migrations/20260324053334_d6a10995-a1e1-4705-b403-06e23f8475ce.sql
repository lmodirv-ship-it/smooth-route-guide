-- Fix SECURITY DEFINER view issue: drop and recreate with SECURITY INVOKER
DROP VIEW IF EXISTS public.active_drivers_public;

CREATE VIEW public.active_drivers_public 
WITH (security_invoker = true) AS
SELECT 
  id,
  user_id,
  car_id,
  status,
  rating,
  ROUND(current_lat::numeric, 2) AS current_lat,
  ROUND(current_lng::numeric, 2) AS current_lng
FROM public.drivers
WHERE status = 'active';