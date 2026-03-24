
-- call_center: full access
CREATE POLICY "Smart assistant can manage call center" ON public.call_center FOR ALL TO authenticated USING (has_role(auth.uid(), 'smart_admin_assistant'::app_role)) WITH CHECK (has_role(auth.uid(), 'smart_admin_assistant'::app_role));

-- call_logs: full access
CREATE POLICY "Smart assistant can manage call_logs" ON public.call_logs FOR ALL TO authenticated USING (has_role(auth.uid(), 'smart_admin_assistant'::app_role)) WITH CHECK (has_role(auth.uid(), 'smart_admin_assistant'::app_role));

-- delivery_orders: view + update
CREATE POLICY "Smart assistant can view delivery orders" ON public.delivery_orders FOR SELECT TO authenticated USING (has_role(auth.uid(), 'smart_admin_assistant'::app_role));
CREATE POLICY "Smart assistant can update delivery orders" ON public.delivery_orders FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'smart_admin_assistant'::app_role));

-- ride_requests: view + update
CREATE POLICY "Smart assistant can view ride requests" ON public.ride_requests FOR SELECT TO authenticated USING (has_role(auth.uid(), 'smart_admin_assistant'::app_role));
CREATE POLICY "Smart assistant can update ride requests" ON public.ride_requests FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'smart_admin_assistant'::app_role));

-- complaints: full access
CREATE POLICY "Smart assistant can manage complaints" ON public.complaints FOR ALL TO authenticated USING (has_role(auth.uid(), 'smart_admin_assistant'::app_role)) WITH CHECK (has_role(auth.uid(), 'smart_admin_assistant'::app_role));

-- tickets: full access
CREATE POLICY "Smart assistant can manage tickets" ON public.tickets FOR ALL TO authenticated USING (has_role(auth.uid(), 'smart_admin_assistant'::app_role)) WITH CHECK (has_role(auth.uid(), 'smart_admin_assistant'::app_role));

-- alerts: view only
CREATE POLICY "Smart assistant can view alerts" ON public.alerts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'smart_admin_assistant'::app_role));

-- stores: view only
CREATE POLICY "Smart assistant can view stores" ON public.stores FOR SELECT TO authenticated USING (has_role(auth.uid(), 'smart_admin_assistant'::app_role));

-- menu_categories: view only
CREATE POLICY "Smart assistant can view categories" ON public.menu_categories FOR SELECT TO authenticated USING (has_role(auth.uid(), 'smart_admin_assistant'::app_role));

-- menu_items: view only
CREATE POLICY "Smart assistant can view items" ON public.menu_items FOR SELECT TO authenticated USING (has_role(auth.uid(), 'smart_admin_assistant'::app_role));

-- drivers: view only
CREATE POLICY "Smart assistant can view drivers" ON public.drivers FOR SELECT TO authenticated USING (has_role(auth.uid(), 'smart_admin_assistant'::app_role));

-- profiles: view only
CREATE POLICY "Smart assistant can view profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'smart_admin_assistant'::app_role));

-- trips: view only
CREATE POLICY "Smart assistant can view trips" ON public.trips FOR SELECT TO authenticated USING (has_role(auth.uid(), 'smart_admin_assistant'::app_role));

-- order_items: view only
CREATE POLICY "Smart assistant can view order items" ON public.order_items FOR SELECT TO authenticated USING (has_role(auth.uid(), 'smart_admin_assistant'::app_role));

-- ride_messages: view only
CREATE POLICY "Smart assistant can view ride messages" ON public.ride_messages FOR SELECT TO authenticated USING (has_role(auth.uid(), 'smart_admin_assistant'::app_role));

-- notifications: view only
CREATE POLICY "Smart assistant can view notifications" ON public.notifications FOR SELECT TO authenticated USING (has_role(auth.uid(), 'smart_admin_assistant'::app_role));
