
CREATE TABLE public.hn_stock_shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.hn_stock_orders(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.hn_stock_drivers(id) ON DELETE SET NULL,
  merchant_id UUID REFERENCES public.hn_stock_merchants(id) ON DELETE SET NULL,
  tracking_number TEXT,
  status TEXT NOT NULL DEFAULT 'preparing',
  delivery_address TEXT,
  delivery_city TEXT,
  delivery_phone TEXT,
  recipient_name TEXT,
  is_cod BOOLEAN DEFAULT false,
  cod_amount NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hn_stock_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view shipments"
  ON public.hn_stock_shipments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create shipments"
  ON public.hn_stock_shipments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update shipments"
  ON public.hn_stock_shipments FOR UPDATE TO authenticated USING (true);

CREATE TRIGGER update_hn_stock_shipments_updated_at
  BEFORE UPDATE ON public.hn_stock_shipments
  FOR EACH ROW EXECUTE FUNCTION public.hn_stock_update_timestamp();
