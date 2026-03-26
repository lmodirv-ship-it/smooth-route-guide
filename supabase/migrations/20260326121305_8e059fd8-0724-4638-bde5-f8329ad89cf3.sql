
-- جدول لتخزين أوامر المساعد الذكي ونتائجها
CREATE TABLE public.smart_assistant_commands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  command_text TEXT NOT NULL DEFAULT '',
  command_type TEXT NOT NULL DEFAULT 'general',
  target_page TEXT DEFAULT NULL,
  attached_file_url TEXT DEFAULT NULL,
  attached_file_type TEXT DEFAULT NULL,
  ai_response TEXT DEFAULT NULL,
  generated_files JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  accepted_at TIMESTAMPTZ DEFAULT NULL,
  rejected_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.smart_assistant_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access commands" ON public.smart_assistant_commands
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Smart assistant can manage commands" ON public.smart_assistant_commands
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'smart_admin_assistant'::app_role))
  WITH CHECK (has_role(auth.uid(), 'smart_admin_assistant'::app_role));

-- Storage bucket للمساعد الذكي
INSERT INTO storage.buckets (id, name, public) VALUES ('smart-assistant-files', 'smart-assistant-files', true);

-- سياسات تخزين الملفات
CREATE POLICY "Admins can manage assistant files" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'smart-assistant-files' AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'smart-assistant-files' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Smart assistant can manage files" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'smart-assistant-files' AND has_role(auth.uid(), 'smart_admin_assistant'::app_role))
  WITH CHECK (bucket_id = 'smart-assistant-files' AND has_role(auth.uid(), 'smart_admin_assistant'::app_role));

CREATE POLICY "Public can view assistant files" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'smart-assistant-files');
