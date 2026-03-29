import { useState, useEffect } from "react";
import { Eye, EyeOff, Save, Loader2, Pencil, Mail, Phone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SECTION_GROUPS = [
  {
    group: "🏠 الصفحة الرئيسية",
    items: [
      { key: "hero", label: "قسم الترحيب (Hero)" },
      { key: "services", label: "قائمة الخدمات" },
      { key: "store_button", label: "زر المتجر" },
      { key: "download_apps", label: "تحميل التطبيقات" },
      { key: "promotions", label: "العروض والترويج" },
      { key: "partner_bar", label: "شريط الشركاء (أعلى)" },
    ],
  },
  {
    group: "👤 صفحة العميل",
    items: [
      { key: "client_booking", label: "حجز رحلة" },
      { key: "client_history", label: "سجل الرحلات" },
      { key: "client_wallet", label: "المحفظة" },
      { key: "client_support", label: "الدعم" },
      { key: "client_profile", label: "الملف الشخصي" },
      { key: "client_payment", label: "الدفع" },
      { key: "subscription_plans", label: "خطط الاشتراك" },
    ],
  },
  {
    group: "🚗 صفحة السائق",
    items: [
      { key: "driver_section", label: "قسم السائقين" },
      { key: "driver_earnings", label: "أرباح السائق" },
      { key: "driver_wallet", label: "محفظة السائق" },
      { key: "driver_subscription", label: "اشتراك السائق" },
      { key: "driver_promotions", label: "عروض السائق" },
      { key: "driver_support", label: "دعم السائق" },
      { key: "driver_status", label: "حالة السائق" },
      { key: "driver_car_info", label: "معلومات السيارة" },
    ],
  },
  {
    group: "🛵 صفحة التوصيل",
    items: [
      { key: "delivery_section", label: "قسم التوصيل" },
      { key: "delivery_home", label: "الصفحة الرئيسية للتوصيل" },
      { key: "delivery_restaurants", label: "قائمة المطاعم" },
      { key: "delivery_tracking", label: "تتبع التوصيل" },
      { key: "delivery_history", label: "سجل التوصيل" },
      { key: "delivery_cart", label: "سلة المشتريات" },
      { key: "courier_send", label: "إرسال طرد" },
      { key: "courier_track", label: "تتبع الطرد" },
      { key: "my_store", label: "متجري" },
    ],
  },
  {
    group: "💬 التواصل والمجتمع",
    items: [
      { key: "community_chat", label: "الدردشة المجتمعية" },
      { key: "ai_assistant", label: "المساعد الذكي" },
      { key: "contact_footer", label: "شريط التواصل (تذييل)" },
      { key: "floating_chat_btn", label: "زر الدردشة العائم" },
      { key: "voice_order_btn", label: "زر الطلب الصوتي" },
      { key: "community_btn", label: "زر المجتمع العائم" },
    ],
  },
  {
    group: "🧭 التنقل والأزرار العامة",
    items: [
      { key: "bottom_nav", label: "شريط التنقل السفلي" },
      { key: "logout_btn", label: "زر تسجيل الخروج" },
      { key: "language_switcher", label: "مبدل اللغة" },
      { key: "role_switcher", label: "مبدل الأدوار" },
      { key: "notification_listener", label: "الإشعارات" },
    ],
  },
  {
    group: "📊 صفحات الإدارة",
    items: [
      { key: "live_map", label: "الخريطة الحية" },
      { key: "earnings_page", label: "صفحة الأرباح" },
      { key: "documents_page", label: "صفحة الوثائق" },
      { key: "alerts_page", label: "صفحة التنبيهات" },
      { key: "city_activation", label: "تنشيط المدن" },
      { key: "zones_page", label: "إدارة المناطق" },
      { key: "commission_page", label: "العمولات" },
    ],
  },
];

const ALL_SECTIONS = SECTION_GROUPS.flatMap(g => g.items);

export default function VisibilitySettings() {
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Contact footer editing
  const [editingContact, setEditingContact] = useState(false);
  const [contactEmail, setContactEmail] = useState("lmodirv@gmail.com");
  const [contactPhone, setContactPhone] = useState("+212 0668546358");
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("app_settings").select("key, value");
      if (data) {
        const visData = data.find(d => d.key === "ui_visibility");
        if (visData?.value) {
          setVisibility(visData.value as Record<string, boolean>);
        } else {
          const defaults: Record<string, boolean> = {};
          SECTIONS.forEach(s => { defaults[s.key] = true; });
          setVisibility(defaults);
        }

        const contactData = data.find(d => d.key === "contact_info");
        if (contactData?.value) {
          const c = contactData.value as Record<string, string>;
          if (c.email) setContactEmail(c.email);
          if (c.phone) setContactPhone(c.phone);
        }
      }
      setLoaded(true);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: existing } = await supabase.from("app_settings").select("id").eq("key", "ui_visibility").maybeSingle();
      if (existing) {
        await supabase.from("app_settings").update({ value: visibility as any, updated_at: new Date().toISOString(), updated_by: user?.id }).eq("key", "ui_visibility");
      } else {
        await supabase.from("app_settings").insert({ key: "ui_visibility", value: visibility as any, updated_by: user?.id });
      }
      toast({ title: "✅ تم حفظ إعدادات الإظهار/الإخفاء" });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleSaveContact = async () => {
    const trimmedEmail = contactEmail.trim();
    const trimmedPhone = contactPhone.trim();
    if (!trimmedEmail || !trimmedPhone) {
      toast({ title: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }
    setSavingContact(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const value = { email: trimmedEmail, phone: trimmedPhone } as any;
      const { data: existing } = await supabase.from("app_settings").select("id").eq("key", "contact_info").maybeSingle();
      if (existing) {
        await supabase.from("app_settings").update({ value, updated_at: new Date().toISOString(), updated_by: user?.id }).eq("key", "contact_info");
      } else {
        await supabase.from("app_settings").insert({ key: "contact_info", value, updated_by: user?.id });
      }
      toast({ title: "✅ تم حفظ معلومات التواصل" });
      setEditingContact(false);
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally { setSavingContact(false); }
  };

  if (!loaded) return null;

  const isFooterVisible = visibility.contact_footer !== false;

  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ
        </Button>
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" /> التحكم في الإظهار والإخفاء
        </h3>
      </div>
      <p className="text-sm text-muted-foreground text-right">تحكم في ما يظهر وما يختفي في الصفحات الرئيسية</p>

      {/* Contact Footer Special Controls — Glowing Panel */}
      <div className="relative rounded-2xl p-5 space-y-4 overflow-hidden border border-primary/40"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(220 60% 10% / 0.9), hsl(var(--primary) / 0.05))',
          boxShadow: '0 0 30px hsl(var(--primary) / 0.15), inset 0 1px 0 hsl(var(--primary) / 0.2), 0 4px 20px rgba(0,0,0,0.4)',
        }}
      >
        {/* Glow accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)' }} />
        
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            {/* Green = Show */}
            <button
              onClick={() => {
                setVisibility(prev => ({ ...prev, contact_footer: true }));
                toast({ title: "✅ شريط التواصل: مُفعّل (اضغط حفظ)" });
              }}
              className="relative group flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                boxShadow: '0 0 16px rgba(34,197,94,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
              }}
            >
              <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 24px rgba(34,197,94,0.7), 0 0 60px rgba(34,197,94,0.3)' }} />
              <Eye className="w-4 h-4 relative z-10" /> <span className="relative z-10">إظهار</span>
            </button>
            {/* Red = Hide */}
            <button
              onClick={() => {
                setVisibility(prev => ({ ...prev, contact_footer: false }));
                toast({ title: "🚫 شريط التواصل: مُخفي (اضغط حفظ)" });
              }}
              className="relative group flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                boxShadow: '0 0 16px rgba(239,68,68,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
              }}
            >
              <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 24px rgba(239,68,68,0.7), 0 0 60px rgba(239,68,68,0.3)' }} />
              <EyeOff className="w-4 h-4 relative z-10" /> <span className="relative z-10">إخفاء</span>
            </button>
            {/* Yellow = Edit */}
            <button
              onClick={() => setEditingContact(!editingContact)}
              className="relative group flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-black transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #eab308, #facc15)',
                boxShadow: '0 0 16px rgba(234,179,8,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
              }}
            >
              <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 24px rgba(234,179,8,0.7), 0 0 60px rgba(234,179,8,0.3)' }} />
              <Pencil className="w-4 h-4 relative z-10" /> <span className="relative z-10">تغيير</span>
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            {isFooterVisible
              ? <span className="w-3 h-3 rounded-full inline-block animate-pulse" style={{ background: 'radial-gradient(circle, #4ade80, #16a34a)', boxShadow: '0 0 10px #22c55e' }} />
              : <span className="w-3 h-3 rounded-full inline-block animate-pulse" style={{ background: 'radial-gradient(circle, #f87171, #dc2626)', boxShadow: '0 0 10px #ef4444' }} />
            }
            📞 شريط التواصل
          </div>
        </div>

        {/* Edit contact info form */}
        {editingContact && (
          <div className="space-y-3 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Input
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                placeholder="البريد الإلكتروني"
                className="text-left"
                dir="ltr"
                maxLength={255}
              />
              <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                placeholder="رقم الهاتف / واتساب"
                className="text-left"
                dir="ltr"
                maxLength={30}
              />
              <Phone className="w-5 h-5 text-muted-foreground shrink-0" />
            </div>
            <Button
              size="sm"
              onClick={handleSaveContact}
              disabled={savingContact}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground w-full"
            >
              {savingContact ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ معلومات التواصل
            </Button>
          </div>
        )}
      </div>

      {/* Master toggle buttons */}
      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={() => {
            const all: Record<string, boolean> = {};
            SECTIONS.forEach(s => { all[s.key] = false; });
            setVisibility(all);
          }}
        >
          <EyeOff className="w-4 h-4" /> إخفاء الكل
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          onClick={() => {
            const all: Record<string, boolean> = {};
            SECTIONS.forEach(s => { all[s.key] = true; });
            setVisibility(all);
          }}
        >
          <Eye className="w-4 h-4" /> إظهار الكل
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SECTIONS.map(s => (
          <div key={s.key} className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/30">
            <Switch
              checked={visibility[s.key] !== false}
              onCheckedChange={v => setVisibility(prev => ({ ...prev, [s.key]: v }))}
            />
            <div className="flex items-center gap-2 text-sm text-foreground">
              {visibility[s.key] !== false ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
