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

    const { to, body: messageBody, from } = await req.json();

    if (!to || !messageBody) {
      return json({ error: "الرجاء إدخال رقم الهاتف ونص الرسالة" }, 400);
    }

    // Validate phone number format (E.164)
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    if (!phoneRegex.test(to)) {
      return json({ error: "صيغة رقم الهاتف غير صحيحة. استخدم الصيغة الدولية مثل +212600000000" }, 400);
    }

    if (messageBody.length > 1600) {
      return json({ error: "الرسالة طويلة جداً (الحد الأقصى 1600 حرف)" }, 400);
    }

    // Send SMS via Twilio gateway
    const params = new URLSearchParams({
      To: to,
      From: from || Deno.env.get("TWILIO_PHONE_NUMBER") || "+15017122661",
      Body: messageBody,
    });

    const response = await fetch(`${GATEWAY_URL}/Messages.json`, {
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
      console.error("Twilio SMS error:", JSON.stringify(data));
      return json({ error: "فشل إرسال الرسالة", details: data.message }, 500);
    }

    // Log communication
    await supabase.from("twilio_communications").insert({
      user_id: user.id,
      direction: "outbound",
      comm_type: "sms",
      from_number: params.get("From"),
      to_number: to,
      body: messageBody,
      status: data.status || "sent",
      twilio_sid: data.sid,
    });

    return json({ success: true, sid: data.sid, status: data.status });
  } catch (error) {
    console.error("SMS error:", error);
    return json({ error: error.message || "خطأ في إرسال الرسالة" }, 500);
  }
});
