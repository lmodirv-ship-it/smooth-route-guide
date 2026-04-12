-- Fix hn_driver_leads: restrict INSERT to admin/agent only
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.hn_driver_leads;
CREATE POLICY "Admins and agents can insert leads"
ON public.hn_driver_leads
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role)
);

-- Fix hn_driver_leads: restrict UPDATE to admin/agent only
DROP POLICY IF EXISTS "Allow authenticated update" ON public.hn_driver_leads;
CREATE POLICY "Admins and agents can update leads"
ON public.hn_driver_leads
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role)
);

-- Fix hn_driver_leads: restrict SELECT to admin/agent only
DROP POLICY IF EXISTS "Allow authenticated read" ON public.hn_driver_leads;
CREATE POLICY "Admins and agents can read leads"
ON public.hn_driver_leads
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role)
);