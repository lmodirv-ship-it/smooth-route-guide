
-- ============ AI MODELS ============
CREATE TABLE public.ai_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  model_id text NOT NULL,
  display_name text NOT NULL,
  category text NOT NULL DEFAULT 'llm',
  is_free boolean NOT NULL DEFAULT false,
  requires_key boolean NOT NULL DEFAULT true,
  api_key text,
  base_url text,
  secret_name text,
  website_url text,
  logo_key text,
  status text NOT NULL DEFAULT 'disabled',
  is_enabled boolean NOT NULL DEFAULT false,
  rpm_limit integer,
  daily_limit integer,
  monthly_limit integer,
  priority integer NOT NULL DEFAULT 1,
  last_test_at timestamptz,
  last_test_ok boolean,
  last_test_message text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, model_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_models TO authenticated;
GRANT ALL ON public.ai_models TO service_role;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_models_admin_all" ON public.ai_models FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ LOCAL MODELS ============
CREATE TABLE public.ai_local_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engine text NOT NULL DEFAULT 'ollama',
  model_id text NOT NULL,
  display_name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'LLM',
  size_gb numeric,
  run_command text,
  install_url text,
  endpoint_url text,
  status text NOT NULL DEFAULT 'disconnected',
  is_enabled boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 1,
  last_check_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (engine, model_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_local_models TO authenticated;
GRANT ALL ON public.ai_local_models TO service_role;
ALTER TABLE public.ai_local_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_local_models_admin_all" ON public.ai_local_models FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.ai_local_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  description text,
  path text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'folder',
  is_enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_local_paths TO authenticated;
GRANT ALL ON public.ai_local_paths TO service_role;
ALTER TABLE public.ai_local_paths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_local_paths_admin_all" ON public.ai_local_paths FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ AGENTS ============
CREATE TABLE public.ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT 'assistant',
  description text,
  model_id uuid REFERENCES public.ai_models(id) ON DELETE SET NULL,
  system_prompt text,
  allowed_tools text[] NOT NULL DEFAULT '{}',
  api_key text,
  is_enabled boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_agents TO authenticated;
GRANT ALL ON public.ai_agents TO service_role;
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_agents_admin_all" ON public.ai_agents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ ADMIN CHATS ============
CREATE TABLE public.ai_admin_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL DEFAULT 'محادثة جديدة',
  model_ref text,
  agent_id uuid REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_admin_chats TO authenticated;
GRANT ALL ON public.ai_admin_chats TO service_role;
ALTER TABLE public.ai_admin_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_admin_chats_admin_all" ON public.ai_admin_chats FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.ai_admin_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.ai_admin_chats(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_admin_chat_messages TO authenticated;
GRANT ALL ON public.ai_admin_chat_messages TO service_role;
ALTER TABLE public.ai_admin_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_admin_chat_messages_admin_all" ON public.ai_admin_chat_messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ USAGE / BILLING ============
CREATE TABLE public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_ref text NOT NULL,
  provider text,
  requests integer NOT NULL DEFAULT 1,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cost numeric(12,4) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_usage_log TO authenticated;
GRANT ALL ON public.ai_usage_log TO service_role;
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_usage_log_admin_all" ON public.ai_usage_log FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ LICENSES ============
CREATE TABLE public.licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key text NOT NULL UNIQUE,
  holder_name text,
  holder_email text,
  product text NOT NULL DEFAULT 'hn-driver',
  plan text,
  seats integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active',
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.licenses TO authenticated;
GRANT ALL ON public.licenses TO service_role;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "licenses_admin_all" ON public.licenses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ PLATFORM PACKAGES ============
CREATE TABLE public.platform_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  audience text NOT NULL DEFAULT 'client',
  price numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'MAD',
  duration_days integer NOT NULL DEFAULT 30,
  features text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_packages TO authenticated;
GRANT ALL ON public.platform_packages TO service_role;
ALTER TABLE public.platform_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_packages_admin_all" ON public.platform_packages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ INVOICES ============
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  customer_name text,
  customer_email text,
  user_id uuid,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'MAD',
  status text NOT NULL DEFAULT 'draft',
  issued_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_admin_all" ON public.invoices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ DOWNLOAD ITEMS ============
CREATE TABLE public.download_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  platform text NOT NULL DEFAULT 'android',
  file_url text NOT NULL DEFAULT '',
  version text,
  size_mb numeric,
  download_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.download_items TO authenticated;
GRANT ALL ON public.download_items TO service_role;
ALTER TABLE public.download_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "download_items_admin_all" ON public.download_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ SIGNUP REQUESTS ============
CREATE TABLE public.signup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL DEFAULT '',
  email text,
  phone text,
  requested_role text NOT NULL DEFAULT 'client',
  city text,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signup_requests TO authenticated;
GRANT ALL ON public.signup_requests TO service_role;
ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signup_requests_admin_all" ON public.signup_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ MONITORING ============
CREATE TABLE public.monitoring_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  target text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'http',
  status text NOT NULL DEFAULT 'unknown',
  latency_ms integer,
  last_check_at timestamptz,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monitoring_checks TO authenticated;
GRANT ALL ON public.monitoring_checks TO service_role;
ALTER TABLE public.monitoring_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "monitoring_checks_admin_all" ON public.monitoring_checks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ updated_at triggers ============
CREATE TRIGGER trg_ai_models_updated BEFORE UPDATE ON public.ai_models FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ai_local_models_updated BEFORE UPDATE ON public.ai_local_models FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ai_local_paths_updated BEFORE UPDATE ON public.ai_local_paths FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ai_agents_updated BEFORE UPDATE ON public.ai_agents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ai_admin_chats_updated BEFORE UPDATE ON public.ai_admin_chats FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_licenses_updated BEFORE UPDATE ON public.licenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_platform_packages_updated BEFORE UPDATE ON public.platform_packages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_download_items_updated BEFORE UPDATE ON public.download_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_signup_requests_updated BEFORE UPDATE ON public.signup_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_monitoring_checks_updated BEFORE UPDATE ON public.monitoring_checks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
