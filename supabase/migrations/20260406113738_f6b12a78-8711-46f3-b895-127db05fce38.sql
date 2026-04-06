
CREATE TABLE public.mailbluster_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'user',
  template_name TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  send_delay_hours INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mailbluster_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage mailbluster templates"
ON public.mailbluster_templates
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Agents can view mailbluster templates"
ON public.mailbluster_templates
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'agent'));

-- Insert default templates for each role
INSERT INTO public.mailbluster_templates (role, template_name, subject, body_html, send_delay_hours, sort_order) VALUES
('user', 'welcome_client', 'مرحباً بك في HN Driver! 🚗', '<div style="direction:rtl;font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px"><div style="background:#E8852A;color:white;padding:20px;border-radius:10px 10px 0 0;text-align:center"><h1 style="margin:0">مرحباً بك في HN Driver</h1></div><div style="background:#f9f9f9;padding:20px;border-radius:0 0 10px 10px"><p style="font-size:16px">مرحباً {{firstName}}! 👋</p><p>شكراً لتسجيلك في منصة HN Driver. لقد حصلت على <strong>50 درهم رصيد ترحيبي</strong> في محفظتك!</p><p>يمكنك الآن:</p><ul><li>🚗 حجز رحلات بأسعار تنافسية</li><li>🍕 طلب الطعام والتوصيل</li><li>📦 إرسال واستقبال الطرود</li></ul><p style="text-align:center;margin-top:20px"><a href="https://www.hn-driver.com" style="background:#E8852A;color:white;padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:bold">ابدأ الآن</a></p></div></div>', 0, 1),

('driver', 'welcome_driver', 'مرحباً بك كسائق في HN Driver! 🚗', '<div style="direction:rtl;font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px"><div style="background:#1E1E28;color:#E8852A;padding:20px;border-radius:10px 10px 0 0;text-align:center"><h1 style="margin:0">أهلاً بك في فريق السائقين</h1></div><div style="background:#f9f9f9;padding:20px;border-radius:0 0 10px 10px"><p style="font-size:16px">مرحباً {{firstName}}! 🎉</p><p>شكراً لانضمامك كسائق في منصة HN Driver.</p><p>خطواتك التالية:</p><ol><li>📄 رفع الوثائق المطلوبة (رخصة السياقة، بطاقة الهوية)</li><li>🚗 إضافة معلومات سيارتك</li><li>✅ انتظار الموافقة من فريق الإدارة</li><li>💰 ابدأ بتلقي الطلبات وكسب المال!</li></ol><p>اشترك في إحدى باقاتنا المميزة للاستفادة من مزايا حصرية.</p><p style="text-align:center;margin-top:20px"><a href="https://www.hn-driver.com/auth/driver" style="background:#E8852A;color:white;padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:bold">أكمل ملفك الشخصي</a></p></div></div>', 0, 1),

('delivery', 'welcome_delivery', 'مرحباً بك كسائق توصيل في HN Driver! 📦', '<div style="direction:rtl;font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px"><div style="background:#1E1E28;color:#E8852A;padding:20px;border-radius:10px 10px 0 0;text-align:center"><h1 style="margin:0">أهلاً بك في فريق التوصيل</h1></div><div style="background:#f9f9f9;padding:20px;border-radius:0 0 10px 10px"><p style="font-size:16px">مرحباً {{firstName}}! 📦</p><p>انضممت لأكبر شبكة توصيل في المنطقة!</p><p>المميزات:</p><ul><li>📦 توصيل الطعام والطرود</li><li>💵 أرباح يومية مباشرة</li><li>🗺️ اختر مناطق العمل المناسبة لك</li><li>⭐ نظام مكافآت وحوافز</li></ul><p style="text-align:center;margin-top:20px"><a href="https://www.hn-driver.com/auth/delivery" style="background:#E8852A;color:white;padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:bold">ابدأ التوصيل</a></p></div></div>', 0, 1),

('store_owner', 'welcome_store', 'مرحباً بك كشريك في HN Driver! 🏪', '<div style="direction:rtl;font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px"><div style="background:#E8852A;color:white;padding:20px;border-radius:10px 10px 0 0;text-align:center"><h1 style="margin:0">مرحباً بك كشريك</h1></div><div style="background:#f9f9f9;padding:20px;border-radius:0 0 10px 10px"><p style="font-size:16px">مرحباً {{firstName}}! 🏪</p><p>شكراً لانضمامك كشريك في منصة HN Driver.</p><p>ما يمكنك فعله:</p><ul><li>🍽️ إنشاء قائمة طعام/منتجات</li><li>📊 متابعة الطلبات مباشرة</li><li>💰 تحصيل الأرباح يومياً</li><li>📈 إحصائيات مبيعات تفصيلية</li></ul><p style="text-align:center;margin-top:20px"><a href="https://www.hn-driver.com/auth/store_owner" style="background:#E8852A;color:white;padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:bold">أنشئ متجرك</a></p></div></div>', 0, 1),

('user', 'followup_client', 'لا تنس رصيدك الترحيبي! 🎁', '<div style="direction:rtl;font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px"><div style="background:#E8852A;color:white;padding:15px;border-radius:10px 10px 0 0;text-align:center"><h2 style="margin:0">لديك 50 درهم في انتظارك!</h2></div><div style="background:#f9f9f9;padding:20px;border-radius:0 0 10px 10px"><p>مرحباً {{firstName}}،</p><p>لاحظنا أنك لم تستخدم رصيدك الترحيبي بعد! استخدم <strong>50 درهم</strong> في أول رحلة أو طلب توصيل.</p><p style="text-align:center"><a href="https://www.hn-driver.com" style="background:#E8852A;color:white;padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:bold">احجز رحلتك الأولى</a></p></div></div>', 24, 2),

('driver', 'followup_driver', 'هل أكملت ملفك الشخصي؟ 📋', '<div style="direction:rtl;font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px"><div style="background:#1E1E28;color:#E8852A;padding:15px;border-radius:10px 10px 0 0;text-align:center"><h2 style="margin:0">أكمل ملفك وابدأ الكسب!</h2></div><div style="background:#f9f9f9;padding:20px;border-radius:0 0 10px 10px"><p>مرحباً {{firstName}}،</p><p>لم تكمل ملفك الشخصي بعد. ارفع وثائقك الآن لتبدأ في تلقي الطلبات وكسب المال!</p><p>سائقونا يكسبون في المتوسط <strong>200-500 درهم يومياً</strong>.</p><p style="text-align:center"><a href="https://www.hn-driver.com/driver/documents" style="background:#E8852A;color:white;padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:bold">أكمل ملفك الآن</a></p></div></div>', 48, 2);
