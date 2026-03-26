
CREATE TABLE public.social_media_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL DEFAULT 'facebook',
  post_type TEXT NOT NULL DEFAULT 'post',
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  hashtags TEXT[] DEFAULT '{}',
  target_audience TEXT DEFAULT 'general',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft',
  admin_approved BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE public.social_media_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage social posts" ON public.social_media_posts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Smart assistant can manage social posts" ON public.social_media_posts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'smart_admin_assistant'::app_role))
  WITH CHECK (has_role(auth.uid(), 'smart_admin_assistant'::app_role));
