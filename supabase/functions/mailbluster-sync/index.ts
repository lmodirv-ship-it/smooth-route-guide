import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/security.ts";

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

    const { action, leads } = await req.json();

    if (action === "sync_leads" && Array.isArray(leads)) {
      const results: { name: string; status: string; error?: string }[] = [];

      for (const lead of leads.slice(0, 50)) {
        try {
          // Create or update lead in MailBluster
          const res = await fetch(`${MAILBLUSTER_API}/leads`, {
            method: "POST",
            headers: {
              "Authorization": apiKey,
              "Content-Type": "application/json",
            },
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
                source: "souk-ajail-prospecting",
              },
              subscribed: true,
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
        success: true,
        total: results.length,
        synced: successCount,
        failed: results.length - successCount,
        details: results,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get MailBluster products/brands (lists)
    if (action === "get_brands") {
      const res = await fetch(`${MAILBLUSTER_API}/brands`, {
        headers: { "Authorization": apiKey },
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("mailbluster-sync error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
