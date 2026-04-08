/**
 * Privacy Policy Page — COPPA-compliant (children under 13)
 */
import { useNavigate } from "react-router-dom";
import { ArrowRight, Shield, Baby, Lock, Trash2, Mail, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  {
    icon: Shield,
    title: "مقدمة",
    content: `نحن في HN Driver نأخذ خصوصية جميع مستخدمينا على محمل الجد، وخاصة خصوصية الأطفال دون سن 13 عامًا. تم تصميم سياسة الخصوصية هذه وفقًا لقانون حماية خصوصية الأطفال على الإنترنت (COPPA) والتشريعات المعمول بها في المغرب والاتحاد الأوروبي (GDPR).`
  },
  {
    icon: Baby,
    title: "حماية خصوصية الأطفال (أقل من 13 عامًا)",
    content: `• لا نقوم بجمع معلومات شخصية من الأطفال دون سن 13 عامًا بشكل متعمد.
• إذا اكتشفنا أن طفلاً دون 13 عامًا قد قدّم معلومات شخصية، سنحذفها فورًا.
• يجب الحصول على موافقة ولي الأمر قبل أي جمع لبيانات الأطفال.
• لا نعرض إعلانات موجهة للأطفال.
• لا نشارك بيانات الأطفال مع أطراف ثالثة لأغراض تجارية.`
  },
  {
    icon: Lock,
    title: "البيانات التي نجمعها",
    content: `• معلومات الحساب: الاسم، البريد الإلكتروني، رقم الهاتف (للمستخدمين البالغين فقط).
• بيانات الموقع الجغرافي: لتقديم خدمات التوصيل والنقل.
• بيانات الاستخدام: سجل الطلبات والرحلات لتحسين الخدمة.
• بيانات الدفع: تتم معالجتها عبر بوابات دفع آمنة ومشفرة.
• لا نجمع بيانات بيومترية من الأطفال.`
  },
  {
    icon: Shield,
    title: "كيف نحمي بياناتك",
    content: `• تشفير البيانات أثناء النقل والتخزين (SSL/TLS).
• مصادقة متعددة العوامل لحسابات المسؤولين.
• مراجعات أمنية دورية واختبارات اختراق.
• تقييد الوصول إلى البيانات الشخصية على الموظفين المصرح لهم فقط.
• حذف البيانات غير الضرورية بشكل دوري.`
  },
  {
    icon: Trash2,
    title: "حقوق أولياء الأمور",
    content: `يحق لأولياء الأمور:
• مراجعة المعلومات الشخصية المجمعة عن أطفالهم.
• طلب حذف بيانات أطفالهم بالكامل.
• رفض أي جمع إضافي لبيانات أطفالهم.
• سحب الموافقة في أي وقت.
لممارسة هذه الحقوق، يرجى التواصل معنا عبر البريد الإلكتروني أدناه.`
  },
  {
    icon: AlertTriangle,
    title: "مشاركة البيانات مع أطراف ثالثة",
    content: `• لا نبيع بيانات المستخدمين لأي طرف ثالث.
• قد نشارك بيانات محدودة مع مزودي الخدمة (معالجة الدفع، التوصيل) لإتمام الطلبات.
• قد نكشف عن بيانات إذا طلب القانون ذلك.
• لا نشارك بيانات الأطفال مطلقًا مع أطراف ثالثة لأغراض تسويقية.`
  },
  {
    icon: Mail,
    title: "تواصل معنا",
    content: `إذا كانت لديك أي أسئلة حول سياسة الخصوصية أو ترغب في ممارسة حقوقك:
• البريد الإلكتروني: privacy@hn-driver.com
• الهاتف: +212 539 000 000
• العنوان: طنجة، المغرب

آخر تحديث: 8 أبريل 2026
© 2026 HN GROUPE — جميع الحقوق محفوظة لمولاي اسماعيل الحسني.`
  },
];

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-primary/20 via-primary/10 to-background border-b border-border/40">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 gap-1">
            <ArrowRight className="w-4 h-4" />
            رجوع
          </Button>
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-10 h-10 text-primary" />
            <h1 className="text-3xl font-bold">سياسة الخصوصية</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            حماية بياناتك وبيانات أطفالك هي أولويتنا القصوى
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {sections.map((section, i) => (
          <div key={i} className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <section.icon className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">{section.title}</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {section.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PrivacyPolicy;
