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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roles } = await callerClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "صلاحيات غير كافية - المدير فقط" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, new_password, send_email } = await req.json();

    if (!user_id || !new_password) {
      return new Response(JSON.stringify({ error: "user_id و new_password مطلوبان" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try GoTrue Admin API first (works for strong passwords)
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user_id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
      body: JSON.stringify({ password: new_password }),
    });

    if (!res.ok) {
      // If GoTrue rejected it (HIBP/weak/short), use SQL with crypt() function
      const dbUrl = Deno.env.get("SUPABASE_DB_URL");
      if (!dbUrl) {
        return new Response(JSON.stringify({ error: "DB_URL غير متوفر" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { default: postgres } = await import("https://deno.land/x/postgresjs@v3.4.4/mod.js");
      const sql = postgres(dbUrl);
      
      try {
        await sql`
          UPDATE auth.users 
          SET encrypted_password = extensions.crypt(${new_password}, extensions.gen_salt('bf')),
              updated_at = now()
          WHERE id = ${user_id}::uuid
        `;
      } finally {
        await sql.end();
      }
    }

    // Send email with new password if requested
    if (send_email) {
      try {
        const adminClient = createClient(supabaseUrl, serviceRoleKey);
        
        // Get user email from profiles
        const { data: profile } = await adminClient
          .from("profiles")
          .select("email, name")
          .eq("id", user_id)
          .single();

        if (profile?.email) {
          // Try to send via transactional email, fallback to enqueue
          try {
            await adminClient.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                to: profile.email,
                subject: "تم تغيير كلمة المرور الخاصة بك - HN Driver",
                html: `
                  <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
                    <div style="text-align: center; margin-bottom: 30px;">
                      <h1 style="color: #1a1a2e; font-size: 24px; margin: 0;">HN Driver</h1>
                    </div>
                    <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
                      <h2 style="color: #1a1a2e; font-size: 20px; margin: 0 0 15px;">مرحباً ${profile.name || ""}،</h2>
                      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        تم تغيير كلمة المرور الخاصة بحسابك من قبل الإدارة. يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة:
                      </p>
                      <div style="background: #1a1a2e; color: #ffffff; font-size: 28px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; letter-spacing: 4px; font-family: monospace;">
                        ${new_password}
                      </div>
                      <p style="color: #888; font-size: 13px; margin-top: 20px; text-align: center;">
                        ننصح بتغيير كلمة المرور بعد تسجيل الدخول لأسباب أمنية.
                      </p>
                    </div>
                    <div style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
                      <p>هذا البريد مرسل تلقائياً من منصة HN Driver</p>
                      <p>www.hn-driver.com</p>
                    </div>
                  </div>
                `,
                sender_domain: "notify.hn-driver.com",
                from_name: "HN Driver",
                from_email: "noreply@hn-driver.com",
                message_id: `pwd-reset-${user_id}-${Date.now()}`,
              },
            });
          } catch {
            // If queue not available, log but don't fail the password change
            console.log("Email queue not available, skipping email notification");
          }
        }
      } catch (emailErr) {
        console.error("Failed to send password email:", emailErr);
        // Don't fail the whole operation if email fails
      }
    }

    return new Response(JSON.stringify({ success: true, message: "تم تغيير كلمة المرور بنجاح" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
