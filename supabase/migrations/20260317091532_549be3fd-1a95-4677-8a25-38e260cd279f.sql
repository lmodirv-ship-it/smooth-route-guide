
-- Menu categories table
CREATE TABLE public.menu_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL DEFAULT '',
  name_fr TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Menu items table
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL DEFAULT '',
  name_fr TEXT NOT NULL DEFAULT '',
  description_ar TEXT DEFAULT '',
  description_fr TEXT DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT DEFAULT '',
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Order items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.delivery_orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Menu categories: anyone can view active, admins can manage
CREATE POLICY "Anyone can view active categories" ON public.menu_categories FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins can manage categories" ON public.menu_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Menu items: anyone can view available, admins can manage
CREATE POLICY "Anyone can view available items" ON public.menu_items FOR SELECT TO authenticated USING (is_available = true);
CREATE POLICY "Admins can manage items" ON public.menu_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Order items: users can manage own, admins can manage all
CREATE POLICY "Users can manage own order items" ON public.order_items FOR ALL TO authenticated
  USING (order_id IN (SELECT id FROM public.delivery_orders WHERE user_id = auth.uid()))
  WITH CHECK (order_id IN (SELECT id FROM public.delivery_orders WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all order items" ON public.order_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Agents can view order items" ON public.order_items FOR SELECT TO authenticated USING (has_role(auth.uid(), 'agent'::app_role));
