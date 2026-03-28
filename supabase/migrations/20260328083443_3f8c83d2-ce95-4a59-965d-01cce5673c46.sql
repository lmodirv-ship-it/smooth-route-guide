
CREATE TABLE public.face_auth_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  descriptor jsonb NOT NULL DEFAULT '[]'::jsonb,
  photo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(email)
);

ALTER TABLE public.face_auth_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own face profile" ON public.face_auth_profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own face profile" ON public.face_auth_profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own face profile" ON public.face_auth_profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can manage face profiles" ON public.face_auth_profiles
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.face_auth_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_email text NOT NULL,
  photo_data text,
  result text DEFAULT 'rejected',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.face_auth_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view attempts" ON public.face_auth_attempts
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
