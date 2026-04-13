
-- ═══════════════════════════════════════════════════════════
-- HN-STOCK Tables (correct order to avoid FK issues)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE public.hn_stock_merchants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  company_name TEXT,
  bank_account_number TEXT,
  bank_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  api_key TEXT,
  preferred_warehouse TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.hn_stock_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.hn_stock_merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  marketplace_listed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.hn_stock_warehouses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  latitude NUMERIC(10,6),
  longitude NUMERIC(10,6),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.hn_stock_drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  vehicle_type TEXT,
  license_plate TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  total_deliveries INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.hn_stock_employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'warehouse_staff',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.hn_stock_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  merchant_id UUID NOT NULL REFERENCES public.hn_stock_merchants(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.hn_stock_products(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  city TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_amount NUMERIC(10,2) NOT NULL,
  cod_amount NUMERIC(10,2),
  delivery_fee NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'pending_confirmation',
  driver_id UUID REFERENCES public.hn_stock_drivers(id) ON DELETE SET NULL,
  warehouse_id UUID REFERENCES public.hn_stock_warehouses(id) ON DELETE SET NULL,
  notes TEXT,
  confirmation_status TEXT DEFAULT 'pending',
  confirmation_note TEXT,
  confirmed_at TIMESTAMPTZ,
  confirmed_by TEXT,
  packaging_type TEXT DEFAULT 'standard',
  packaging_fee NUMERIC(10,2) DEFAULT 0,
  branding_logo_url TEXT,
  print_approved BOOLEAN DEFAULT false,
  print_approved_by TEXT,
  print_notes TEXT,
  external_source TEXT,
  external_order_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.hn_stock_warehouse_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  warehouse_id UUID NOT NULL REFERENCES public.hn_stock_warehouses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.hn_stock_products(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES public.hn_stock_merchants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.hn_stock_call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.hn_stock_orders(id) ON DELETE CASCADE,
  operator_name TEXT NOT NULL,
  call_status TEXT NOT NULL,
  notes TEXT,
  called_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.hn_stock_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.hn_stock_merchants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.hn_stock_orders(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.hn_stock_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.hn_stock_merchants(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  method TEXT NOT NULL DEFAULT 'bank_transfer',
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.hn_stock_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  actor_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.hn_stock_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.hn_stock_contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_hn_stock_orders_merchant ON public.hn_stock_orders(merchant_id);
CREATE INDEX idx_hn_stock_orders_status ON public.hn_stock_orders(status);
CREATE INDEX idx_hn_stock_products_merchant ON public.hn_stock_products(merchant_id);
CREATE INDEX idx_hn_stock_transactions_merchant ON public.hn_stock_transactions(merchant_id);
CREATE INDEX idx_hn_stock_warehouse_inv ON public.hn_stock_warehouse_inventory(warehouse_id, product_id);
CREATE INDEX idx_hn_stock_call_logs_order ON public.hn_stock_call_logs(order_id);
CREATE INDEX idx_hn_stock_notifications_user ON public.hn_stock_notifications(user_id);
CREATE INDEX idx_hn_stock_payouts_merchant ON public.hn_stock_payouts(merchant_id);

-- Enable RLS
ALTER TABLE public.hn_stock_merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hn_stock_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hn_stock_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hn_stock_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hn_stock_warehouse_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hn_stock_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hn_stock_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hn_stock_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hn_stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hn_stock_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hn_stock_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hn_stock_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hn_stock_contact_messages ENABLE ROW LEVEL SECURITY;

-- RLS: Admin full access
CREATE POLICY "Admin full access on hn_stock_merchants" ON public.hn_stock_merchants FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin full access on hn_stock_products" ON public.hn_stock_products FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin full access on hn_stock_orders" ON public.hn_stock_orders FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin full access on hn_stock_warehouses" ON public.hn_stock_warehouses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin full access on hn_stock_warehouse_inventory" ON public.hn_stock_warehouse_inventory FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin full access on hn_stock_drivers" ON public.hn_stock_drivers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin full access on hn_stock_employees" ON public.hn_stock_employees FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin full access on hn_stock_call_logs" ON public.hn_stock_call_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin full access on hn_stock_transactions" ON public.hn_stock_transactions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin full access on hn_stock_payouts" ON public.hn_stock_payouts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin full access on hn_stock_activity" ON public.hn_stock_activity FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin full access on hn_stock_notifications" ON public.hn_stock_notifications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin full access on hn_stock_contact_messages" ON public.hn_stock_contact_messages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Agent access
CREATE POLICY "Agent read hn_stock_orders" ON public.hn_stock_orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'agent'));
CREATE POLICY "Agent read hn_stock_call_logs" ON public.hn_stock_call_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'agent'));
CREATE POLICY "Agent insert hn_stock_call_logs" ON public.hn_stock_call_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'agent'));

