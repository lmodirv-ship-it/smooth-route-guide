import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, action, photo_data } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "email_required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Log a failed attempt
    if (action === "log_attempt") {
      await supabase.from("face_auth_attempts").insert({
        target_email: email,
        photo_data: photo_data || null,
        result: "rejected",
      });

      // Send notification to account owner
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (profile) {
        await supabase.from("notifications").insert({
          user_id: profile.id,
          type: "security",
          message: `⚠️ محاولة دخول غير مصرح بها إلى حسابك. شخص غير معروف حاول تسجيل الدخول.`,
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lookup face descriptor by email
    const { data, error } = await supabase
      .from("face_auth_profiles")
      .select("descriptor")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ error: "db_error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!data) {
      // No face registered — allow normal login
      return new Response(JSON.stringify({ registered: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ registered: true, descriptor: data.descriptor }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
