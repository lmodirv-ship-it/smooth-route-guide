
-- Add owner_id to stores table for marketplace ownership
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create product_images table for multiple images per product
CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  image_url text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view product images
CREATE POLICY "Anyone can view product images"
  ON public.product_images FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage all product images
CREATE POLICY "Admins can manage product images"
  ON public.product_images FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Store owners can manage their product images
CREATE POLICY "Store owners can manage product images"
  ON public.product_images FOR ALL
  TO authenticated
  USING (
    menu_item_id IN (
      SELECT mi.id FROM public.menu_items mi
      JOIN public.stores s ON s.id = mi.store_id
      WHERE s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    menu_item_id IN (
      SELECT mi.id FROM public.menu_items mi
      JOIN public.stores s ON s.id = mi.store_id
      WHERE s.owner_id = auth.uid()
    )
  );

-- RLS policy for store owners to manage their own store
CREATE POLICY "Store owners can update own store"
  ON public.stores FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

-- Store owners can manage their menu categories
CREATE POLICY "Store owners can manage own categories"
  ON public.menu_categories FOR ALL
  TO authenticated
  USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

-- Store owners can manage their menu items
CREATE POLICY "Store owners can manage own items"
  ON public.menu_items FOR ALL
  TO authenticated
  USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));
