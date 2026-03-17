
-- Create storage bucket for restaurant images
INSERT INTO storage.buckets (id, name, public) VALUES ('restaurant-images', 'restaurant-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view restaurant images
CREATE POLICY "Public read access for restaurant images"
ON storage.objects FOR SELECT
USING (bucket_id = 'restaurant-images');

-- Allow authenticated users (agents/admins) to upload
CREATE POLICY "Authenticated users can upload restaurant images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'restaurant-images');

-- Allow authenticated users to update
CREATE POLICY "Authenticated users can update restaurant images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'restaurant-images');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete restaurant images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'restaurant-images');

-- Enable realtime for stores, menu_categories, menu_items
ALTER PUBLICATION supabase_realtime ADD TABLE public.stores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;

-- Add RLS policy for agents to manage stores
CREATE POLICY "Agents can manage stores"
ON public.stores FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'agent'::app_role));

-- Add RLS policy for agents to manage menu_categories
CREATE POLICY "Agents can manage categories"
ON public.menu_categories FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'agent'::app_role));

-- Add RLS policy for agents to manage menu_items  
CREATE POLICY "Agents can manage items"
ON public.menu_items FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'agent'::app_role));
