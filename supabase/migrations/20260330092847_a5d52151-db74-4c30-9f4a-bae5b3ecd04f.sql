
-- 1. Add RLS policies to face_auth_attempts (currently unprotected)
ALTER TABLE public.face_auth_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage face_auth_attempts"
ON public.face_auth_attempts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can view face_auth_attempts"
ON public.face_auth_attempts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'agent'::app_role));

-- 2. Add trigger to enforce customer_subscriptions values from package
CREATE OR REPLACE FUNCTION public.enforce_customer_subscription_values()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pkg RECORD;
BEGIN
  IF NEW.package_id IS NOT NULL THEN
    SELECT duration_days, credits, price
    INTO pkg
    FROM public.customer_packages
    WHERE id = NEW.package_id AND is_active = true;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid or inactive package_id';
    END IF;
    
    NEW.credits_total := COALESCE(pkg.credits, 0);
    NEW.credits_remaining := COALESCE(pkg.credits, 0);
    NEW.amount_paid := pkg.price;
    NEW.expires_at := NEW.starts_at + (pkg.duration_days || ' days')::interval;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_customer_subscription_values
BEFORE INSERT ON public.customer_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_customer_subscription_values();

-- 3. Make smart-assistant-files bucket private
UPDATE storage.buckets SET public = false WHERE id = 'smart-assistant-files';

-- 4. Remove the anon public policy on smart-assistant-files
DROP POLICY IF EXISTS "Public can view assistant files" ON storage.objects;
