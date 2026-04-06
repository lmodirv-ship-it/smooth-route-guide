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

    // ─── Sync a single user (on signup) ───
    if (action === "sync_user") {
      const { email, name, phone, role, city, country } = body;
      if (!email) {
        return new Response(JSON.stringify({ error: "email required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tags = ["hn-driver-platform", `role:${role || "user"}`];
      if (city) tags.push(`city:${city}`);
      if (country) tags.push(`country:${country}`);

      const res = await fetch(`${MAILBLUSTER_API}/leads`, {
        method: "POST",
        headers: { "Authorization": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName: name?.split(" ")[0] || "",
          lastName: name?.split(" ").slice(1).join(" ") || "",
          fields: {
            phone: phone || "",
            role: role || "user",
            city: city || "",
            country: country || "",
            source: "hn-driver-platform",
          },
          tags,
          subscribed: true,
          overrideExisting: true,
        }),
      });

      const data = await res.json();
      return new Response(JSON.stringify({
        success: res.ok,
        message: res.ok ? "Lead synced" : (data?.message || "Failed"),
      }), {
        status: res.ok ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Bulk sync users from database ───
    if (action === "bulk_sync_users") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

          const res = await fetch(`${MAILBLUSTER_API}/leads`, {
            method: "POST",
            headers: { "Authorization": apiKey, "Content-Type": "application/json" },
            body: JSON.stringify({
              email: profile.email,
              firstName: profile.name?.split(" ")[0] || "",
              lastName: profile.name?.split(" ").slice(1).join(" ") || "",
              fields: {
                phone: profile.phone || "",
                role,
                city: profile.city || "",
                country: profile.country || "",
                source: "hn-driver-platform",
              },
              tags,
              subscribed: true,
              overrideExisting: true,
            }),
          });
          await res.json();
          results.push({ email: profile.email, status: res.ok ? "success" : "failed" });
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

    // ─── Sync prospects (restaurants/stores) ───
    if (action === "sync_leads" && Array.isArray(body.leads)) {
      const results: { name: string; status: string; error?: string }[] = [];

      for (const lead of body.leads.slice(0, 50)) {
        try {
          const tags = ["prospect", `category:${lead.category || "general"}`];
          if (lead.area) tags.push(`area:${lead.area}`);

          const res = await fetch(`${MAILBLUSTER_API}/leads`, {
            method: "POST",
            headers: { "Authorization": apiKey, "Content-Type": "application/json" },
            body: JSON.stringify({
              email: lead.email || `${lead.google_place_id}@placeholder.local`,
              firstName: lead.name || "",
              lastName: "",
              fields: {
                phone: lead.phone || "",
                address: lead.address || "",
                area: lead.area || "",
                category: lead.category || "",
                website: lead.website || "",
                rating: String(lead.rating || ""),
                source: "hn-driver-prospecting",
              },
              tags,
              subscribed: true,
              overrideExisting: true,
            }),
          });

          const data = await res.json();
          results.push({
            name: lead.name,
            status: res.ok ? "success" : "failed",
            error: res.ok ? undefined : (data?.message || JSON.stringify(data)),
          });
        } catch (e) {
          results.push({ name: lead.name, status: "failed", error: e.message });
        }
      }

      const successCount = results.filter(r => r.status === "success").length;
      return new Response(JSON.stringify({
        success: true, total: results.length, synced: successCount,
        failed: results.length - successCount, details: results,
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

    return new Response(JSON.stringify({ error: "Invalid action. Use: sync_user, bulk_sync_users, sync_leads, get_brands" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("mailbluster-sync error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
