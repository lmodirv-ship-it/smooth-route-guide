
CREATE TABLE public.platform_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version_code TEXT NOT NULL,
  version_name TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  modules_updated TEXT[] DEFAULT '{}',
  change_type TEXT NOT NULL DEFAULT 'patch',
  status TEXT NOT NULL DEFAULT 'draft',
  release_notes TEXT DEFAULT '',
  total_files_changed INTEGER DEFAULT 0,
  build_size_kb INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage versions" ON public.platform_versions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view published versions" ON public.platform_versions
  FOR SELECT TO authenticated
  USING (status = 'published');
