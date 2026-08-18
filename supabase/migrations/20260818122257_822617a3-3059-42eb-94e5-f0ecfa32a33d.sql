CREATE TABLE public.login_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  verification boolean NOT NULL DEFAULT false,
  date timestamptz NOT NULL DEFAULT now(),
  validation timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  attempts integer NOT NULL DEFAULT 0
);

CREATE INDEX idx_login_codes_email ON public.login_codes (lower(email));
CREATE INDEX idx_login_codes_validation ON public.login_codes (validation);

GRANT ALL ON public.login_codes TO service_role;

ALTER TABLE public.login_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view login codes"
ON public.login_codes FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.login_codes TO authenticated;