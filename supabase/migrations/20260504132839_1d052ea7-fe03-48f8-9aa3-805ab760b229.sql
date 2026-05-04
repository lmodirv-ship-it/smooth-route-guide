-- ========================================
-- 1. Clean up: Remove duplicate 'user' role from Mamadou (agent)
-- ========================================
DELETE FROM public.user_roles
WHERE user_id = '24fc2f5b-1960-4ea0-a9bc-511593e98b53'
  AND role = 'user';

-- ========================================
-- 2. Trigger: Prevent non-admin users from having multiple roles
-- ========================================
CREATE OR REPLACE FUNCTION public.enforce_single_role_for_non_admins()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_count INTEGER;
  v_is_admin BOOLEAN;
BEGIN
  -- Check if the user is/will be an admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.user_id AND role = 'admin'
  ) OR NEW.role = 'admin'
  INTO v_is_admin;

  -- Admins are exempt — they can hold multiple roles
  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  -- For non-admins: check if they already have any role
  SELECT COUNT(*) INTO v_existing_count
  FROM public.user_roles
  WHERE user_id = NEW.user_id
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF v_existing_count >= 1 THEN
    RAISE EXCEPTION 'يُسمح بدور واحد فقط لكل مستخدم (الأدمن مستثنى). المستخدم لديه دور بالفعل.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_single_role ON public.user_roles;
CREATE TRIGGER trg_enforce_single_role
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_role_for_non_admins();