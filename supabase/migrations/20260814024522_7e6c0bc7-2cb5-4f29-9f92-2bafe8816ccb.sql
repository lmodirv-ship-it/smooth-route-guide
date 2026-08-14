
-- 1. app_settings: narrow authenticated read to client-needed keys
DROP POLICY IF EXISTS "Authenticated can read non-sensitive settings" ON public.app_settings;

CREATE POLICY "Authenticated can read client settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (key = ANY (ARRAY[
  'theme','active_theme','themes',
  'pricing','pricing_settings','delivery_pricing',
  'free_period','free_period_settings',
  'announcements','banners','ads_config',
  'support_contact','contact_info',
  'tracking_ids','analytics_ids',
  'ota_manifest','app_version',
  'maintenance_mode','maintenance',
  'ui_visibility','ui_config',
  'default_language','supported_languages','enable_language_switcher',
  'i18n_overrides','translations_overrides'
]));

CREATE POLICY "Staff can read operational settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'agent'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);

-- 2. hn_stock_warehouses: narrow staff select
DROP POLICY IF EXISTS "Staff can view warehouses" ON public.hn_stock_warehouses;

CREATE POLICY "Warehouse staff can view warehouses"
ON public.hn_stock_warehouses
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'agent'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR EXISTS (SELECT 1 FROM public.hn_stock_drivers d WHERE d.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.hn_stock_merchants m WHERE m.user_id = auth.uid())
);

-- 3. storage: explicit read policy for restaurant-images
DROP POLICY IF EXISTS "Public can read restaurant images" ON storage.objects;
CREATE POLICY "Public can read restaurant images"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'restaurant-images');
