
-- Update existing user codes to have 'A' prefix (clients)
UPDATE profiles SET user_code = 'A' || user_code WHERE user_code IS NOT NULL AND user_code != '' AND user_code NOT LIKE 'A%';

-- Update existing store codes to have 'R' prefix (restaurants)
UPDATE stores SET store_code = 'R' || store_code WHERE store_code IS NOT NULL AND store_code != '' AND store_code NOT LIKE 'R%';

-- Update existing driver codes based on driver_type
UPDATE drivers SET driver_code = 'S' || driver_code WHERE driver_code IS NOT NULL AND driver_code != '' AND driver_type = 'ride' AND driver_code NOT LIKE 'S%';
UPDATE drivers SET driver_code = 'D' || driver_code WHERE driver_code IS NOT NULL AND driver_code != '' AND driver_type = 'delivery' AND driver_code NOT LIKE 'D%';

-- Generate codes for profiles that don't have one yet
UPDATE profiles SET user_code = 'A' || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0') WHERE user_code IS NULL OR user_code = '';

-- Generate codes for stores that don't have one yet
UPDATE stores SET store_code = 'R' || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0') WHERE store_code IS NULL OR store_code = '';

-- Generate codes for drivers that don't have one yet
UPDATE drivers SET driver_code = CASE WHEN driver_type = 'delivery' THEN 'D' ELSE 'S' END || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0') WHERE driver_code IS NULL OR driver_code = '';

-- Update the handle_new_user function to generate prefixed codes
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_requested_role text;
  v_role app_role;
  v_user_code text;
BEGIN
  v_user_code := 'A' || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0');
  
  INSERT INTO public.profiles (id, name, email, phone, user_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    v_user_code
  );

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

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  INSERT INTO public.wallet (user_id) VALUES (NEW.id);

  IF v_role = 'driver' THEN
    INSERT INTO public.drivers (user_id, status, driver_type, driver_code) 
    VALUES (NEW.id, 'inactive', 'ride', 'S' || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0'));
  END IF;

  IF v_role = 'delivery' THEN
    INSERT INTO public.drivers (user_id, status, driver_type, driver_code) 
    VALUES (NEW.id, 'inactive', 'delivery', 'D' || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0'));
  END IF;

  RETURN NEW;
END;
$function$;
