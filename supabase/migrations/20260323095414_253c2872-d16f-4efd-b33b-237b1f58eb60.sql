
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
  -- Create profile
  INSERT INTO public.profiles (id, name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );

  -- Determine role from signup metadata
  v_requested_role := COALESCE(NEW.raw_user_meta_data->>'requested_role', 'user');
  
  -- Map requested_role to app_role enum
  CASE v_requested_role
    WHEN 'driver' THEN v_role := 'driver';
    WHEN 'admin' THEN v_role := 'user'; -- admin must be assigned manually
    WHEN 'agent' THEN v_role := 'user'; -- agent must be assigned manually
    ELSE v_role := 'user';
  END CASE;

  -- Assign role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);

  -- Create wallet
  INSERT INTO public.wallet (user_id) VALUES (NEW.id);

  -- If driver, create driver record
  IF v_role = 'driver' THEN
    INSERT INTO public.drivers (user_id, status) VALUES (NEW.id, 'inactive');
  END IF;

  RETURN NEW;
END;
$function$;
