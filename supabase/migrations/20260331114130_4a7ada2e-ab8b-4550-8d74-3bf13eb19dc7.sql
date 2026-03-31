
-- Permission roles table
CREATE TABLE public.permission_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Role permissions matrix
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.permission_roles(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  operation TEXT NOT NULL,
  allowed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_id, module, operation)
);

-- User permission role assignments
CREATE TABLE public.user_permission_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_role_id UUID NOT NULL REFERENCES public.permission_roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, permission_role_id)
);

-- Permission audit log
CREATE TABLE public.permission_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.permission_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies - admin only
CREATE POLICY "Admin full access on permission_roles" ON public.permission_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin full access on role_permissions" ON public.role_permissions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin full access on user_permission_roles" ON public.user_permission_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin full access on permission_audit_log" ON public.permission_audit_log FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default roles
INSERT INTO public.permission_roles (name, display_name, description, is_system) VALUES
  ('super_admin', 'Super Admin', 'صلاحيات كاملة على النظام', true),
  ('admin', 'Admin', 'مسؤول النظام', true),
  ('operations_manager', 'Operations Manager', 'مدير العمليات', false),
  ('call_center_agent', 'Call Center Agent', 'موظف مركز الاتصال', false),
  ('accountant', 'Accountant', 'محاسب', false),
  ('page_manager', 'Page Manager', 'مدير الصفحات', false),
  ('database_manager', 'Database Manager', 'مدير قاعدة البيانات', false),
  ('viewer', 'Viewer', 'مشاهد فقط', false);
