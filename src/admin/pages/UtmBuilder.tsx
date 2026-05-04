import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link2, Copy, Check, QrCode, Sparkles, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const PRESETS = {
  source: ["facebook", "instagram", "tiktok", "google", "youtube", "whatsapp", "messenger", "snapchat", "twitter", "linkedin", "email", "sms"],
  medium: ["cpc", "cpm", "social", "email", "referral", "organic", "display", "video", "story", "reels", "post", "banner"],
  campaign: ["ramadan_2026", "launch", "promo_summer", "driver_recruit", "referral_bonus", "weekend_offer"],
};

const BASE_URLS = [
  { label: "🎯 صفحة التسجيل (موصى بها للحملات)", value: "https://www.hn-driver.com/auth/client" },
  { label: "🌐 الموقع الرئيسي", value: "https://www.hn-driver.com" },
  { label: "🚗 صفحة السائقين", value: "https://www.hn-driver.com/driver" },
  { label: "📦 صفحة التوصيل", value: "https://www.hn-driver.com/delivery" },
  { label: "📱 تحميل التطبيق", value: "https://www.hn-driver.com/downloads" },
];

type Preset = { label: string; baseUrl: string; source: string; medium: string; campaign: string; content?: string };
const QUICK_PRESETS: Preset[] = [
  { label: "📘 فيسبوك — تسجيل 50د", baseUrl: "https://www.hn-driver.com/auth/client", source: "facebook", medium: "cpc", campaign: "signup_50dh", content: "fb_feed" },
  { label: "📸 إنستغرام — تسجيل 50د", baseUrl: "https://www.hn-driver.com/auth/client", source: "instagram", medium: "cpc", campaign: "signup_50dh", content: "ig_story" },
  { label: "🎵 تيك توك — تسجيل 50د", baseUrl: "https://www.hn-driver.com/auth/client", source: "tiktok", medium: "cpc", campaign: "signup_50dh", content: "tt_video" },
  { label: "🔍 Google Ads — تسجيل", baseUrl: "https://www.hn-driver.com/auth/client", source: "google", medium: "cpc", campaign: "signup_50dh", content: "search_ads" },
  { label: "💬 واتساب — تسجيل", baseUrl: "https://www.hn-driver.com/auth/client", source: "whatsapp", medium: "social", campaign: "signup_50dh", content: "wa_status" },
];

