import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY is not configured");

    const TWILIO_PHONE = Deno.env.get("TWILIO_PHONE_NUMBER");
    if (!TWILIO_PHONE) throw new Error("TWILIO_PHONE_NUMBER is not configured");

    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { to, twiml_url } = await req.json();

    if (!to) {
      return json({ error: "الرجاء إدخال رقم الهاتف" }, 400);
    }

    // Validate phone number format (E.164)
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    if (!phoneRegex.test(to)) {
      return json({ error: "صيغة رقم الهاتف غير صحيحة. يجب أن يبدأ بـ + متبوعاً بكود الدولة" }, 400);
    }

    // Initiate call via Twilio gateway
    const params = new URLSearchParams({
      To: to,
      From: TWILIO_PHONE,
      Url: twiml_url || "http://demo.twilio.com/docs/voice.xml",
    });

    const response = await fetch(`${GATEWAY_URL}/Calls.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Twilio Call error:", JSON.stringify(data));
      return json({ error: "فشل بدء المكالمة", details: data.message || data.detail }, 500);
    }

    // Log communication
    await supabase.from("twilio_communications").insert({
      user_id: user.id,
      direction: "outbound",
      comm_type: "call",
      from_number: TWILIO_PHONE,
      to_number: to,
      status: data.status || "initiated",
      twilio_sid: data.sid,
    });

    return json({ success: true, sid: data.sid, status: data.status });
  } catch (error) {
    console.error("Call error:", error);
    return json({ error: error.message || "خطأ في بدء المكالمة" }, 500);
  }
});
