import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city, country } = await req.json();

    if (!city || !country) {
      return new Response(
        JSON.stringify({ success: false, error: "city and country are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const googleMapsApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!googleMapsApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Google Maps API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Search for neighborhoods/quarters in the city
    const query = `neighborhoods quarters areas in ${city}, ${country}`;
    const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&type=neighborhood&key=${googleMapsApiKey}&language=ar`;

    const response = await fetch(textSearchUrl);
    const data = await response.json();

    // Step 2: Also search with "sublocality" type for more results
    const query2 = `أحياء ${city}`;
    const textSearchUrl2 = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query2)}&key=${googleMapsApiKey}&language=ar`;
    
    const response2 = await fetch(textSearchUrl2);
    const data2 = await response2.json();

    // Step 3: Also search in French for bilingual names
    const queryFr = `quartiers de ${city}`;
    const textSearchUrlFr = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(queryFr)}&key=${googleMapsApiKey}&language=fr`;
    
    const responseFr = await fetch(textSearchUrlFr);
    const dataFr = await responseFr.json();

    // Combine results and deduplicate by place_id
    const allResults = new Map<string, any>();
    
    const processResults = (results: any[], lang: string) => {
      if (!results) return;
      for (const place of results) {
        const placeId = place.place_id;
        if (!allResults.has(placeId)) {
          allResults.set(placeId, {
            name: place.name || "",
            name_lang: lang,
            lat: place.geometry?.location?.lat || 0,
            lng: place.geometry?.location?.lng || 0,
            place_id: placeId,
            types: place.types || [],
          });
        } else if (lang === "fr") {
          // Add French name
          allResults.get(placeId).name_fr = place.name || "";
        }
      }
    };

    processResults(data.results, "ar");
    processResults(data2.results, "ar");
    processResults(dataFr.results, "fr");

    // Filter to keep only relevant types (neighborhoods, sublocalities, localities)
    const relevantTypes = ["neighborhood", "sublocality", "sublocality_level_1", "locality", "political", "administrative_area_level_3", "administrative_area_level_4"];
    
    const neighborhoods = Array.from(allResults.values())
      .filter(place => {
        const types = place.types || [];
        return types.some((t: string) => relevantTypes.includes(t)) || true; // Keep all for now
      })
      .map(place => ({
        name_ar: place.name_lang === "ar" ? place.name : (place.name_fr ? place.name : place.name),
        name_fr: place.name_lang === "fr" ? place.name : (place.name_fr || ""),
        center_lat: place.lat,
        center_lng: place.lng,
        place_id: place.place_id,
      }));

    // Remove duplicates by name
    const seen = new Set<string>();
    const unique = neighborhoods.filter(n => {
      const key = `${n.name_ar}-${n.center_lat.toFixed(3)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`Found ${unique.length} neighborhoods for ${city}, ${country}`);

    return new Response(
      JSON.stringify({ success: true, neighborhoods: unique, total: unique.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("search-neighborhoods error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
