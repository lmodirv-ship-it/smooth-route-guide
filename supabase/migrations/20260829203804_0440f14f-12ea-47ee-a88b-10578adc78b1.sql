CREATE OR REPLACE FUNCTION public.guard_store_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin'::public.app_role)
     OR public.has_role(auth.uid(), 'agent'::public.app_role) THEN
    RETURN NEW;
  END IF;

  NEW.id              := OLD.id;
  NEW.owner_id        := OLD.owner_id;
  NEW.is_confirmed    := OLD.is_confirmed;
  NEW.commission_rate := OLD.commission_rate;
  NEW.rating          := OLD.rating;
  NEW.store_code      := OLD.store_code;
  NEW.created_at      := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_store_protected_columns_trg ON public.stores;
CREATE TRIGGER guard_store_protected_columns_trg
BEFORE UPDATE ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.guard_store_protected_columns();

DROP TRIGGER IF EXISTS guard_profile_protected_columns_trg ON public.profiles;
CREATE TRIGGER guard_profile_protected_columns_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_protected_columns();