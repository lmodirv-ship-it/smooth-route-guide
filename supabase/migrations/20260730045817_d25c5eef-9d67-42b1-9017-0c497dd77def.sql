-- 1) hn_stock_drivers: allow self-management of own record, keep contact data private
DROP POLICY IF EXISTS "Drivers can insert own hn_stock_drivers record" ON public.hn_stock_drivers;
CREATE POLICY "Drivers can insert own hn_stock_drivers record"
ON public.hn_stock_drivers FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Drivers can update own hn_stock_drivers record" ON public.hn_stock_drivers;
CREATE POLICY "Drivers can update own hn_stock_drivers record"
ON public.hn_stock_drivers FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 2) prospects: scope agents to unassigned or self-assigned prospects
DROP POLICY IF EXISTS "Admins and agents can manage prospects" ON public.prospects;

CREATE POLICY "Admins can manage prospects"
ON public.prospects FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can view unassigned or own prospects"
ON public.prospects FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'agent'::app_role)
  AND (called_by IS NULL OR called_by = auth.uid())
);

CREATE POLICY "Agents can insert prospects"
ON public.prospects FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'agent'::app_role));

CREATE POLICY "Agents can update unassigned or own prospects"
ON public.prospects FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'agent'::app_role)
  AND (called_by IS NULL OR called_by = auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'agent'::app_role)
  AND (called_by IS NULL OR called_by = auth.uid())
);

-- 3) realtime.messages: anchor topic matching on '-' delimiters instead of loose substring
DROP POLICY IF EXISTS "Users can only access own channels" ON realtime.messages;
CREATE POLICY "Users can only access own channels"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() = (auth.uid())::text
  OR realtime.topic() LIKE ((auth.uid())::text || '-%')
  OR realtime.topic() LIKE ('%-' || (auth.uid())::text)
  OR realtime.topic() LIKE ('%-' || (auth.uid())::text || '-%')
  OR (
    realtime.topic() LIKE 'api-sync-%'
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role))
  )
);

DROP POLICY IF EXISTS "Users can insert to own channels" ON realtime.messages;
CREATE POLICY "Users can insert to own channels"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (
  realtime.topic() = (auth.uid())::text
  OR realtime.topic() LIKE ((auth.uid())::text || '-%')
  OR realtime.topic() LIKE ('%-' || (auth.uid())::text)
  OR realtime.topic() LIKE ('%-' || (auth.uid())::text || '-%')
  OR (
    realtime.topic() LIKE 'api-sync-%'
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role))
  )
);