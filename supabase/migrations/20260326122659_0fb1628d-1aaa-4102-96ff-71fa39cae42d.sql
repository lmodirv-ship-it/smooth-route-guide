
-- Sub-assistants table for the multi-agent system
CREATE TABLE public.sub_assistants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  name_ar text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  assistant_type text NOT NULL DEFAULT 'general',
  system_prompt text NOT NULL DEFAULT '',
  allowed_tables text[] NOT NULL DEFAULT '{}',
  allowed_tools text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  icon text NOT NULL DEFAULT 'bot',
  color text NOT NULL DEFAULT '#3b82f6',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  max_actions_per_minute integer NOT NULL DEFAULT 10,
  execution_log jsonb NOT NULL DEFAULT '[]'
);

-- RLS
ALTER TABLE public.sub_assistants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sub assistants" ON public.sub_assistants
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Seed the 4 default sub-assistants
INSERT INTO public.sub_assistants (name, name_ar, description, assistant_type, system_prompt, allowed_tables, allowed_tools, icon, color) VALUES
(
  'Communications Assistant',
  'مساعد التواصل',
  'إدارة الإشعارات والرسائل للعملاء والسائقين',
  'communications',
  'أنت مساعد متخصص في التواصل. مهمتك إرسال الإشعارات والرسائل للعملاء والسائقين. لا تقم بأي عملية خارج نطاق التواصل.',
  ARRAY['notifications', 'ride_messages', 'profiles'],
  ARRAY['bulk_notify', 'db_select', 'db_insert'],
  'bell',
  '#8b5cf6'
),
(
  'Restaurants Assistant',
  'مساعد المطاعم',
  'إنشاء وإدارة المطاعم والمنيوهات والصفحات',
  'restaurants',
  'أنت مساعد متخصص في إدارة المطاعم. يمكنك إنشاء مطاعم جديدة، تعديل المنيوهات، وإنشاء صفحات ديناميكية للمتاجر.',
  ARRAY['stores', 'menu_categories', 'menu_items', 'product_images', 'dynamic_pages'],
  ARRAY['db_select', 'db_insert', 'db_update', 'db_delete', 'create_store_with_page', 'manage_page'],
  'utensils',
  '#f97316'
),
(
  'Reports Assistant',
  'مساعد التقارير',
  'تحليل البيانات وإنشاء تقارير يومية وأسبوعية',
  'reports',
  'أنت مساعد متخصص في التحليل والتقارير. قم بتحليل بيانات الرحلات والطلبات والأرباح وقدم تقارير واضحة ومفصلة.',
  ARRAY['trips', 'delivery_orders', 'earnings', 'payments', 'drivers', 'profiles', 'ride_requests', 'order_items'],
  ARRAY['db_select', 'db_count', 'db_stats'],
  'bar-chart-3',
  '#10b981'
),
(
  'Complaints Assistant',
  'مساعد الشكاوى',
  'معالجة الشكاوى والتذاكر تلقائياً',
  'complaints',
  'أنت مساعد متخصص في معالجة الشكاوى والتذاكر. قم بتحليل الشكاوى وتصنيفها وتقديم حلول مناسبة.',
  ARRAY['complaints', 'tickets', 'call_center', 'call_logs', 'profiles', 'trips', 'ride_requests'],
  ARRAY['db_select', 'db_insert', 'db_update', 'db_count'],
  'message-square-warning',
  '#ef4444'
);
