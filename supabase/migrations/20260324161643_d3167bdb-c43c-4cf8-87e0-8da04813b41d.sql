
-- Add missing columns to delivery_orders for full workflow
ALTER TABLE public.delivery_orders 
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS city text DEFAULT 'Tanger';

-- Update RLS: Allow drivers to view ready_for_driver orders (not just assigned ones)
CREATE POLICY "Drivers can view ready_for_driver orders"
ON public.delivery_orders
FOR SELECT
TO authenticated
USING (
  status = 'ready_for_driver' 
  AND has_role(auth.uid(), 'driver'::app_role)
);

-- Allow drivers to update ready_for_driver orders (to accept them)
CREATE POLICY "Drivers can accept ready_for_driver orders"
ON public.delivery_orders
FOR UPDATE
TO authenticated
USING (
  status = 'ready_for_driver' 
  AND has_role(auth.uid(), 'driver'::app_role)
)
WITH CHECK (
  status = 'driver_assigned'
  AND driver_id IN (SELECT d.id FROM drivers d WHERE d.user_id = auth.uid())
);
