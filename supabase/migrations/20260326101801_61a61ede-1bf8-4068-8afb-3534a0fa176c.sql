
-- Dynamic pages table for CMS
CREATE TABLE public.dynamic_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  page_type TEXT NOT NULL DEFAULT 'content',
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  meta_description TEXT DEFAULT '',
  css_overrides TEXT DEFAULT '',
  is_published BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dynamic_pages ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins can manage dynamic pages"
ON public.dynamic_pages FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Smart assistant can manage pages
CREATE POLICY "Smart assistant can manage dynamic pages"
ON public.dynamic_pages FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'smart_admin_assistant'))
WITH CHECK (public.has_role(auth.uid(), 'smart_admin_assistant'));

-- Anyone can view published pages
CREATE POLICY "Anyone can view published pages"
ON public.dynamic_pages FOR SELECT TO authenticated
USING (is_published = true);

-- Allow anonymous users to view published pages
CREATE POLICY "Anon can view published pages"
ON public.dynamic_pages FOR SELECT TO anon
USING (is_published = true);
