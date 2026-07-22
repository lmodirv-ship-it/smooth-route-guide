
-- ============ ROUTES ============
CREATE TABLE public.routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  route_code text UNIQUE,
  origin_address text NOT NULL,
  origin_lat numeric(10,7),
  origin_lng numeric(10,7),
  destination_address text NOT NULL,
  destination_lat numeric(10,7),
  destination_lng numeric(10,7),
  departure_time time NOT NULL,
  days_of_week text[] NOT NULL DEFAULT ARRAY['mon','tue','wed','thu','fri','sat','sun'],
  seats_total integer NOT NULL DEFAULT 4 CHECK (seats_total > 0),
  seats_available integer NOT NULL DEFAULT 4 CHECK (seats_available >= 0),
  price_per_seat numeric(10,2) NOT NULL DEFAULT 0 CHECK (price_per_seat >= 0),
  currency text NOT NULL DEFAULT 'MAD',
  zone_id uuid,
  city text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.routes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routes TO authenticated;
GRANT ALL ON public.routes TO service_role;

ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "routes_public_read_active" ON public.routes
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "routes_driver_manage_own" ON public.routes
  FOR ALL TO authenticated
  USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()))
  WITH CHECK (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "routes_admin_agent_full" ON public.routes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role));

CREATE INDEX idx_routes_driver ON public.routes(driver_id);
CREATE INDEX idx_routes_active_time ON public.routes(is_active, departure_time);
CREATE INDEX idx_routes_city ON public.routes(city) WHERE is_active = true;

CREATE TRIGGER trg_routes_updated_at
  BEFORE UPDATE ON public.routes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.auto_generate_route_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.route_code IS NULL OR NEW.route_code = '' THEN
    NEW.route_code := 'RT' || LPAD(FLOOR(RANDOM() * 999999 + 1)::text, 6, '0');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_routes_auto_code
  BEFORE INSERT ON public.routes
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_route_code();

-- ============ RESERVATIONS ============
CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_code text UNIQUE,
  route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seats_reserved integer NOT NULL DEFAULT 1 CHECK (seats_reserved > 0),
  pickup_address text,
  pickup_lat numeric(10,7),
  pickup_lng numeric(10,7),
  travel_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed')),
  total_price numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'MAD',
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','refunded')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reservations_user_read_own" ON public.reservations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "reservations_user_insert_own" ON public.reservations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reservations_user_update_own" ON public.reservations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reservations_driver_read_own_routes" ON public.reservations
  FOR SELECT TO authenticated
  USING (route_id IN (
    SELECT r.id FROM public.routes r
    JOIN public.drivers d ON d.id = r.driver_id
    WHERE d.user_id = auth.uid()
  ));

CREATE POLICY "reservations_driver_update_own_routes" ON public.reservations
  FOR UPDATE TO authenticated
  USING (route_id IN (
    SELECT r.id FROM public.routes r
    JOIN public.drivers d ON d.id = r.driver_id
    WHERE d.user_id = auth.uid()
  ));

CREATE POLICY "reservations_admin_agent_full" ON public.reservations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role));

CREATE INDEX idx_reservations_user ON public.reservations(user_id, status);
CREATE INDEX idx_reservations_route ON public.reservations(route_id, status);
CREATE INDEX idx_reservations_travel_date ON public.reservations(travel_date);

CREATE TRIGGER trg_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.auto_generate_reservation_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.reservation_code IS NULL OR NEW.reservation_code = '' THEN
    NEW.reservation_code := 'B' || LPAD(FLOOR(RANDOM() * 999999 + 1)::text, 6, '0');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_reservations_auto_code
  BEFORE INSERT ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_reservation_code();

-- Auto-decrement seats_available on confirmed reservation
CREATE OR REPLACE FUNCTION public.sync_route_seats_available()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status IN ('pending','confirmed') THEN
    UPDATE public.routes SET seats_available = GREATEST(0, seats_available - NEW.seats_reserved)
    WHERE id = NEW.route_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IN ('pending','confirmed') AND NEW.status IN ('cancelled') THEN
      UPDATE public.routes SET seats_available = LEAST(seats_total, seats_available + OLD.seats_reserved)
      WHERE id = OLD.route_id;
    ELSIF OLD.status = 'cancelled' AND NEW.status IN ('pending','confirmed') THEN
      UPDATE public.routes SET seats_available = GREATEST(0, seats_available - NEW.seats_reserved)
      WHERE id = NEW.route_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_reservations_sync_seats
  AFTER INSERT OR UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.sync_route_seats_available();
