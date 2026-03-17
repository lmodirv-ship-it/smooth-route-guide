
-- complaints table
CREATE TABLE public.complaints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  driver_id UUID REFERENCES public.drivers(id),
  trip_id UUID REFERENCES public.trips(id),
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  agent_id UUID,
  agent_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage complaints" ON public.complaints FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Agents can manage complaints" ON public.complaints FOR ALL TO authenticated USING (has_role(auth.uid(), 'agent'));
CREATE POLICY "Users can view own complaints" ON public.complaints FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create complaints" ON public.complaints FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- tickets table
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  user_id UUID,
  driver_id UUID REFERENCES public.drivers(id),
  trip_id UUID REFERENCES public.trips(id),
  agent_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tickets" ON public.tickets FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Agents can manage tickets" ON public.tickets FOR ALL TO authenticated USING (has_role(auth.uid(), 'agent'));
CREATE POLICY "Users can view own tickets" ON public.tickets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create tickets" ON public.tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- alerts table
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES public.drivers(id),
  type TEXT NOT NULL DEFAULT 'warning',
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage alerts" ON public.alerts FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Agents can view alerts" ON public.alerts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'agent'));
CREATE POLICY "Drivers can view own alerts" ON public.alerts FOR SELECT TO authenticated USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

-- call_logs table
CREATE TABLE public.call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_name TEXT NOT NULL DEFAULT '',
  caller_phone TEXT NOT NULL DEFAULT '',
  call_type TEXT NOT NULL DEFAULT 'incoming',
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'answered',
  duration INTEGER DEFAULT 0,
  agent_id UUID,
  user_id UUID,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage call_logs" ON public.call_logs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Agents can manage call_logs" ON public.call_logs FOR ALL TO authenticated USING (has_role(auth.uid(), 'agent'));

-- trip_status_history table
CREATE TABLE public.trip_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT '',
  changed_by UUID,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trip_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage trip_status_history" ON public.trip_status_history FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own trip history" ON public.trip_status_history FOR SELECT TO authenticated USING (
  trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
);
CREATE POLICY "Drivers can view own trip history" ON public.trip_status_history FOR SELECT TO authenticated USING (
  trip_id IN (SELECT id FROM trips WHERE driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()))
);

-- app_settings table
CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings" ON public.app_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read settings" ON public.app_settings FOR SELECT TO authenticated USING (true);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_logs;
