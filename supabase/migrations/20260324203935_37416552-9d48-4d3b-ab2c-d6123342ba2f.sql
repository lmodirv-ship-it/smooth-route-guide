
-- =====================================================
-- Smart Admin Assistant Knowledge Base
-- Separated from operational tables
-- =====================================================

-- 1. Knowledge entries: accumulated knowledge, external references, insights
CREATE TABLE public.assistant_knowledge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'internal',
  source_url TEXT,
  tags TEXT[] DEFAULT '{}',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Recommendations: system improvement suggestions
CREATE TABLE public.assistant_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  impact TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  admin_response TEXT,
  responded_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Issue patterns: recurring problems tracking
CREATE TABLE public.assistant_issue_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type TEXT NOT NULL DEFAULT 'bug',
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  affected_area TEXT NOT NULL DEFAULT '',
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'active',
  resolution_notes TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Campaign ideas: marketing and growth plans
CREATE TABLE public.assistant_campaign_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  campaign_type TEXT NOT NULL DEFAULT 'marketing',
  target_audience TEXT NOT NULL DEFAULT 'general',
  estimated_impact TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'draft',
  admin_approved BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMPTZ,
  content_data JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Activity log: optimization actions and analytics
CREATE TABLE public.assistant_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL DEFAULT 'analysis',
  title TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '',
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- RLS: admin = full, smart_admin_assistant = read+write, others = blocked
-- =====================================================

ALTER TABLE public.assistant_knowledge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_issue_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_campaign_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_activity_log ENABLE ROW LEVEL SECURITY;

-- assistant_knowledge_entries
CREATE POLICY "Admins full access knowledge" ON public.assistant_knowledge_entries FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Assistant can manage knowledge" ON public.assistant_knowledge_entries FOR ALL TO authenticated USING (has_role(auth.uid(), 'smart_admin_assistant')) WITH CHECK (has_role(auth.uid(), 'smart_admin_assistant'));

-- assistant_recommendations
CREATE POLICY "Admins full access recommendations" ON public.assistant_recommendations FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Assistant can manage recommendations" ON public.assistant_recommendations FOR ALL TO authenticated USING (has_role(auth.uid(), 'smart_admin_assistant')) WITH CHECK (has_role(auth.uid(), 'smart_admin_assistant'));

-- assistant_issue_patterns
CREATE POLICY "Admins full access issue patterns" ON public.assistant_issue_patterns FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Assistant can manage issue patterns" ON public.assistant_issue_patterns FOR ALL TO authenticated USING (has_role(auth.uid(), 'smart_admin_assistant')) WITH CHECK (has_role(auth.uid(), 'smart_admin_assistant'));

-- assistant_campaign_ideas
CREATE POLICY "Admins full access campaigns" ON public.assistant_campaign_ideas FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Assistant can manage campaigns" ON public.assistant_campaign_ideas FOR ALL TO authenticated USING (has_role(auth.uid(), 'smart_admin_assistant')) WITH CHECK (has_role(auth.uid(), 'smart_admin_assistant'));

-- assistant_activity_log
CREATE POLICY "Admins full access activity log" ON public.assistant_activity_log FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Assistant can manage activity log" ON public.assistant_activity_log FOR ALL TO authenticated USING (has_role(auth.uid(), 'smart_admin_assistant')) WITH CHECK (has_role(auth.uid(), 'smart_admin_assistant'));
