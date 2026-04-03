
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_requested_role text;
  v_role public.app_role;
  v_user_code text;
BEGIN
  v_user_code := 'A' || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0');

  WHILE EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_code = v_user_code
  ) LOOP
    v_user_code := 'A' || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0');
  END LOOP;

  INSERT INTO public.profiles (id, name, email, phone, user_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    v_user_code
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    user_code = COALESCE(public.profiles.user_code, EXCLUDED.user_code);

  v_requested_role := COALESCE(NEW.raw_user_meta_data->>'requested_role', 'user');

  CASE v_requested_role
    WHEN 'driver' THEN v_role := 'driver';
    WHEN 'delivery' THEN v_role := 'delivery';
    WHEN 'store_owner' THEN v_role := 'store_owner';
    WHEN 'smart_admin_assistant' THEN v_role := 'user';
    WHEN 'admin' THEN v_role := 'user';
    WHEN 'agent' THEN v_role := 'user';
    ELSE v_role := 'user';
  END CASE;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Grant 50 DH initial balance to every new user
  INSERT INTO public.wallet (user_id, balance)
  VALUES (NEW.id, 50)
  ON CONFLICT (user_id) DO NOTHING;

  IF v_role = 'driver' THEN
    INSERT INTO public.drivers (user_id, status, driver_type, driver_code)
    VALUES (NEW.id, 'inactive', 'ride', 'S' || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0'))
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_role = 'delivery' THEN
    INSERT INTO public.drivers (user_id, status, driver_type, driver_code)
    VALUES (NEW.id, 'inactive', 'delivery', 'D' || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0'))
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
