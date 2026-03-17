
-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  -- Default role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  -- Create wallet
  INSERT INTO public.wallet (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_center ENABLE ROW LEVEL SECURITY;

-- ========== PROFILES ==========
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ========== USER_ROLES ==========
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ========== DRIVERS ==========
CREATE POLICY "Drivers can view own record" ON public.drivers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Drivers can update own record" ON public.drivers FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage drivers" ON public.drivers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view active drivers" ON public.drivers FOR SELECT TO authenticated USING (status = 'active');

-- ========== VEHICLES ==========
CREATE POLICY "Drivers can manage own vehicles" ON public.vehicles FOR ALL TO authenticated
  USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage vehicles" ON public.vehicles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ========== DOCUMENTS ==========
CREATE POLICY "Drivers can manage own documents" ON public.documents FOR ALL TO authenticated
  USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage documents" ON public.documents FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ========== RIDE REQUESTS ==========
CREATE POLICY "Users can manage own requests" ON public.ride_requests FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Drivers can view pending requests" ON public.ride_requests FOR SELECT TO authenticated
  USING (status = 'pending' AND public.has_role(auth.uid(), 'driver'));
CREATE POLICY "Admins can manage requests" ON public.ride_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ========== TRIPS ==========
CREATE POLICY "Users can view own trips" ON public.trips FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Drivers can view own trips" ON public.trips FOR SELECT TO authenticated
  USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));
CREATE POLICY "Drivers can update own trips" ON public.trips FOR UPDATE TO authenticated
  USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage trips" ON public.trips FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ========== PAYMENTS ==========
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT TO authenticated
  USING (trip_id IN (SELECT id FROM public.trips WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage payments" ON public.payments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ========== RATINGS ==========
CREATE POLICY "Users can manage own ratings" ON public.ratings FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Drivers can view own ratings" ON public.ratings FOR SELECT TO authenticated
  USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage ratings" ON public.ratings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ========== NOTIFICATIONS ==========
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage notifications" ON public.notifications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ========== EARNINGS ==========
CREATE POLICY "Drivers can view own earnings" ON public.earnings FOR SELECT TO authenticated
  USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage earnings" ON public.earnings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ========== WALLET ==========
CREATE POLICY "Users can view own wallet" ON public.wallet FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage wallets" ON public.wallet FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ========== PROMOTIONS ==========
CREATE POLICY "Anyone can view active promotions" ON public.promotions FOR SELECT TO authenticated USING (active = true);
CREATE POLICY "Admins can manage promotions" ON public.promotions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ========== CALL CENTER ==========
CREATE POLICY "Users can view own tickets" ON public.call_center FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create tickets" ON public.call_center FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Agents can manage tickets" ON public.call_center FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'agent'));
CREATE POLICY "Admins can manage call center" ON public.call_center FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
