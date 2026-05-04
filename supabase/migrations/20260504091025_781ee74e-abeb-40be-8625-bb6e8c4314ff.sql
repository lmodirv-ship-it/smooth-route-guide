ALTER TABLE public.hn_driver_leads
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_to UUID,
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS converted_user_id UUID,
  ADD COLUMN IF NOT EXISTS trips_after_conversion INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT;

CREATE INDEX IF NOT EXISTS idx_hn_driver_leads_status ON public.hn_driver_leads (status);
CREATE INDEX IF NOT EXISTS idx_hn_driver_leads_created_at ON public.hn_driver_leads (created_at DESC);