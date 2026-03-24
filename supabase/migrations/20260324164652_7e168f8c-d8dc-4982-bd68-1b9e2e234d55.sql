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

-- Allow delivery drivers to view and update their own driver record
CREATE POLICY "Delivery drivers can view own record"
ON public.drivers FOR SELECT TO authenticated
USING (auth.uid() = user_id AND has_role(auth.uid(), 'delivery'::app_role));

CREATE POLICY "Delivery drivers can update own record"
ON public.drivers FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND has_role(auth.uid(), 'delivery'::app_role));

-- Allow delivery role to view ready_for_driver orders
CREATE POLICY "Delivery drivers can view ready orders"
ON public.delivery_orders FOR SELECT TO authenticated
USING (status = 'ready_for_driver' AND has_role(auth.uid(), 'delivery'::app_role));

-- Allow delivery role to accept orders
CREATE POLICY "Delivery drivers can accept orders"
ON public.delivery_orders FOR UPDATE TO authenticated
USING (status = 'ready_for_driver' AND has_role(auth.uid(), 'delivery'::app_role))
WITH CHECK (status = 'driver_assigned' AND driver_id IN (SELECT d.id FROM drivers d WHERE d.user_id = auth.uid()));

-- Allow delivery role to view and update assigned orders
CREATE POLICY "Delivery drivers can view assigned orders"
ON public.delivery_orders FOR SELECT TO authenticated
USING (driver_id IN (SELECT d.id FROM drivers d WHERE d.user_id = auth.uid()) AND has_role(auth.uid(), 'delivery'::app_role));

CREATE POLICY "Delivery drivers can update assigned orders"
ON public.delivery_orders FOR UPDATE TO authenticated
USING (driver_id IN (SELECT d.id FROM drivers d WHERE d.user_id = auth.uid()) AND has_role(auth.uid(), 'delivery'::app_role));