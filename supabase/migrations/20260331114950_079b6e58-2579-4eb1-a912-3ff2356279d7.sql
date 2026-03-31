
ALTER TABLE public.permission_roles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.permission_roles ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES auth.users(id);
