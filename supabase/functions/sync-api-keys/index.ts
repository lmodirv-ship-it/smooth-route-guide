import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Map env var names to app_settings keys
    const keyMap: Record<string, string> = {
      GOOGLE_MAPS_API_KEY: "google_maps_api_key",
      PAYPAL_CLIENT_ID_LIVE: "paypal_client_id_live",
      PAYPAL_SECRET_KEY: "paypal_secret_key",
      PAYPAL_ENV: "paypal_env",
      STRIPE_SECRET_KEY: "stripe_secret_key",
      TWILIO_API_KEY: "twilio_api_key",
      TWILIO_PHONE_NUMBER: "twilio_phone_number",
      MAILBLUSTER_API_KEY: "mailbluster_api_key",
      LOVABLE_API_KEY: "lovable_api_key",
    };

    // Build the merged keys object
    const { data: existing } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "api_keys")
      .maybeSingle();

    const current = (existing?.value as Record<string, string>) || {};

    let synced = 0;
    for (const [envName, settingsKey] of Object.entries(keyMap)) {
      const val = Deno.env.get(envName);
      if (val && val.trim()) {
        current[settingsKey] = val.trim();
        synced++;
      }
    }

    // Also copy google_maps key to related google keys if not set
    const gKey = current["google_maps_api_key"];
    if (gKey) {
      if (!current["google_places_api_key"]) current["google_places_api_key"] = gKey;
      if (!current["google_geocoding_api_key"]) current["google_geocoding_api_key"] = gKey;
      if (!current["google_directions_api_key"]) current["google_directions_api_key"] = gKey;
      if (!current["google_translate_api_key"]) current["google_translate_api_key"] = gKey;
    }

    // Upsert
    const { data: ex2 } = await supabase.from("app_settings").select("id").eq("key", "api_keys").maybeSingle();
    if (ex2) {
      await supabase.from("app_settings").update({ value: current as any, updated_at: new Date().toISOString() }).eq("key", "api_keys");
    } else {
      await supabase.from("app_settings").insert({ key: "api_keys", value: current as any });
    }

    return new Response(JSON.stringify({ success: true, synced }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
