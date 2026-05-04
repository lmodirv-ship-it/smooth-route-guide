-- 1) Create table
CREATE TABLE IF NOT EXISTS public.partner_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description_ar text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  url text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  category text NOT NULL DEFAULT 'services',
  status text NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'coming', 'hidden')),
  is_featured boolean NOT NULL DEFAULT false,
  is_visible boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  custom_screenshot_url text,
  icon_name text NOT NULL DEFAULT 'Globe',
  gradient text NOT NULL DEFAULT 'from-orange-400 via-red-500 to-rose-600',
  rating numeric(3,1) NOT NULL DEFAULT 4.8,
  users_label text NOT NULL DEFAULT '1K+',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_sites_visible_sort
  ON public.partner_sites (is_visible, sort_order);

-- 2) RLS
ALTER TABLE public.partner_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view visible partner sites"
  ON public.partner_sites FOR SELECT
  USING (is_visible = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert partner sites"
  ON public.partner_sites FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update partner sites"
  ON public.partner_sites FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete partner sites"
  ON public.partner_sites FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 3) updated_at trigger
CREATE TRIGGER trg_partner_sites_updated_at
  BEFORE UPDATE ON public.partner_sites
  FOR EACH ROW EXECUTE FUNCTION public.hn_stock_update_timestamp();

-- 4) Realtime
ALTER TABLE public.partner_sites REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_sites;

-- 5) Seed initial 14 projects
INSERT INTO public.partner_sites
  (slug, name_ar, name_en, description_ar, description_en, url, tags, category, status, is_featured, sort_order, icon_name, gradient, rating, users_label)
VALUES
  ('hn-driver', 'HN درايفر', 'HN Driver', 'المنصة الأم للنقل والتوصيل — رحلات الركاب وخدمات التوصيل اللحظية', 'Lead transport & delivery platform — rides and instant deliveries', 'https://www.hn-driver.com', ARRAY['نقل','توصيل','AI'], 'transport', 'live', true, 1, 'Car', 'from-orange-400 via-red-500 to-rose-600', 4.9, '25K+'),
  ('souk-hn', 'سوق HN إكسبريس', 'Souk-HN Express', 'منصة النقل والتوصيل الرائدة — رحلات، طلبات، وخدمات لوجستية متكاملة', 'Premier logistics & delivery marketplace', 'https://www.hn-driver.online', ARRAY['لوجستيك','تجارة'], 'transport', 'live', true, 2, 'Truck', 'from-amber-400 via-orange-500 to-red-500', 4.8, '18K+'),
  ('hn-stock', 'HN ستوك', 'HN-STOCK', 'نظام إدارة المخزون والمستودعات بأحدث التقنيات', 'Modern warehouse & inventory management', 'https://www.hn-driver.site', ARRAY['مخزون','ERP'], 'commerce', 'live', true, 3, 'Store', 'from-emerald-400 via-green-500 to-teal-600', 4.9, '8K+'),
  ('car-wash', 'مدير مغسلة السيارات', 'Car Wash Manager', 'نظام احترافي لإدارة مغاسل السيارات والخدمات', 'Pro car-wash management & bookings', 'https://auto-shine-master.lovable.app', ARRAY['خدمات','حجوزات'], 'services', 'live', false, 4, 'Car', 'from-blue-400 via-cyan-500 to-sky-600', 4.7, '2K+'),
  ('tangier-print', 'مطبعة طنجة الكبرى', 'Grand Tanger Print Studio', 'خدمات الطباعة والتصميم الاحترافي بجودة عالية', 'Professional print & design studio', 'https://tangier-print-hub.lovable.app', ARRAY['طباعة','تصميم'], 'services', 'live', false, 5, 'Printer', 'from-purple-400 via-pink-500 to-rose-600', 4.8, '5K+'),
  ('agency-hub', 'وكالة الخدمات المتكاملة', 'Agency Hub Pro', 'إدارة الوكالات والخدمات المتكاملة بكفاءة', 'All-in-one agency operations platform', 'https://agency-hub-pro.lovable.app', ARRAY['إدارة','CRM'], 'services', 'live', false, 6, 'Globe', 'from-emerald-400 via-teal-500 to-cyan-600', 4.6, '3K+'),
  ('ai-scene', 'استوديو المشاهد الذكي', 'AI Scene Studio', 'إنتاج فيديوهات سينمائية بالذكاء الاصطناعي', 'AI cinematic scene generation', 'https://hn-aivideo.lovable.app', ARRAY['AI','فيديو','سينما'], 'ai', 'live', true, 7, 'Film', 'from-violet-400 via-indigo-500 to-purple-600', 4.9, '12K+'),
  ('ai-vision', 'استوديو الرؤية الذكية', 'AI Studio Vision', 'معالجة الصور والفيديو بقدرات الذكاء الاصطناعي', 'AI image & video processing', 'https://hn-videoai.lovable.app', ARRAY['AI','رؤية'], 'ai', 'live', false, 8, 'Brain', 'from-rose-400 via-red-500 to-pink-600', 4.8, '9K+'),
  ('hn-cima', 'HN سيما', 'HN Cima', 'منصة المحتوى المرئي والترفيه الرقمي', 'Visual content & digital entertainment', 'https://hn-vi.lovable.app', ARRAY['ترفيه','فيديو'], 'media', 'live', false, 9, 'Film', 'from-yellow-400 via-amber-500 to-orange-600', 4.7, '15K+'),
  ('studio-hn', 'استوديو HN', 'Studio HN', 'منصة الإبداع الرقمي والتصميم المتقدم', 'Advanced digital creation studio', 'https://studio-hn.lovable.app', ARRAY['تصميم','إبداع'], 'media', 'live', false, 10, 'Sparkles', 'from-sky-400 via-blue-500 to-indigo-600', 4.8, '6K+'),
  ('hn-book', 'HN بوك', 'HN Book', 'منصة إعادة البيع والكتب الرقمية', 'Books resale & digital library', 'https://hn-book.lovable.app', ARRAY['كتب','تعليم'], 'commerce', 'live', false, 11, 'BookOpen', 'from-stone-400 via-amber-600 to-yellow-700', 4.6, '4K+'),
  ('profitable-ventures', 'مركز المشاريع الرابحة', 'Profitable Ventures Hub', 'تصميم وطباعة البطاقات الاحترافية في دقائق', 'Instant pro card printing', 'https://profitable-ventures-hub.lovable.app', ARRAY['طباعة','أعمال'], 'commerce', 'live', false, 12, 'TrendingUp', 'from-lime-400 via-green-500 to-emerald-600', 4.7, '3K+'),
  ('cloud-harmony', 'كلاود هارموني', 'Cloud Harmony', 'حلول سحابية متناغمة لإدارة البيانات والخدمات', 'Cohesive cloud data solutions', 'https://cloud-harmony.lovable.app', ARRAY['سحابة','بيانات'], 'services', 'live', false, 13, 'Cloud', 'from-cyan-300 via-sky-400 to-blue-500', 4.8, '7K+'),
  ('hn-print-gr', 'HN برينت GR', 'HN Print GR', 'خدمات الطباعة الفاخرة والتصاميم المتميزة', 'Premium print services', 'https://hn-print-gr.lovable.app', ARRAY['طباعة','فاخر'], 'services', 'live', false, 14, 'Printer', 'from-yellow-500 via-amber-600 to-orange-700', 4.7, '2K+')
ON CONFLICT (slug) DO NOTHING;