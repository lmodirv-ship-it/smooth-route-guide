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
    const { city, country, mode } = await req.json();

    if (!country) {
      return new Response(
        JSON.stringify({ success: false, error: "country is required" }),
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

    // MODE: cities — search for major cities in a country
    if (mode === "cities") {
      const queries = [
        `major cities in ${country}`,
        `مدن رئيسية في ${country}`,
      ];

      const allCities = new Map<string, any>();

      for (const query of queries) {
        const lang = query.includes("مدن") ? "ar" : "en";
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&type=locality&key=${googleMapsApiKey}&language=${lang === "ar" ? "ar" : "fr"}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.results) {
          for (const place of data.results) {
            const placeId = place.place_id;
            if (!allCities.has(placeId)) {
              allCities.set(placeId, {
                name: place.name || "",
                lat: place.geometry?.location?.lat || 0,
                lng: place.geometry?.location?.lng || 0,
                place_id: placeId,
              });
            }
          }
        }
      }

      const cities = Array.from(allCities.values());
      // Deduplicate by name
      const seen = new Set<string>();
      const unique = cities.filter(c => {
        if (seen.has(c.name)) return false;
        seen.add(c.name);
        return true;
      });

      console.log(`Found ${unique.length} cities for ${country}`);
      return new Response(
        JSON.stringify({ success: true, cities: unique, total: unique.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // MODE: neighborhoods (default) — search for neighborhoods in a city
    if (!city) {
      return new Response(
        JSON.stringify({ success: false, error: "city is required for neighborhood search" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const queries = [
      `neighborhoods quarters areas in ${city}, ${country}`,
      `أحياء ${city}`,
      `quartiers de ${city}`,
    ];

    const allResults = new Map<string, any>();

    for (const query of queries) {
      const lang = query.includes("أحياء") ? "ar" : query.includes("quartiers") ? "fr" : "ar";
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${googleMapsApiKey}&language=${lang}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.results) {
        for (const place of data.results) {
          const placeId = place.place_id;
          if (!allResults.has(placeId)) {
            allResults.set(placeId, {
              name: place.name || "",
              name_lang: lang,
              lat: place.geometry?.location?.lat || 0,
              lng: place.geometry?.location?.lng || 0,
              place_id: placeId,
            });
          } else if (lang === "fr") {
            allResults.get(placeId).name_fr = place.name || "";
          }
        }
      }
    }

    const neighborhoods = Array.from(allResults.values()).map(place => ({
      name_ar: place.name,
      name_fr: place.name_fr || "",
      center_lat: place.lat,
      center_lng: place.lng,
      place_id: place.place_id,
    }));

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
