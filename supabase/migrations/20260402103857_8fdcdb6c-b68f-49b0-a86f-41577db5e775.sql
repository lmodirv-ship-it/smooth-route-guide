
-- Fix admin policies to include WITH CHECK
DROP POLICY "Admins can manage all payment methods" ON public.payment_methods;
CREATE POLICY "Admins can manage all payment methods"
  ON public.payment_methods FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY "Admins can manage all transactions" ON public.payment_transactions;
CREATE POLICY "Admins can manage all transactions"
  ON public.payment_transactions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY "Admins can manage all wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Admins can manage all wallet transactions"
  ON public.wallet_transactions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
