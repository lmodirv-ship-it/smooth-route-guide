
-- Table for assistant file/image storage with metadata
CREATE TABLE public.assistant_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_url TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL DEFAULT '',
  file_type TEXT NOT NULL DEFAULT 'image',
  file_size INTEGER DEFAULT 0,
  label TEXT DEFAULT '',
  description TEXT DEFAULT '',
  reference_number TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.assistant_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access assistant_files"
  ON public.assistant_files FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Smart assistant can manage assistant_files"
  ON public.assistant_files FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'smart_admin_assistant'::app_role))
  WITH CHECK (has_role(auth.uid(), 'smart_admin_assistant'::app_role));

-- Table for voice orders from customers
CREATE TABLE public.voice_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL DEFAULT '',
  transcript TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_notes TEXT DEFAULT '',
  order_id UUID REFERENCES public.delivery_orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create voice orders"
  ON public.voice_orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own voice orders"
  ON public.voice_orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins full access voice_orders"
  ON public.voice_orders FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can manage voice_orders"
  ON public.voice_orders FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'agent'::app_role))
  WITH CHECK (has_role(auth.uid(), 'agent'::app_role));

-- Storage bucket for voice recordings
INSERT INTO storage.buckets (id, name, public) VALUES ('voice-orders', 'voice-orders', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload voice orders"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'voice-orders' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own voice files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'voice-orders' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Agents can view voice orders"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'voice-orders' AND (has_role(auth.uid(), 'agent'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));
