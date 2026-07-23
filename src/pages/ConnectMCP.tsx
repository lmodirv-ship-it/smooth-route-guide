import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Check, ArrowRight, Bot, RefreshCw, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "typamugwwatqmdkxkfof";
const MCP_URL = `https://${projectRef}.supabase.co/functions/v1/mcp`;

export default function ConnectMCP() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(MCP_URL);
    setCopied(true);
    toast({ title: "تم نسخ الرابط" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen gradient-dark pb-24" dir="rtl">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} aria-label="رجوع">
          <ArrowRight className="w-5 h-5 text-muted-foreground" />
        </button>
        <span className="font-bold text-foreground">ربط مساعد ذكي بـ HN Driver</span>
        <Plug className="w-5 h-5 text-primary" />
      </div>

      <div className="px-4 mt-4 space-y-5 max-w-2xl mx-auto">
        {/* Intro */}
        <Card className="glass-card p-5 space-y-2">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-foreground">ما هذا؟</h1>
          </div>
          <p className="text-sm text-muted-foreground leading-6">
            يمكنك ربط ChatGPT أو Claude بحسابك في HN Driver لكي يسألك المساعد
            الذكي عن رحلاتك، طلبات التوصيل، والحجوزات، ويجيب بصلاحياتك أنت فقط.
          </p>
        </Card>

        {/* MCP URL */}
        <Card className="glass-card p-5 space-y-3">
          <h2 className="font-bold text-foreground">رابط الخادم (MCP URL)</h2>
          <p className="text-xs text-muted-foreground">
            انسخ هذا الرابط والصقه في المساعد الذكي الذي تريد استخدامه.
          </p>
          <div className="flex items-center gap-2 bg-secondary/60 rounded-xl p-3">
            <code className="flex-1 text-xs text-foreground break-all font-mono">{MCP_URL}</code>
            <Button size="sm" onClick={copy} className="shrink-0">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span className="mr-1">{copied ? "تم" : "نسخ"}</span>
            </Button>
          </div>
        </Card>

        {/* ChatGPT */}
        <Card className="glass-card p-5 space-y-3">
          <h2 className="font-bold text-foreground">الربط مع ChatGPT</h2>
          <ol className="space-y-2 text-sm text-muted-foreground leading-6 list-decimal pr-5">
            <li>
              افتح{" "}
              <a
                href="https://chatgpt.com/#settings/Connectors/Advanced"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                إعدادات ChatGPT للموصلات (Advanced)
              </a>{" "}
              وفعّل وضع المطوّر (Developer mode).
            </li>
            <li>من قائمة "+" في مربع المحادثة، فعّل Developer mode.</li>
            <li>اضغط "Add sources" ثم "Connect more".</li>
            <li>أعطِ الموصل اسماً مثل <b>HN Driver</b> والصق رابط الخادم أعلاه.</li>
            <li>اطلب من ChatGPT استخدام HN Driver.</li>
          </ol>
        </Card>

        {/* Claude */}
        <Card className="glass-card p-5 space-y-3">
          <h2 className="font-bold text-foreground">الربط مع Claude</h2>
          <ol className="space-y-2 text-sm text-muted-foreground leading-6 list-decimal pr-5">
            <li>
              افتح{" "}
              <a
                href="https://claude.ai/customize/connectors?modal=add-custom-connector"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                صفحة Custom Connectors في Claude
              </a>
              .
            </li>
            <li>أعطِ الموصل اسماً مثل <b>HN Driver</b> والصق رابط الخادم أعلاه.</li>
            <li>فعّل الموصل من مربع المحادثة، ثم اطلب من Claude استخدام HN Driver.</li>
          </ol>
        </Card>

        {/* Refresh */}
        <Card className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">تحديث الاتصال بعد تحديث التطبيق</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            عند إضافة أدوات جديدة أو تحديث التطبيق، يجب على المساعد الذكي تحديث
            قائمة الأدوات.
          </p>

          <div>
            <h3 className="text-sm font-bold text-foreground mb-1">في ChatGPT</h3>
            <ol className="space-y-1 text-sm text-muted-foreground leading-6 list-decimal pr-5">
              <li>افتح إعدادات التطبيقات المفعّلة (Enabled apps) واختر HN Driver.</li>
              <li>بجانب "Information" اضغط "Refresh".</li>
              <li>إن تغيّر الرابط، الصق الرابط الأحدث من الأعلى.</li>
              <li>ابدأ محادثة جديدة واطلب استخدام HN Driver.</li>
            </ol>
          </div>

          <div>
            <h3 className="text-sm font-bold text-foreground mb-1">في Claude</h3>
            <ol className="space-y-1 text-sm text-muted-foreground leading-6 list-decimal pr-5">
              <li>افتح صفحة Connectors واختر HN Driver.</li>
              <li>حدّث أدوات الموصل (Refresh / Update).</li>
              <li>إن تغيّر الرابط، الصق الرابط الأحدث من الأعلى.</li>
              <li>اطلب من Claude استخدام HN Driver.</li>
            </ol>
          </div>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          عند أول اتصال ستُطلب منك الموافقة على الوصول من هذا الحساب.
        </p>
      </div>
    </div>
  );
}
