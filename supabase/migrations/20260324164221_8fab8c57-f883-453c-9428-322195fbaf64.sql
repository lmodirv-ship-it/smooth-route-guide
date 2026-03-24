CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_requested_role text;
  v_driver_type text;
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
  v_driver_type := COALESCE(NEW.raw_user_meta_data->>'driver_type', 'ride');
  
  CASE v_requested_role
    WHEN 'driver' THEN v_role := 'driver';
    WHEN 'admin' THEN v_role := 'user';
    WHEN 'agent' THEN v_role := 'user';
    ELSE v_role := 'user';
  END CASE;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  INSERT INTO public.wallet (user_id) VALUES (NEW.id);

  IF v_role = 'driver' THEN
    INSERT INTO public.drivers (user_id, status, driver_type) VALUES (NEW.id, 'inactive', v_driver_type);
  END IF;

  RETURN NEW;
END;
$function$;