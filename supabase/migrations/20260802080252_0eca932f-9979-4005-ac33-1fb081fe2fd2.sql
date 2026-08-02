DROP POLICY IF EXISTS "Public can read display settings" ON public.app_settings;
CREATE POLICY "Public can read display settings"
ON public.app_settings FOR SELECT
TO anon, authenticated
USING (key = ANY (ARRAY['ui_visibility','contact_info','active_theme','themes','free_period','ads_config','app_version','maintenance_mode']));
GRANT SELECT ON public.app_settings TO anon;