const UtmBuilder = () => {
  const [baseUrl, setBaseUrl] = useState(BASE_URLS[0].value);
  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("");
  const [campaign, setCampaign] = useState("");
  const [content, setContent] = useState("");
  const [term, setTerm] = useState("");
  const [copied, setCopied] = useState(false);

  const finalUrl = useMemo(() => {
    if (!baseUrl) return "";
    const url = new URL(baseUrl);
    if (source) url.searchParams.set("utm_source", source.toLowerCase().trim().replace(/\s+/g, "_"));
    if (medium) url.searchParams.set("utm_medium", medium.toLowerCase().trim().replace(/\s+/g, "_"));
    if (campaign) url.searchParams.set("utm_campaign", campaign.toLowerCase().trim().replace(/\s+/g, "_"));
    if (content) url.searchParams.set("utm_content", content.toLowerCase().trim().replace(/\s+/g, "_"));
    if (term) url.searchParams.set("utm_term", term.toLowerCase().trim().replace(/\s+/g, "_"));
    return url.toString();
  }, [baseUrl, source, medium, campaign, content, term]);

  const isValid = source && medium && campaign;

  const copyUrl = async () => {
    if (!finalUrl) return;
    await navigator.clipboard.writeText(finalUrl);
    setCopied(true);
    toast.success("تم نسخ الرابط ✓");
    setTimeout(() => setCopied(false), 2000);
  };

  const qrUrl = finalUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(finalUrl)}&margin=10&bgcolor=0F172A&color=FFFFFF`
    : "";

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Link2 className="w-6 h-6 text-primary" />
          🔗 صانع روابط الحملات (UTM Builder)
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          أنشئ روابط مخصصة لكل حملة إعلانية لتتبع أدائها بدقة في تحليلات النمو
        </p>
      </div>

      {/* Quick Presets */}
      <div className="glass-card rounded-2xl p-4">
        <p className="text-sm font-bold text-foreground mb-2">⚡ قوالب جاهزة (اضغط لتعبئة الحقول)</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setBaseUrl(p.baseUrl);
                setSource(p.source);
                setMedium(p.medium);
                setCampaign(p.campaign);
                setContent(p.content || "");
                toast.success(`تم تطبيق: ${p.label}`);
              }}
              className="text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-foreground hover:bg-primary/20 transition"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <FormField label="🌐 الرابط الأساسي" required>
              <select
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border text-foreground"
              >
                {BASE_URLS.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
              <input
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="أو أدخل رابطاً مخصصاً"
                className="mt-2 w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border text-foreground text-sm"
              />
            </FormField>

            <FormField label="📡 المصدر (utm_source)" required hint="من أين يأتي الزائر؟ مثال: facebook, google, tiktok">
              <SmartInput value={source} onChange={setSource} options={PRESETS.source} placeholder="facebook" />
            </FormField>

            <FormField label="📢 الوسيلة (utm_medium)" required hint="نوع الإعلان. مثال: cpc (مدفوع), social (عضوي), email">
              <SmartInput value={medium} onChange={setMedium} options={PRESETS.medium} placeholder="cpc" />
            </FormField>

            <FormField label="🎯 اسم الحملة (utm_campaign)" required hint="اسم وصفي. مثال: ramadan_2026, launch_v2">
              <SmartInput value={campaign} onChange={setCampaign} options={PRESETS.campaign} placeholder="ramadan_2026" />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="🎨 المحتوى (utm_content)" hint="اختياري — للتمييز بين عدة إعلانات. مثال: banner_red">
                <input
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="banner_v1"
                  className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border text-foreground text-sm"
                />
              </FormField>
              <FormField label="🔍 الكلمة المفتاحية (utm_term)" hint="اختياري — للحملات المدفوعة بالكلمات">
                <input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="taxi_tangier"
                  className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border text-foreground text-sm"
                />
              </FormField>
            </div>
          </div>

          {/* Result */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6 space-y-3 border-2 border-primary/20"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                الرابط الجاهز
              </h3>
              {!isValid && (
                <span className="text-xs text-warning">يرجى ملء الحقول المطلوبة (*)</span>
              )}
            </div>

            <div className="bg-secondary/60 rounded-lg p-4 break-all text-sm text-foreground font-mono min-h-[80px] border border-border">
              {finalUrl || "—"}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={copyUrl}
                disabled={!isValid}
                className="flex-1 min-w-[140px] px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "تم النسخ" : "نسخ الرابط"}
              </button>
              <a
                href={isValid ? finalUrl : "#"}
                target="_blank"
                rel="noopener noreferrer"
                className={`px-4 py-2 rounded-lg bg-secondary text-foreground font-bold flex items-center gap-2 hover:bg-secondary/80 transition ${!isValid ? "opacity-40 pointer-events-none" : ""}`}
              >
                <ExternalLink className="w-4 h-4" /> اختبار
              </a>
            </div>
          </motion.div>
        </div>

        {/* QR Code */}
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-6 text-center">
            <h3 className="font-bold text-foreground mb-3 flex items-center justify-center gap-2">
              <QrCode className="w-4 h-4 text-primary" /> رمز QR
            </h3>
            {isValid ? (
              <>
                <img
                  src={qrUrl}
                  alt="QR Code"
                  className="w-full max-w-[240px] mx-auto rounded-lg border border-border"
                />
                <a
                  href={qrUrl}
                  download={`qr-${campaign || "campaign"}.png`}
                  className="mt-3 inline-block text-xs text-primary hover:underline"
                >
                  ⬇️ تحميل الصورة
                </a>
              </>
            ) : (
              <div className="aspect-square bg-secondary/40 rounded-lg flex items-center justify-center text-muted-foreground text-sm border border-dashed border-border">
                املأ الحقول لتوليد QR
              </div>
            )}
          </div>

          <div className="glass-card rounded-2xl p-4 text-xs text-muted-foreground space-y-2">
            <p className="font-bold text-foreground">💡 نصائح:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>استخدم أحرف صغيرة فقط</li>
              <li>استبدل المسافات بـ <code>_</code></li>
              <li>اجعل أسماء الحملات وصفية وثابتة</li>
              <li>تابع الأداء في صفحة "حملات التسويق"</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const FormField = ({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-sm font-bold text-foreground mb-1">
      {label} {required && <span className="text-destructive">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
  </div>
);

const SmartInput = ({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) => (
  <div className="space-y-2">
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border text-foreground"
    />
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`text-xs px-2.5 py-1 rounded-full border transition ${
            value === o
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  </div>
);

export default UtmBuilder;
