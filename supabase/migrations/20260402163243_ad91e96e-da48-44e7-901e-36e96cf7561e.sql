
-- 1. Attach the existing enforce function to customer_subscriptions
CREATE TRIGGER trg_enforce_customer_subscription
  BEFORE INSERT ON public.customer_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_customer_subscription_values();

-- 2. Create enforcement function for driver_subscriptions
CREATE OR REPLACE FUNCTION public.enforce_driver_subscription_values()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pkg RECORD;
BEGIN
  IF NEW.package_id IS NOT NULL THEN
    SELECT duration_days, price
    INTO pkg
    FROM public.driver_packages
    WHERE id = NEW.package_id AND is_active = true;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid or inactive package_id';
    END IF;
    
    NEW.amount_paid := pkg.price;
    NEW.expires_at := NEW.starts_at + (pkg.duration_days || ' days')::interval;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Attach to driver_subscriptions
CREATE TRIGGER trg_enforce_driver_subscription
  BEFORE INSERT ON public.driver_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_driver_subscription_values();
