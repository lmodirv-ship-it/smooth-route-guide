
-- Create delivery_orders table
CREATE TABLE public.delivery_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'general',
  store_name text DEFAULT '',
  items jsonb DEFAULT '[]'::jsonb,
  pickup_address text DEFAULT '',
  pickup_lat numeric,
  pickup_lng numeric,
  delivery_address text DEFAULT '',
  delivery_lat numeric,
  delivery_lng numeric,
  status text NOT NULL DEFAULT 'pending',
  driver_id uuid,
  estimated_price numeric DEFAULT 0,
  final_price numeric,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz
);

-- Enable RLS
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage own delivery orders"
  ON public.delivery_orders FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all delivery orders"
  ON public.delivery_orders FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Drivers can view assigned delivery orders"
  ON public.delivery_orders FOR SELECT TO authenticated
  USING (driver_id IN (SELECT d.id FROM drivers d WHERE d.user_id = auth.uid()));

CREATE POLICY "Drivers can update assigned delivery orders"
  ON public.delivery_orders FOR UPDATE TO authenticated
  USING (driver_id IN (SELECT d.id FROM drivers d WHERE d.user_id = auth.uid()));

CREATE POLICY "Agents can manage delivery orders"
  ON public.delivery_orders FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'agent'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_orders;
