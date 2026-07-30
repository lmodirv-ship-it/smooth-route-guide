-- Column-level security: hide stores.email / stores.phone from direct table reads.
-- Authorized access continues through the security-definer RPC public.get_store_contact.

REVOKE SELECT ON public.stores FROM anon;
REVOKE SELECT ON public.stores FROM authenticated;

GRANT SELECT (
  id, name, description, category, zone_id, address, lat, lng, rating,
  delivery_time_min, delivery_time_max, delivery_fee, min_order, is_open,
  image_url, created_at, google_place_id, area, owner_id, city, country,
  commission_rate, store_code, is_confirmed
) ON public.stores TO anon;

GRANT SELECT (
  id, name, description, category, zone_id, address, lat, lng, rating,
  delivery_time_min, delivery_time_max, delivery_fee, min_order, is_open,
  image_url, created_at, google_place_id, area, owner_id, city, country,
  commission_rate, store_code, is_confirmed
) ON public.stores TO authenticated;

GRANT ALL ON public.stores TO service_role;
