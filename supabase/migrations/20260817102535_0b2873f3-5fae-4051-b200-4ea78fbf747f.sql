-- 1) call_sessions: require a real relationship between caller and callee
CREATE OR REPLACE FUNCTION public.can_call_user(_caller uuid, _callee uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _caller IS NOT NULL
    AND _callee IS NOT NULL
    AND _caller <> _callee
    AND (
      -- staff may always initiate calls (call center / support)
      public.has_role(_caller, 'admin'::app_role)
      OR public.has_role(_caller, 'agent'::app_role)
      OR public.has_role(_caller, 'moderator'::app_role)
      OR public.has_role(_callee, 'admin'::app_role)
      OR public.has_role(_callee, 'agent'::app_role)
      -- shared delivery order
      OR EXISTS (
        SELECT 1 FROM public.delivery_orders o
        LEFT JOIN public.drivers d ON d.id = o.driver_id
        WHERE o.created_at > now() - interval '2 days'
          AND ((o.user_id = _caller AND d.user_id = _callee)
            OR (o.user_id = _callee AND d.user_id = _caller))
      )
      -- shared ride request
      OR EXISTS (
        SELECT 1 FROM public.ride_requests r
        LEFT JOIN public.drivers d ON d.id = r.driver_id
        WHERE r.created_at > now() - interval '2 days'
          AND ((r.user_id = _caller AND d.user_id = _callee)
            OR (r.user_id = _callee AND d.user_id = _caller))
      )
      -- shared trip
      OR EXISTS (
        SELECT 1 FROM public.trips t
        LEFT JOIN public.drivers d ON d.id = t.driver_id
        WHERE t.created_at > now() - interval '2 days'
          AND ((t.user_id = _caller AND d.user_id = _callee)
            OR (t.user_id = _callee AND d.user_id = _caller))
      )
    )
$$;

REVOKE ALL ON FUNCTION public.can_call_user(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_call_user(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users can create call sessions" ON public.call_sessions;
DROP POLICY IF EXISTS "Authenticated users can create own outgoing calls" ON public.call_sessions;

CREATE POLICY "Users can create validated call sessions"
ON public.call_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND auth.uid() = caller_id
  AND caller_id <> callee_id
  AND public.can_call_user(auth.uid(), callee_id)
);

-- 2) delivery_orders: limit agent access to historical customer PII
DROP POLICY IF EXISTS "Agents can view historical delivery orders" ON public.delivery_orders;

CREATE POLICY "Agents can view recent historical delivery orders"
ON public.delivery_orders
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'agent'::app_role)
  AND status = ANY (ARRAY['delivered','cancelled','completed','refunded','failed'])
  AND created_at > now() - interval '7 days'
);

-- 3) reward_stars: remove user self-insert; rows are created by trigger/admins only
DROP POLICY IF EXISTS "Users create empty own reward row" ON public.reward_stars;