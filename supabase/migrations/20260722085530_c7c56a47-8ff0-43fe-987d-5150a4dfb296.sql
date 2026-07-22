
DROP POLICY IF EXISTS "Anyone authenticated can read community messages" ON public.community_messages;
CREATE POLICY "Authenticated users can read community messages"
ON public.community_messages FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth read warehouses" ON public.hn_stock_warehouses;
DROP POLICY IF EXISTS "Authenticated users can view warehouses" ON public.hn_stock_warehouses;
CREATE POLICY "Staff can view warehouses"
ON public.hn_stock_warehouses FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'agent'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
  OR public.has_role(auth.uid(), 'driver'::app_role)
  OR public.has_role(auth.uid(), 'delivery'::app_role)
  OR public.has_role(auth.uid(), 'store_owner'::app_role)
  OR EXISTS (SELECT 1 FROM public.hn_stock_drivers d WHERE d.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.hn_stock_merchants m WHERE m.user_id = auth.uid())
);

REVOKE SELECT (email, phone) ON public.stores FROM anon;
REVOKE SELECT (email, phone) ON public.stores FROM authenticated;
GRANT SELECT (email, phone) ON public.stores TO service_role;

CREATE OR REPLACE FUNCTION public.get_store_contact(_store_id uuid)
RETURNS TABLE(email text, phone text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.email, s.phone FROM public.stores s
  WHERE s.id = _store_id
    AND (
      s.owner_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'agent'::app_role)
      OR public.has_role(auth.uid(), 'moderator'::app_role)
    );
$$;
GRANT EXECUTE ON FUNCTION public.get_store_contact(uuid) TO authenticated;
