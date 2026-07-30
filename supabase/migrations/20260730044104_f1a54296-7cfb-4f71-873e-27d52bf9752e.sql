
-- 1. Fix mutable search_path on email queue functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq, extensions, pg_temp;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq, extensions, pg_temp;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq, extensions, pg_temp;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq, extensions, pg_temp;

-- 2. Prevent privilege/status escalation via profile self-update
CREATE OR REPLACE FUNCTION public.guard_profile_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  NEW.id             := OLD.id;
  NEW.is_confirmed   := OLD.is_confirmed;
  NEW.is_suspended   := OLD.is_suspended;
  NEW.avg_rating     := OLD.avg_rating;
  NEW.referral_count := OLD.referral_count;
  NEW.user_code      := OLD.user_code;
  NEW.referral_code  := OLD.referral_code;
  NEW.referred_by    := OLD.referred_by;
  NEW.created_at     := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_protected_columns_trg ON public.profiles;
CREATE TRIGGER guard_profile_protected_columns_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_protected_columns();

-- 3. Ratings: add WITH CHECK to the permissive ALL policy
DROP POLICY IF EXISTS "Users can manage own ratings" ON public.ratings;
CREATE POLICY "Users can manage own ratings"
ON public.ratings
FOR ALL
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = rated_by)
WITH CHECK (
  auth.uid() = rated_by
  AND rating_type IN ('customer_to_driver', 'driver_to_customer')
);

-- 4. Reservations: drivers may only change status/notes on their own routes
CREATE OR REPLACE FUNCTION public.guard_reservation_driver_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin'::app_role)
     OR public.has_role(auth.uid(), 'agent'::app_role)
     OR OLD.user_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  -- driver path: lock down everything except status / notes / updated_at
  NEW.id              := OLD.id;
  NEW.reservation_code:= OLD.reservation_code;
  NEW.route_id        := OLD.route_id;
  NEW.user_id         := OLD.user_id;
  NEW.seats_reserved  := OLD.seats_reserved;
  NEW.pickup_address  := OLD.pickup_address;
  NEW.pickup_lat      := OLD.pickup_lat;
  NEW.pickup_lng      := OLD.pickup_lng;
  NEW.travel_date     := OLD.travel_date;
  NEW.total_price     := OLD.total_price;
  NEW.currency        := OLD.currency;
  NEW.payment_status  := OLD.payment_status;
  NEW.created_at      := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_reservation_driver_update_trg ON public.reservations;
CREATE TRIGGER guard_reservation_driver_update_trg
BEFORE UPDATE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.guard_reservation_driver_update();

DROP POLICY IF EXISTS "reservations_driver_update_own_routes" ON public.reservations;
CREATE POLICY "reservations_driver_update_own_routes"
ON public.reservations
FOR UPDATE
TO authenticated
USING (
  route_id IN (
    SELECT r.id FROM routes r JOIN drivers d ON d.id = r.driver_id
    WHERE d.user_id = auth.uid()
  )
)
WITH CHECK (
  route_id IN (
    SELECT r.id FROM routes r JOIN drivers d ON d.id = r.driver_id
    WHERE d.user_id = auth.uid()
  )
);
