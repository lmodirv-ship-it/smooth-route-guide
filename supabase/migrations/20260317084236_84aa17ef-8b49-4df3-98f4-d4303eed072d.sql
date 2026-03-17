
-- Create zones table for Tangier neighborhoods
CREATE TABLE public.zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL DEFAULT '',
  name_fr text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT 'Tanger',
  center_lat numeric NOT NULL DEFAULT 35.7595,
  center_lng numeric NOT NULL DEFAULT -5.8340,
  radius_km numeric NOT NULL DEFAULT 3,
  delivery_fee numeric NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active zones" ON public.zones
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage zones" ON public.zones
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Add zone_id to delivery_orders
ALTER TABLE public.delivery_orders ADD COLUMN zone_id uuid REFERENCES public.zones(id);
ALTER TABLE public.delivery_orders ADD COLUMN delivery_type text NOT NULL DEFAULT 'standard';

-- Create stores table
CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'restaurant',
  zone_id uuid REFERENCES public.zones(id),
  address text DEFAULT '',
  lat numeric,
  lng numeric,
  phone text DEFAULT '',
  rating numeric DEFAULT 4.5,
  delivery_time_min integer DEFAULT 20,
  delivery_time_max integer DEFAULT 40,
  delivery_fee numeric DEFAULT 10,
  min_order numeric DEFAULT 0,
  is_open boolean NOT NULL DEFAULT true,
  image_url text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view open stores" ON public.stores
  FOR SELECT TO authenticated USING (is_open = true);

CREATE POLICY "Admins can manage stores" ON public.stores
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert Tangier zones
INSERT INTO public.zones (name_ar, name_fr, center_lat, center_lng, radius_km, delivery_fee) VALUES
  ('وسط المدينة', 'Centre Ville', 35.7767, -5.8039, 2, 10),
  ('المدينة القديمة', 'Médina', 35.7870, -5.8130, 1.5, 10),
  ('مرشان', 'Marchan', 35.7900, -5.8200, 2, 12),
  ('السواني', 'Souani', 35.7650, -5.8100, 2.5, 12),
  ('بني مكادة', 'Béni Makada', 35.7500, -5.8200, 3, 15),
  ('بوخالف', 'Boukhalef', 35.7300, -5.8900, 4, 18),
  ('مغوغة', 'Mghogha', 35.7450, -5.8500, 3, 15),
  ('ملابطا', 'Malabata', 35.7950, -5.7800, 2.5, 12),
  ('حي البرانص', 'Branes', 35.7600, -5.8350, 2, 12),
  ('ابن بطوطة', 'Ibn Batouta', 35.7250, -5.9000, 4, 20);

-- Insert sample stores for Tangier
INSERT INTO public.stores (name, description, category, address, lat, lng, phone, rating, delivery_time_min, delivery_time_max, delivery_fee, zone_id) VALUES
  ('مطعم الشيف طنجة', 'مأكولات مغربية تقليدية وعصرية', 'restaurant', 'شارع محمد الخامس، وسط المدينة', 35.7767, -5.8039, '0539000001', 4.7, 25, 40, 10,
    (SELECT id FROM public.zones WHERE name_fr = 'Centre Ville' LIMIT 1)),
  ('بيتزا كازا', 'بيتزا إيطالية طازجة', 'restaurant', 'حي كاليفورنيا', 35.7700, -5.8100, '0539000002', 4.5, 20, 35, 10,
    (SELECT id FROM public.zones WHERE name_fr = 'Centre Ville' LIMIT 1)),
  ('طاكوس فاكتوري', 'تاكوس، برغر، ساندويتشات', 'restaurant', 'بوليفار محمد السادس', 35.7650, -5.8050, '0539000003', 4.3, 15, 30, 8,
    (SELECT id FROM public.zones WHERE name_fr = 'Centre Ville' LIMIT 1)),
  ('سوشي تانجا', 'سوشي ومأكولات آسيوية', 'restaurant', 'حي مرشان', 35.7900, -5.8200, '0539000004', 4.8, 30, 45, 15,
    (SELECT id FROM public.zones WHERE name_fr = 'Marchan' LIMIT 1)),
  ('مطعم دار نور', 'مأكولات بحرية طازجة', 'restaurant', 'المدينة القديمة', 35.7870, -5.8130, '0539000005', 4.9, 35, 50, 10,
    (SELECT id FROM public.zones WHERE name_fr = 'Médina' LIMIT 1)),
  ('كارفور ماركت طنجة', 'سوبرماركت شامل', 'supermarket', 'طنجة سيتي مول', 35.7580, -5.8350, '0539000010', 4.4, 40, 60, 15,
    (SELECT id FROM public.zones WHERE name_fr = 'Souani' LIMIT 1)),
  ('مرجان', 'هايبرماركت', 'supermarket', 'طريق الرباط', 35.7500, -5.8300, '0539000011', 4.3, 45, 70, 18,
    (SELECT id FROM public.zones WHERE name_fr = 'Béni Makada' LIMIT 1)),
  ('أسيما', 'سوبرماركت محلي', 'supermarket', 'شارع المقاومة', 35.7750, -5.8080, '0539000012', 4.5, 30, 50, 10,
    (SELECT id FROM public.zones WHERE name_fr = 'Centre Ville' LIMIT 1)),
  ('صيدلية النجاح', 'صيدلية ومستحضرات تجميل', 'pharmacy', 'شارع فاس', 35.7730, -5.8060, '0539000020', 4.8, 15, 25, 8,
    (SELECT id FROM public.zones WHERE name_fr = 'Centre Ville' LIMIT 1)),
  ('بوتيك لمسة', 'هدايا وإكسسوارات', 'shops', 'سوق الداخل', 35.7865, -5.8125, '0539000030', 4.6, 25, 40, 10,
    (SELECT id FROM public.zones WHERE name_fr = 'Médina' LIMIT 1)),
  ('ماركت إكسبريس', 'بقالة سريعة 24/7', 'market', 'حي السواني', 35.7650, -5.8100, '0539000040', 4.2, 10, 20, 5,
    (SELECT id FROM public.zones WHERE name_fr = 'Souani' LIMIT 1));
