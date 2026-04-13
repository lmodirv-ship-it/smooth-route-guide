import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, source, target, texts } = await req.json();

    // Support single text or batch
    const inputTexts: string[] = texts ?? (text ? [text] : []);
    if (inputTexts.length === 0 || !target) {
      return new Response(JSON.stringify({ error: "text/texts and target are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (inputTexts.length > 128) {
      return new Response(JSON.stringify({ error: "Max 128 texts per request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get API key: env first, then app_settings fallback
    let apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");

    if (!apiKey) {
      const sbUrl = Deno.env.get("SUPABASE_URL")!;
      const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const res = await fetch(
        `${sbUrl}/rest/v1/app_settings?key=eq.api_keys&select=value`,
        { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }
      );
      const rows = await res.json();
      apiKey = rows?.[0]?.value?.google_maps_api_key || rows?.[0]?.value?.google_translate_api_key;
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Google API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Google Cloud Translation API v2
    const body: Record<string, unknown> = {
      q: inputTexts,
      target,
      format: "text",
    };
    if (source) body.source = source;

    const gRes = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const gData = await gRes.json();

    if (!gRes.ok) {
      console.error("Google Translate API error:", JSON.stringify(gData));
      return new Response(JSON.stringify({ error: gData.error?.message || "Translation failed" }), {
        status: gRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const translations = gData.data.translations.map(
      (t: { translatedText: string; detectedSourceLanguage?: string }) => ({
        text: t.translatedText,
        detectedSource: t.detectedSourceLanguage,
      })
    );

    return new Response(JSON.stringify({ translations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("google-translate error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
