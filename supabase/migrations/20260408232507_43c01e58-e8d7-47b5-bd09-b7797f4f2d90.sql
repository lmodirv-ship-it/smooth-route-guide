
-- Trigger to prevent removing admin role from protected admins
CREATE OR REPLACE FUNCTION public.protect_admin_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_protected_ids uuid[] := ARRAY[
    '338ea1c1-2ded-4622-a401-4d25c5930fa4'::uuid,
    '22b66263-874b-498a-81f4-91be081765c2'::uuid,
    '85dc53b8-2a20-425e-91eb-c3ab8f9fed00'::uuid
  ];
BEGIN
  -- Block DELETE of admin role for protected users
  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'admin' AND OLD.user_id = ANY(v_protected_ids) THEN
      RAISE EXCEPTION 'Cannot remove admin role from a protected administrator';
    END IF;
    RETURN OLD;
  END IF;

  -- Block UPDATE that changes role away from admin for protected users
  IF TG_OP = 'UPDATE' THEN
    IF OLD.role = 'admin' AND NEW.role != 'admin' AND OLD.user_id = ANY(v_protected_ids) THEN
      RAISE EXCEPTION 'Cannot change admin role for a protected administrator';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_admin_roles
BEFORE UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.protect_admin_roles();
