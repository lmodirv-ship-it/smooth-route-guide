
-- 1. Payment Methods (saved payment methods per user)
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  method_type TEXT NOT NULL DEFAULT 'cash', -- card, wallet, cash, bank_transfer, agency
  provider TEXT NOT NULL DEFAULT 'cash', -- stripe, cash, wallet, cashplus, wafacash
  label TEXT, -- e.g. "Visa ****4242"
  is_default BOOLEAN NOT NULL DEFAULT false,
  stripe_payment_method_id TEXT,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment methods"
  ON public.payment_methods FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment methods"
  ON public.payment_methods FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment methods"
  ON public.payment_methods FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment methods"
  ON public.payment_methods FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all payment methods"
  ON public.payment_methods FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Payment Transactions (unified ledger for all payments)
CREATE TABLE public.payment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MAD',
  transaction_type TEXT NOT NULL DEFAULT 'payment', -- payment, refund, wallet_topup, wallet_debit, payout
  payment_method TEXT NOT NULL DEFAULT 'cash', -- cash, card, wallet, bank_transfer, agency
  provider TEXT DEFAULT 'cash', -- stripe, cash, wallet, cashplus, wafacash
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed, refunded, cancelled
  reference_type TEXT, -- trip, delivery_order, subscription, wallet_recharge, driver_subscription
  reference_id UUID,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.payment_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON public.payment_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all transactions"
  ON public.payment_transactions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Wallet Transactions (detailed wallet movement log)
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.wallet(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL, -- positive = credit, negative = debit
  balance_after NUMERIC NOT NULL DEFAULT 0,
  transaction_type TEXT NOT NULL DEFAULT 'topup', -- topup, debit, refund, bonus, commission, payout
  description TEXT,
  reference_id UUID,
  payment_transaction_id UUID REFERENCES public.payment_transactions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet transactions"
  ON public.wallet_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all wallet transactions"
  ON public.wallet_transactions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX idx_payment_methods_user ON public.payment_methods(user_id);
CREATE INDEX idx_payment_transactions_user ON public.payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX idx_payment_transactions_reference ON public.payment_transactions(reference_type, reference_id);
CREATE INDEX idx_payment_transactions_stripe ON public.payment_transactions(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX idx_wallet_transactions_user ON public.wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_wallet ON public.wallet_transactions(wallet_id);

-- Trigger for updated_at
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.touch_call_session_updated_at();

CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.touch_call_session_updated_at();
