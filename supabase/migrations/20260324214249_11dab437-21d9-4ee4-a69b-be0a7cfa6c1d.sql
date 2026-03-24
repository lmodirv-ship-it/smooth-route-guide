UPDATE platform_languages SET sort_order = 2 WHERE code = 'en';
UPDATE platform_languages SET sort_order = 3 WHERE code = 'fr';

INSERT INTO app_settings (key, value) VALUES 
  ('supported_languages', '["ar", "en", "fr", "es"]'::jsonb),
  ('default_language', '"ar"'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();