import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/security.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const MAILBLUSTER_API = "https://api.mailbluster.com/api";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("MAILBLUSTER_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "MAILBLUSTER_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Helper: send lead to MailBluster
    async function syncLead(leadData: any) {
      const res = await fetch(`${MAILBLUSTER_API}/leads`, {
        method: "POST",
        headers: { "Authorization": apiKey!, "Content-Type": "application/json" },
        body: JSON.stringify({ ...leadData, subscribed: true, overrideExisting: true }),
      });
      const data = await res.json();
      return { ok: res.ok, data };
    }

    // Helper: get templates for a role
    async function getTemplatesForRole(role: string) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase
        .from("mailbluster_templates")
        .select("*")
        .eq("role", role)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      return data || [];
    }

    // Helper: replace template variables
    function renderTemplate(html: string, vars: Record<string, string>) {
      let result = html;
      for (const [key, value] of Object.entries(vars)) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value || "");
      }
      return result;
    }

    // ─── Sync a single user (on signup) + send welcome email ───
    if (action === "sync_user") {
      const { email, name, phone, role, city, country } = body;
      if (!email) {
        return new Response(JSON.stringify({ error: "email required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const mappedRole = (role === "client" || !role) ? "user" : role;
      const tags = ["hn-driver-platform", `role:${mappedRole}`];
      if (city) tags.push(`city:${city}`);
      if (country) tags.push(`country:${country}`);

      const firstName = name?.split(" ")[0] || "";
      const lastName = name?.split(" ").slice(1).join(" ") || "";

      // 1. Sync lead
      const syncResult = await syncLead({
        email,
        firstName,
        lastName,
        fields: { phone: phone || "", role: mappedRole, city: city || "", country: country || "", source: "hn-driver-platform" },
        tags,
      });

      // 2. Get welcome templates and send immediately (delay=0) or queue
      const templates = await getTemplatesForRole(mappedRole);
      const emailsSent: string[] = [];

      for (const tpl of templates) {
        if (tpl.send_delay_hours > 0) continue; // Only instant ones now

        const renderedHtml = renderTemplate(tpl.body_html, { firstName, lastName, email, name: name || "", role: mappedRole });
        const renderedSubject = renderTemplate(tpl.subject, { firstName, lastName, email, name: name || "", role: mappedRole });

        try {
          // Send via MailBluster transactional API
          const sendRes = await fetch(`${MAILBLUSTER_API}/transactional-mails`, {
            method: "POST",
            headers: { "Authorization": apiKey!, "Content-Type": "application/json" },
            body: JSON.stringify({
              to: email,
              subject: renderedSubject,
              html: renderedHtml,
              fromName: "HN Driver",
            }),
          });
          const sendData = await sendRes.json();
          emailsSent.push(sendRes.ok ? tpl.template_name : `${tpl.template_name}:failed`);
        } catch {
          emailsSent.push(`${tpl.template_name}:error`);
        }
      }

      return new Response(JSON.stringify({
        success: syncResult.ok,
        leadSynced: syncResult.ok,
        emailsSent,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Send a specific template to a user ───
    if (action === "send_template") {
      const { email, template_id, variables } = body;
      if (!email || !template_id) {
        return new Response(JSON.stringify({ error: "email and template_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: tpl } = await supabase
        .from("mailbluster_templates")
        .select("*")
        .eq("id", template_id)
        .single();

      if (!tpl) {
        return new Response(JSON.stringify({ error: "Template not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const vars = variables || {};
      const renderedHtml = renderTemplate(tpl.body_html, vars);
      const renderedSubject = renderTemplate(tpl.subject, vars);

      const sendRes = await fetch(`${MAILBLUSTER_API}/transactional-mails`, {
        method: "POST",
        headers: { "Authorization": apiKey!, "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          subject: renderedSubject,
          html: renderedHtml,
          fromName: "HN Driver",
        }),
      });
      const sendData = await sendRes.json();

      return new Response(JSON.stringify({
        success: sendRes.ok,
        data: sendData,
      }), {
        status: sendRes.ok ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Bulk sync users from database ───
    if (action === "bulk_sync_users") {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, email, name, phone, city, country")
        .not("email", "is", null)
        .limit(200);

      if (error) throw new Error(error.message);

      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const roleMap = new Map<string, string>();
      roles?.forEach((r: any) => roleMap.set(r.user_id, r.role));

      const results: { email: string; status: string }[] = [];

      for (const profile of (profiles || [])) {
        try {
          const role = roleMap.get(profile.id) || "user";
          const tags = ["hn-driver-platform", `role:${role}`];
          if (profile.city) tags.push(`city:${profile.city}`);
          if (profile.country) tags.push(`country:${profile.country}`);

          const result = await syncLead({
            email: profile.email,
            firstName: profile.name?.split(" ")[0] || "",
            lastName: profile.name?.split(" ").slice(1).join(" ") || "",
            fields: { phone: profile.phone || "", role, city: profile.city || "", country: profile.country || "", source: "hn-driver-platform" },
            tags,
          });
          results.push({ email: profile.email, status: result.ok ? "success" : "failed" });
        } catch {
          results.push({ email: profile.email, status: "failed" });
        }
      }

      const synced = results.filter(r => r.status === "success").length;
      return new Response(JSON.stringify({
        success: true, total: results.length, synced, failed: results.length - synced,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Sync prospects ───
    if (action === "sync_leads" && Array.isArray(body.leads)) {
      const results: { name: string; status: string; error?: string }[] = [];

      for (const lead of body.leads.slice(0, 50)) {
        try {
          const tags = ["prospect", `category:${lead.category || "general"}`];
          if (lead.area) tags.push(`area:${lead.area}`);

          const result = await syncLead({
            email: lead.email || `${lead.google_place_id}@placeholder.local`,
            firstName: lead.name || "",
            lastName: "",
            fields: { phone: lead.phone || "", address: lead.address || "", area: lead.area || "", category: lead.category || "", website: lead.website || "", rating: String(lead.rating || ""), source: "hn-driver-prospecting" },
            tags,
          });
          results.push({ name: lead.name, status: result.ok ? "success" : "failed", error: result.ok ? undefined : result.data?.message });
        } catch (e) {
          results.push({ name: lead.name, status: "failed", error: e.message });
        }
      }

      const successCount = results.filter(r => r.status === "success").length;
      return new Response(JSON.stringify({
        success: true, total: results.length, synced: successCount, failed: results.length - successCount, details: results,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Get brands/lists ───
    if (action === "get_brands") {
      const res = await fetch(`${MAILBLUSTER_API}/brands`, {
        headers: { "Authorization": apiKey },
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: sync_user, send_template, bulk_sync_users, sync_leads, get_brands" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("mailbluster-sync error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
