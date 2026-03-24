-- 1. Add store_owner to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'store_owner';

-- 2. Update handle_new_user to support store_owner registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_requested_role text;
  v_role app_role;
BEGIN
  INSERT INTO public.profiles (id, name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );

  v_requested_role := COALESCE(NEW.raw_user_meta_data->>'requested_role', 'user');
  
  CASE v_requested_role
    WHEN 'driver' THEN v_role := 'driver';
    WHEN 'delivery' THEN v_role := 'delivery';
    WHEN 'store_owner' THEN v_role := 'store_owner';
    WHEN 'admin' THEN v_role := 'user';
    WHEN 'agent' THEN v_role := 'user';
    ELSE v_role := 'user';
  END CASE;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  INSERT INTO public.wallet (user_id) VALUES (NEW.id);

  IF v_role = 'driver' THEN
    INSERT INTO public.drivers (user_id, status, driver_type) VALUES (NEW.id, 'inactive', 'ride');
  END IF;

  IF v_role = 'delivery' THEN
    INSERT INTO public.drivers (user_id, status, driver_type) VALUES (NEW.id, 'inactive', 'delivery');
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Add RLS policy: store_owners can view their own stores (including closed)
CREATE POLICY "Store owners can view own stores"
ON public.stores
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- 4. Allow store_owners to insert their own stores
CREATE POLICY "Store owners can insert own store"
ON public.stores
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());