-- Merchant self-access
CREATE POLICY "Merchant read own record" ON public.hn_stock_merchants FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Merchant read own products" ON public.hn_stock_products FOR SELECT TO authenticated USING (merchant_id IN (SELECT id FROM public.hn_stock_merchants WHERE user_id = auth.uid()));
CREATE POLICY "Merchant insert own products" ON public.hn_stock_products FOR INSERT TO authenticated WITH CHECK (merchant_id IN (SELECT id FROM public.hn_stock_merchants WHERE user_id = auth.uid()));
CREATE POLICY "Merchant update own products" ON public.hn_stock_products FOR UPDATE TO authenticated USING (merchant_id IN (SELECT id FROM public.hn_stock_merchants WHERE user_id = auth.uid()));
CREATE POLICY "Merchant read own orders" ON public.hn_stock_orders FOR SELECT TO authenticated USING (merchant_id IN (SELECT id FROM public.hn_stock_merchants WHERE user_id = auth.uid()));
CREATE POLICY "Merchant read own transactions" ON public.hn_stock_transactions FOR SELECT TO authenticated USING (merchant_id IN (SELECT id FROM public.hn_stock_merchants WHERE user_id = auth.uid()));
CREATE POLICY "Merchant read own payouts" ON public.hn_stock_payouts FOR SELECT TO authenticated USING (merchant_id IN (SELECT id FROM public.hn_stock_merchants WHERE user_id = auth.uid()));
CREATE POLICY "Merchant request payout" ON public.hn_stock_payouts FOR INSERT TO authenticated WITH CHECK (merchant_id IN (SELECT id FROM public.hn_stock_merchants WHERE user_id = auth.uid()));

-- Notifications
CREATE POLICY "User read own notifications" ON public.hn_stock_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "User update own notifications" ON public.hn_stock_notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Public access
CREATE POLICY "Public insert contact messages" ON public.hn_stock_contact_messages FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public read warehouses" ON public.hn_stock_warehouses FOR SELECT TO anon USING (true);
CREATE POLICY "Auth read warehouses" ON public.hn_stock_warehouses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read marketplace products" ON public.hn_stock_products FOR SELECT TO anon USING (marketplace_listed = true);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.hn_stock_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_hn_stock_merchants_updated BEFORE UPDATE ON public.hn_stock_merchants FOR EACH ROW EXECUTE FUNCTION public.hn_stock_update_timestamp();
CREATE TRIGGER trg_hn_stock_products_updated BEFORE UPDATE ON public.hn_stock_products FOR EACH ROW EXECUTE FUNCTION public.hn_stock_update_timestamp();
CREATE TRIGGER trg_hn_stock_orders_updated BEFORE UPDATE ON public.hn_stock_orders FOR EACH ROW EXECUTE FUNCTION public.hn_stock_update_timestamp();
CREATE TRIGGER trg_hn_stock_warehouses_updated BEFORE UPDATE ON public.hn_stock_warehouses FOR EACH ROW EXECUTE FUNCTION public.hn_stock_update_timestamp();
CREATE TRIGGER trg_hn_stock_drivers_updated BEFORE UPDATE ON public.hn_stock_drivers FOR EACH ROW EXECUTE FUNCTION public.hn_stock_update_timestamp();
CREATE TRIGGER trg_hn_stock_employees_updated BEFORE UPDATE ON public.hn_stock_employees FOR EACH ROW EXECUTE FUNCTION public.hn_stock_update_timestamp();
CREATE TRIGGER trg_hn_stock_payouts_updated BEFORE UPDATE ON public.hn_stock_payouts FOR EACH ROW EXECUTE FUNCTION public.hn_stock_update_timestamp();
