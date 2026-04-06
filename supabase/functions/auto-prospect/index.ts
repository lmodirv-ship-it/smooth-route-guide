import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { corsHeaders } from "../_shared/security.ts";

const MAILBLUSTER_API = "https://api.mailbluster.com/api";

// Category-specific email templates for MailBluster
const CATEGORY_TAGS: Record<string, string[]> = {
  restaurant: ["restaurant", "food", "partner"],
  cafe: ["cafe", "food", "partner"],
  grocery_or_supermarket: ["grocery", "store", "partner"],
  bakery: ["bakery", "food", "partner"],
  pharmacy: ["pharmacy", "health", "partner"],
  clothing_store: ["clothing", "store", "partner"],
  electronics_store: ["electronics", "store", "partner"],
  florist: ["florist", "store", "partner"],
  courier: ["courier", "delivery", "driver"],
  moving_company: ["moving", "logistics", "driver"],
  store: ["store", "partner"],
};

// Cities and business types to auto-search
const SEARCH_CONFIGS = [
  { city: "Tanger", country: "Morocco", types: ["restaurant", "cafe", "grocery_or_supermarket", "bakery", "pharmacy", "clothing_store", "electronics_store", "florist", "courier", "store"] },
  { city: "Casablanca", country: "Morocco", types: ["restaurant", "cafe", "grocery_or_supermarket", "bakery", "pharmacy", "store", "courier"] },
  { city: "Marrakech", country: "Morocco", types: ["restaurant", "cafe", "grocery_or_supermarket", "pharmacy", "store"] },
  { city: "Rabat", country: "Morocco", types: ["restaurant", "cafe", "pharmacy", "store", "courier"] },
  { city: "Fes", country: "Morocco", types: ["restaurant", "cafe", "bakery", "pharmacy", "store"] },
  { city: "Agadir", country: "Morocco", types: ["restaurant", "cafe", "pharmacy", "store"] },
  { city: "Meknes", country: "Morocco", types: ["restaurant", "cafe", "pharmacy", "store"] },
  { city: "Oujda", country: "Morocco", types: ["restaurant", "pharmacy", "store"] },
  { city: "Kenitra", country: "Morocco", types: ["restaurant", "pharmacy", "store"] },
  { city: "Tetouan", country: "Morocco", types: ["restaurant", "cafe", "bakery", "store"] },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleMapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    const mailblusterKey = Deno.env.get("MAILBLUSTER_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    let totalNew = 0;
    let totalSynced = 0;
    const errors: string[] = [];

    // Parse body for optional overrides
    let body: any = {};
    try { body = await req.json(); } catch { /* empty body is fine */ }
    
    const configs = body.configs || SEARCH_CONFIGS;
    const syncToMailBluster = body.sync_mailbluster !== false;

    for (const config of configs) {
      for (const type of config.types) {
        if (!googleMapsKey) {
          errors.push("GOOGLE_MAPS_API_KEY not set");
          continue;
        }

        try {
          // Search Google Places
          const query = `${type} in ${config.city}, Morocco`;
          const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${googleMapsKey}&language=fr`;
          const res = await fetch(url);
          const data = await res.json();

          if (data.status !== "OK" || !data.results?.length) continue;

          for (const place of data.results.slice(0, 20)) {
            // Check if already exists
            const { data: existing } = await supabase
              .from("prospects")
              .select("id, mailbluster_synced")
              .eq("google_place_id", place.place_id)
              .maybeSingle();

            if (existing) continue; // Already in DB

            // Get details (phone, website)
            let phone = "";
            let website = "";
            try {
              const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_phone_number,international_phone_number,website&key=${googleMapsKey}&language=fr`;
              const detailRes = await fetch(detailUrl);
              const detailData = await detailRes.json();
              if (detailData.status === "OK" && detailData.result) {
                phone = detailData.result.international_phone_number || detailData.result.formatted_phone_number || "";
                website = detailData.result.website || "";
              }
            } catch (e) {
              console.error("Place details error:", e);
            }

            const addressParts = (place.formatted_address || "").split(",");
            const area = addressParts.length > 1 ? addressParts[addressParts.length - 2]?.trim() : "";

            // Insert into prospects table
            const prospect = {
              name: (place.name || "").substring(0, 200),
              phone: phone.substring(0, 40),
              address: (place.formatted_address || "").substring(0, 300),
              area: (area || "").substring(0, 100),
              city: config.city,
              category: type,
              rating: Number(place.rating || 0),
              website: (website || "").substring(0, 300),
              google_place_id: place.place_id,
              source: "google_auto",
              status: "new",
            };

            const { error: insertErr } = await supabase
              .from("prospects")
              .insert(prospect);

            if (insertErr) {
              if (!insertErr.message.includes("duplicate")) {
                errors.push(`Insert error for ${prospect.name}: ${insertErr.message}`);
              }
              continue;
            }

            totalNew++;

            // Sync to MailBluster if enabled and API key exists
            if (syncToMailBluster && mailblusterKey && prospect.phone) {
              try {
                const tags = CATEGORY_TAGS[type] || ["partner"];
                const mbRes = await fetch(`${MAILBLUSTER_API}/leads`, {
                  method: "POST",
                  headers: {
                    "Authorization": mailblusterKey,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    email: `prospect_${place.place_id.substring(0, 20)}@prospect.local`,
                    firstName: prospect.name,
                    lastName: "",
                    tags,
                    fields: {
                      phone: prospect.phone,
                      address: prospect.address,
                      area: prospect.area,
                      city: prospect.city,
                      category: prospect.category,
                      website: prospect.website,
                      rating: String(prospect.rating),
                      source: "souk-ajail-auto",
                    },
                    subscribed: true,
                  }),
                });

                if (mbRes.ok) {
                  await supabase
                    .from("prospects")
                    .update({ mailbluster_synced: true, mailbluster_synced_at: new Date().toISOString() })
                    .eq("google_place_id", place.place_id);
                  totalSynced++;
                }
              } catch (e) {
                errors.push(`MailBluster sync error for ${prospect.name}: ${e.message}`);
              }
            }
          }
        } catch (e) {
          errors.push(`Search error ${config.city}/${type}: ${e.message}`);
        }

        // Small delay between searches to avoid rate limits
        await new Promise(r => setTimeout(r, 500));
      }
    }

    return new Response(JSON.stringify({
      success: true,
      new_prospects: totalNew,
      mailbluster_synced: totalSynced,
      errors: errors.slice(0, 20),
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("auto-prospect error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
