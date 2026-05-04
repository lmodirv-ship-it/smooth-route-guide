// Enrich existing prospects with rich Google Places data (photos, hours, geo, ratings count)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { corsHeaders } from "../_shared/security.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const googleKey = Deno.env.get("GOOGLE_MAPS_API_KEY");

  // Auth: admin only
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  try {
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    const userId = claims?.claims?.sub;
    if (!userId) throw new Error("no user");
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    if (!roles?.some((r: any) => r.role === "admin")) throw new Error("not admin");
  } catch {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (!googleKey) {
    return new Response(JSON.stringify({ error: "GOOGLE_MAPS_API_KEY not set" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  let body: any = {};
  try { body = await req.json(); } catch {}
  const limit = Math.min(Number(body.limit || 50), 200);
  const minRating = Number(body.min_rating || 0);

  // Pick prospects that need enrichment
  let q = supabase
    .from("prospects")
    .select("id, google_place_id, rating")
    .is("enriched_at", null)
    .not("google_place_id", "is", null)
    .order("rating", { ascending: false })
    .limit(limit);
  if (minRating > 0) q = q.gte("rating", minRating);

  const { data: rows, error } = await q;
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  let enriched = 0;
  const errors: string[] = [];
  const photoUrl = (ref: string, w = 800) =>
    `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${w}&photo_reference=${ref}&key=${googleKey}`;

  for (const row of rows || []) {
    if (!row.google_place_id) continue;
    try {
      const fields = "formatted_phone_number,international_phone_number,website,opening_hours,user_ratings_total,business_status,price_level,photos,editorial_summary,geometry";
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${row.google_place_id}&fields=${fields}&key=${googleKey}&language=fr`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status !== "OK" || !data.result) {
        errors.push(`${row.id}: ${data.status}`);
        continue;
      }
      const r = data.result;
      const photoRefs: string[] = (r.photos || []).slice(0, 10).map((p: any) => p.photo_reference).filter(Boolean);
      const photos = photoRefs.map(ref => ({ url: photoUrl(ref, 800), thumb: photoUrl(ref, 300) }));
      const update: any = {
        photo_url: photos[0]?.url || null,
        photos,
        lat: r.geometry?.location?.lat ?? null,
        lng: r.geometry?.location?.lng ?? null,
        opening_hours: r.opening_hours?.weekday_text ? { weekday_text: r.opening_hours.weekday_text, open_now: r.opening_hours.open_now } : null,
        user_ratings_total: Number(r.user_ratings_total || 0),
        business_status: r.business_status || "",
        price_level: typeof r.price_level === "number" ? r.price_level : null,
        description: r.editorial_summary?.overview || null,
        enriched_at: new Date().toISOString(),
      };
      if (r.international_phone_number || r.formatted_phone_number) {
        update.phone = (r.international_phone_number || r.formatted_phone_number).substring(0, 40);
      }
      if (r.website) update.website = r.website.substring(0, 300);

      const { error: upErr } = await supabase.from("prospects").update(update).eq("id", row.id);
      if (upErr) errors.push(`${row.id}: ${upErr.message}`);
      else enriched++;

      await new Promise(r => setTimeout(r, 120));
    } catch (e: any) {
      errors.push(`${row.id}: ${e.message}`);
    }
  }

  return new Response(JSON.stringify({
    success: true,
    processed: rows?.length || 0,
    enriched,
    errors: errors.slice(0, 10),
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
