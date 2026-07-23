import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";

/**
 * OAuth consent page for the app's MCP server.
 * Supabase Auth (OAuth 2.1 authorization server) redirects here with
 * ?authorization_id=... so the signed-in user can approve or deny an
 * external MCP client (Claude, ChatGPT, Cursor, ...).
 */
export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      const oauth: any = (supabase.auth as any).oauth;
      if (!oauth?.getAuthorizationDetails) {
        return setError("OAuth 2.1 not enabled on this backend.");
      }
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const oauth: any = (supabase.auth as any).oauth;
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("No redirect returned by the authorization server.");
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-6 max-w-md w-full text-center space-y-3">
          <h1 className="text-lg font-semibold">تعذر تحميل طلب الترخيص</h1>
          <p className="text-sm text-muted-foreground break-words">{error}</p>
        </Card>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </main>
    );
  }

  const clientName = details.client?.name ?? "تطبيق خارجي";

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background" dir="rtl">
      <Card className="p-8 max-w-md w-full space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">ربط {clientName} بحسابك</h1>
            <p className="text-sm text-muted-foreground">HN Driver MCP</p>
          </div>
        </div>

        <p className="text-sm leading-6">
          سيتمكن <b>{clientName}</b> من قراءة بيانات حسابك عبر أدوات MCP
          (معلوماتك، رحلاتك، طلبات التوصيل، الحجوزات). كل شيء يجري بصلاحياتك أنت
          وفق قواعد الأمان (RLS).
        </p>

        <div className="flex gap-3 pt-2">
          <Button
            className="flex-1"
            onClick={() => decide(true)}
            disabled={busy}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "الموافقة والاتصال"}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => decide(false)}
            disabled={busy}
          >
            رفض
          </Button>
        </div>
      </Card>
    </main>
  );
}
