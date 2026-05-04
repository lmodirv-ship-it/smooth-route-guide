
CREATE OR REPLACE FUNCTION public.protect_owner_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_owner_id uuid := '22b66263-874b-498a-81f4-91be081765c2'::uuid;
  v_owner_email text := 'lmodirv@gmail.com';
  v_protected_delete_ids uuid[] := ARRAY[
    '22b66263-874b-498a-81f4-91be081765c2'::uuid,
    '85dc53b8-2a20-425e-91eb-c3ab8f9fed00'::uuid
  ];
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.id = ANY(v_protected_delete_ids) THEN
      RAISE EXCEPTION 'Cannot delete a protected account';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.id = v_owner_id AND NEW.email IS DISTINCT FROM v_owner_email THEN
      RAISE EXCEPTION 'Cannot change owner email address';
    END IF;
    IF OLD.id = v_owner_id AND COALESCE(NEW.is_suspended, false) = true THEN
      RAISE EXCEPTION 'Cannot suspend the owner account';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.protect_admin_roles()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_owner_id uuid := '22b66263-874b-498a-81f4-91be081765c2'::uuid;
  v_protected_ids uuid[] := ARRAY[
    '338ea1c1-2ded-4622-a401-4d25c5930fa4'::uuid,
    '22b66263-874b-498a-81f4-91be081765c2'::uuid
  ];
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'admin' AND OLD.user_id = ANY(v_protected_ids) THEN
      RAISE EXCEPTION 'Cannot remove admin role from a protected administrator';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.role = 'admin' AND NEW.role <> 'admin' AND OLD.user_id = ANY(v_protected_ids) THEN
      RAISE EXCEPTION 'Cannot change admin role for a protected administrator';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.user_id = v_owner_id AND NEW.role <> 'admin' THEN
      RAISE EXCEPTION 'Owner account can only hold the admin role';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
