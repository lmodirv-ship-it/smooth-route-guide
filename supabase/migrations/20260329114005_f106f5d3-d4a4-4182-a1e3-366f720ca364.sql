
-- ═══════════════════════════════════════════════════════════════
-- Universal Entity Coding System
-- Prefix convention:
--   A = Customer (profiles.user_code) — already exists
--   S = Ride Driver (drivers.driver_code) — already exists  
--   D = Delivery Driver (drivers.driver_code) — already exists
--   R = Store (stores.store_code) — already exists
--   T = Trip (trips.trip_code) — NEW
--   O = Delivery Order (delivery_orders.order_code) — NEW
--   V = Vehicle (vehicles.vehicle_code) — NEW
--   P = Payment (payments.payment_code) — NEW
--   C = Complaint (complaints.complaint_code) — NEW
--   K = Ticket (tickets.ticket_code) — already exists
--   Z = Zone (zones.zone_code) — already exists
-- ═══════════════════════════════════════════════════════════════

-- 1) Add missing code columns (additive only)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS trip_code text UNIQUE;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS order_code text UNIQUE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_code text UNIQUE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_code text UNIQUE;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS complaint_code text UNIQUE;

-- 2) Universal code generator function
CREATE OR REPLACE FUNCTION public.generate_entity_code(prefix text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN prefix || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0');
END;
$$;

-- 3) Trigger function for auto-generating codes on INSERT
CREATE OR REPLACE FUNCTION public.auto_generate_entity_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prefix text;
  v_code_col text;
  v_code text;
  v_exists boolean;
  v_attempts int := 0;
BEGIN
  -- Determine prefix and column based on table
  CASE TG_TABLE_NAME
    WHEN 'profiles' THEN v_prefix := 'A'; v_code_col := 'user_code';
    WHEN 'stores' THEN v_prefix := 'R'; v_code_col := 'store_code';
    WHEN 'trips' THEN v_prefix := 'T'; v_code_col := 'trip_code';
    WHEN 'delivery_orders' THEN v_prefix := 'O'; v_code_col := 'order_code';
    WHEN 'vehicles' THEN v_prefix := 'V'; v_code_col := 'vehicle_code';
    WHEN 'payments' THEN v_prefix := 'P'; v_code_col := 'payment_code';
    WHEN 'complaints' THEN v_prefix := 'C'; v_code_col := 'complaint_code';
    WHEN 'tickets' THEN v_prefix := 'K'; v_code_col := 'ticket_code';
    WHEN 'zones' THEN v_prefix := 'Z'; v_code_col := 'zone_code';
    ELSE RETURN NEW;
  END CASE;

  -- Skip if code already set
  EXECUTE format('SELECT ($1).%I IS NOT NULL AND ($1).%I <> ''''', v_code_col, v_code_col) INTO v_exists USING NEW;
  IF v_exists THEN RETURN NEW; END IF;

  -- Generate unique code with retry
  LOOP
    v_code := generate_entity_code(v_prefix);
    EXECUTE format('SELECT NOT EXISTS(SELECT 1 FROM %I WHERE %I = $1)', TG_TABLE_NAME, v_code_col) INTO v_exists USING v_code;
    EXIT WHEN v_exists OR v_attempts > 10;
    v_attempts := v_attempts + 1;
  END LOOP;

  NEW := json_populate_record(NEW, json_build_object(v_code_col, v_code)::json);
  RETURN NEW;
END;
$$;

-- 4) Create triggers for tables that don't have auto-code generation yet

CREATE OR REPLACE TRIGGER trg_trips_auto_code
  BEFORE INSERT ON trips
  FOR EACH ROW EXECUTE FUNCTION auto_generate_entity_code();

CREATE OR REPLACE TRIGGER trg_delivery_orders_auto_code
  BEFORE INSERT ON delivery_orders
  FOR EACH ROW EXECUTE FUNCTION auto_generate_entity_code();

CREATE OR REPLACE TRIGGER trg_vehicles_auto_code
  BEFORE INSERT ON vehicles
  FOR EACH ROW EXECUTE FUNCTION auto_generate_entity_code();

CREATE OR REPLACE TRIGGER trg_payments_auto_code
  BEFORE INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION auto_generate_entity_code();

CREATE OR REPLACE TRIGGER trg_complaints_auto_code
  BEFORE INSERT ON complaints
  FOR EACH ROW EXECUTE FUNCTION auto_generate_entity_code();

CREATE OR REPLACE TRIGGER trg_stores_auto_code
  BEFORE INSERT ON stores
  FOR EACH ROW EXECUTE FUNCTION auto_generate_entity_code();

CREATE OR REPLACE TRIGGER trg_tickets_auto_code
  BEFORE INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION auto_generate_entity_code();

CREATE OR REPLACE TRIGGER trg_zones_auto_code
  BEFORE INSERT ON zones
  FOR EACH ROW EXECUTE FUNCTION auto_generate_entity_code();
