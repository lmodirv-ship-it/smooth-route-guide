
-- Add proof photo and net earning columns to delivery_orders
ALTER TABLE public.delivery_orders ADD COLUMN IF NOT EXISTS proof_photo_url text;
ALTER TABLE public.delivery_orders ADD COLUMN IF NOT EXISTS driver_net_earning numeric;

-- Create driver_tips table
CREATE TABLE public.driver_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.delivery_orders(id),
  trip_id uuid REFERENCES public.trips(id),
  tipper_id uuid NOT NULL,
  driver_id uuid NOT NULL REFERENCES public.drivers(id),
  amount numeric NOT NULL DEFAULT 0,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can tip on their orders"
  ON public.driver_tips FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = tipper_id);

CREATE POLICY "Users can view own tips"
  ON public.driver_tips FOR SELECT
  TO authenticated
  USING (auth.uid() = tipper_id OR driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

-- Create restaurant_ratings table
CREATE TABLE public.restaurant_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id),
  driver_id uuid NOT NULL REFERENCES public.drivers(id),
  order_id uuid REFERENCES public.delivery_orders(id),
  score integer NOT NULL CHECK (score >= 1 AND score <= 5),
  wait_time_minutes integer,
  order_accuracy boolean DEFAULT true,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurant_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can rate restaurants"
  ON public.restaurant_ratings FOR INSERT
  TO authenticated
  WITH CHECK (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can view restaurant ratings"
  ON public.restaurant_ratings FOR SELECT
  TO authenticated
  USING (true);
