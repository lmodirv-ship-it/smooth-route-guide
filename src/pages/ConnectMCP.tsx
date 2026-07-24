import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Check, ArrowRight, Bot, RefreshCw, Plug, PlayCircle, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "typamugwwatqmdkxkfof";
const MCP_URL = `https://${projectRef}.supabase.co/functions/v1/mcp`;

type TestResult =
  | { state: "ok"; tools: string[]; note?: string }
  | { state: "auth_required"; note: string }
  | { state: "error"; message: string };

export default function ConnectMCP() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(MCP_URL);
      setCopied(true);
      toast.success("تم نسخ الرابط إلى الحافظة ✅", { description: MCP_URL });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("تعذر النسخ — يرجى النسخ يدوياً");
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch(MCP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {},
        }),
      });

      if (res.status === 401 || res.status === 403) {
        setResult({
          state: "auth_required",
          note: "الخادم يعمل ويطلب مصادقة OAuth — هذا سلوك متوقع. سيقوم ChatGPT/Claude بإكمال المصادقة تلقائياً.",
        });
        toast.success("الخادم متصل ✅ (يتطلب تسجيل دخول OAuth)");
        return;
      }

      const text = await res.text();
      let json: any = null;
      try {
        // Handle SSE-style "data: {...}" or plain JSON
        const jsonLine = text.split("\n").find((l) => l.trim().startsWith("{")) || text;
        json = JSON.parse(jsonLine);
      } catch {
        /* ignore */
      }

      const tools = json?.result?.tools?.map((t: any) => t.name) as string[] | undefined;
      if (tools?.length) {
        setResult({ state: "ok", tools });
        toast.success(`نجح الاتصال — ${tools.length} أداة متاحة`);
      } else if (res.ok) {
        setResult({
          state: "ok",
          tools: [],
          note: "الخادم استجاب لكن لم يُرجع قائمة أدوات.",
        });
        toast.success("الخادم متصل");
      } else {
        setResult({ state: "error", message: `HTTP ${res.status}: ${text.slice(0, 200)}` });
        toast.error(`فشل الاختبار (HTTP ${res.status})`);
      }
    } catch (e: any) {
      setResult({ state: "error", message: e?.message ?? "Network error" });
      toast.error("فشل الاتصال بالخادم");
    } finally {
      setTesting(false);
    }
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

        <Card className="glass-card p-5 space-y-3">
          <h2 className="font-bold text-foreground">رابط الخادم (MCP URL)</h2>
          <p className="text-xs text-muted-foreground">
            انسخ هذا الرابط والصقه في المساعد الذكي الذي تريد استخدامه.
          </p>
          <div className="flex items-center gap-2 bg-secondary/60 rounded-xl p-3">
            <code className="flex-1 text-xs text-foreground break-all font-mono">{MCP_URL}</code>
            <Button size="sm" onClick={copy} className="shrink-0">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span className="mr-1">{copied ? "تم النسخ" : "نسخ"}</span>
            </Button>
          </div>

          {/* Test connection */}
          <div className="pt-2 border-t border-border/50 space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={testConnection}
              disabled={testing}
            >
              {testing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PlayCircle className="w-4 h-4" />
              )}
              <span className="mr-2">اختبار الاتصال وعرض الأدوات</span>
            </Button>

            {result && (
              <div
                className={`rounded-xl p-3 text-xs space-y-2 ${
                  result.state === "error"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-success/10 text-success"
                }`}
              >
                {result.state === "ok" && (
                  <>
                    <div className="flex items-center gap-2 font-bold">
                      <Check className="w-4 h-4" /> الاتصال ناجح
                    </div>
                    {result.tools.length > 0 && (
                      <div>
                        <div className="mb-1 opacity-80">الأدوات المتاحة ({result.tools.length}):</div>
                        <ul className="list-disc pr-5 space-y-0.5">
                          {result.tools.map((t) => (
                            <li key={t} className="font-mono">{t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.note && <div className="opacity-80">{result.note}</div>}
                  </>
                )}
                {result.state === "auth_required" && (
                  <>
                    <div className="flex items-center gap-2 font-bold">
                      <Check className="w-4 h-4" /> الخادم متصل
                    </div>
                    <div>{result.note}</div>
                  </>
                )}
                {result.state === "error" && (
                  <>
                    <div className="flex items-center gap-2 font-bold">
                      <XCircle className="w-4 h-4" /> فشل الاختبار
                    </div>
                    <div className="break-all">{result.message}</div>
                  </>
                )}
              </div>
            )}
          </div>
        </Card>

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
