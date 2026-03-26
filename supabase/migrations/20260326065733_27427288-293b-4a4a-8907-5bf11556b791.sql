
CREATE TABLE public.commission_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL UNIQUE,
  rate numeric NOT NULL DEFAULT 5,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.commission_rates ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins can manage commission rates"
  ON public.commission_rates FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Agents can view and update
CREATE POLICY "Agents can view commission rates"
  ON public.commission_rates FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'agent'::app_role));

CREATE POLICY "Agents can update commission rates"
  ON public.commission_rates FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'agent'::app_role));

-- Smart assistant can view
CREATE POLICY "Smart assistant can view commission rates"
  ON public.commission_rates FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'smart_admin_assistant'::app_role));

-- Insert default rates for all categories
INSERT INTO public.commission_rates (category, rate) VALUES
  ('restaurants', 5),
  ('drivers', 5),
  ('delivery', 5),
  ('stores', 5),
  ('pharmacy_beauty', 5),
  ('courier', 5),
  ('express_market', 5),
  ('supermarket', 5),
  ('shops_gifts', 5);
