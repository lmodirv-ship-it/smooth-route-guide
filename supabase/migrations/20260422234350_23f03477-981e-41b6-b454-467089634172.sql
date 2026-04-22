
-- 1) Platform revenue ledger
CREATE TABLE IF NOT EXISTS public.platform_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('trip','delivery','subscription','tip','other')),
  source_id uuid,
  driver_id uuid,
  user_id uuid,
  gross_amount numeric(12,2) NOT NULL DEFAULT 0,
  commission_rate numeric(5,4) NOT NULL DEFAULT 0.05,
  commission_amount numeric(12,2) NOT NULL DEFAULT 0,
  driver_net numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'MAD',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_revenue_created_at
  ON public.platform_revenue (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_source
  ON public.platform_revenue (source_type, source_id);

ALTER TABLE public.platform_revenue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage platform revenue" ON public.platform_revenue;
CREATE POLICY "Admins manage platform revenue"
ON public.platform_revenue
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) Auto-record commission when a trip is completed
CREATE OR REPLACE FUNCTION public.record_trip_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate numeric(5,4) := 0.05;
  v_gross numeric(12,2);
  v_commission numeric(12,2);
  v_net numeric(12,2);
BEGIN
  IF NEW.status = 'completed'
     AND (OLD.status IS DISTINCT FROM 'completed')
     AND COALESCE(NEW.fare, 0) > 0 THEN

    -- Avoid duplicates
    IF EXISTS (
      SELECT 1 FROM public.platform_revenue
      WHERE source_type = 'trip' AND source_id = NEW.id
    ) THEN
      RETURN NEW;
    END IF;

    v_gross := NEW.fare;
    v_commission := ROUND(v_gross * v_rate, 2);
    v_net := v_gross - v_commission;

    INSERT INTO public.platform_revenue
      (source_type, source_id, driver_id, user_id, gross_amount,
       commission_rate, commission_amount, driver_net, currency, notes)
    VALUES
      ('trip', NEW.id, NEW.driver_id, NEW.user_id, v_gross,
       v_rate, v_commission, v_net, 'MAD',
       'Auto: trip ' || COALESCE(NEW.trip_code, NEW.id::text));

    -- Add net earnings to driver
    IF NEW.driver_id IS NOT NULL THEN
      INSERT INTO public.earnings (driver_id, amount, date)
      VALUES (NEW.driver_id, v_net, CURRENT_DATE);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_trip_commission ON public.trips;
CREATE TRIGGER trg_record_trip_commission
AFTER UPDATE ON public.trips
FOR EACH ROW
EXECUTE FUNCTION public.record_trip_commission();

-- 3) Auto-record commission when a delivery order is delivered
CREATE OR REPLACE FUNCTION public.record_delivery_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate numeric(5,4) := 0.05;
  v_gross numeric(12,2);
  v_commission numeric(12,2);
  v_net numeric(12,2);
  v_driver_uuid uuid;
BEGIN
  IF NEW.status = 'delivered'
     AND (OLD.status IS DISTINCT FROM 'delivered')
     AND COALESCE(NEW.final_price, NEW.estimated_price, 0) > 0 THEN

    IF EXISTS (
      SELECT 1 FROM public.platform_revenue
      WHERE source_type = 'delivery' AND source_id = NEW.id
    ) THEN
      RETURN NEW;
    END IF;

    v_gross := COALESCE(NEW.final_price, NEW.estimated_price, 0);
    v_commission := ROUND(v_gross * v_rate, 2);
    v_net := v_gross - v_commission;

    INSERT INTO public.platform_revenue
      (source_type, source_id, driver_id, user_id, gross_amount,
       commission_rate, commission_amount, driver_net, currency, notes)
    VALUES
      ('delivery', NEW.id, NEW.driver_id, NEW.user_id, v_gross,
       v_rate, v_commission, v_net, 'MAD',
       'Auto: order ' || COALESCE(NEW.order_code, NEW.id::text));

    IF NEW.driver_id IS NOT NULL THEN
      INSERT INTO public.earnings (driver_id, amount, date)
      VALUES (NEW.driver_id, v_net, CURRENT_DATE);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_delivery_commission ON public.delivery_orders;
CREATE TRIGGER trg_record_delivery_commission
AFTER UPDATE ON public.delivery_orders
FOR EACH ROW
EXECUTE FUNCTION public.record_delivery_commission();
