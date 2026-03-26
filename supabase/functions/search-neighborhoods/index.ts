import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Map Arabic country names to English for Google API
const COUNTRY_MAP: Record<string, string> = {
  "المغرب": "Morocco", "الجزائر": "Algeria", "تونس": "Tunisia",
  "ليبيا": "Libya", "مصر": "Egypt", "موريتانيا": "Mauritania",
  "السعودية": "Saudi Arabia", "الإمارات": "UAE", "الكويت": "Kuwait",
  "قطر": "Qatar", "البحرين": "Bahrain", "عُمان": "Oman",
  "الأردن": "Jordan", "لبنان": "Lebanon", "العراق": "Iraq",
  "سوريا": "Syria", "فلسطين": "Palestine", "اليمن": "Yemen",
  "السودان": "Sudan", "تركيا": "Turkey", "فرنسا": "France",
  "إسبانيا": "Spain", "بلجيكا": "Belgium", "هولندا": "Netherlands",
  "ألمانيا": "Germany", "إيطاليا": "Italy", "كندا": "Canada",
  "الولايات المتحدة": "United States", "بريطانيا": "United Kingdom",
};

// Map Arabic city names to English/French for better search
const CITY_MAP: Record<string, string> = {
  "الدار البيضاء": "Casablanca", "الرباط": "Rabat", "فاس": "Fes",
  "مراكش": "Marrakech", "أكادير": "Agadir", "طنجة": "Tangier",
  "Tanger": "Tangier", "القاهرة": "Cairo", "الإسكندرية": "Alexandria",
  "الرياض": "Riyadh", "جدة": "Jeddah", "الدمام": "Dammam",
  "دبي": "Dubai", "أبوظبي": "Abu Dhabi", "الدوحة": "Doha",
  "المنامة": "Manama", "مسقط": "Muscat", "عمّان": "Amman",
  "بيروت": "Beirut", "بغداد": "Baghdad", "دمشق": "Damascus",
  "تونس العاصمة": "Tunis", "الجزائر العاصمة": "Algiers",
  "إسطنبول": "Istanbul", "أنقرة": "Ankara", "باريس": "Paris",
  "مرسيليا": "Marseille", "ليون": "Lyon", "مدريد": "Madrid",
  "برشلونة": "Barcelona", "لندن": "London", "برلين": "Berlin",
  "نيويورك": "New York", "لوس أنجلوس": "Los Angeles",
  "تورنتو": "Toronto", "مونتريال": "Montreal",
  "الخرطوم": "Khartoum", "طرابلس": "Tripoli", "بنغازي": "Benghazi",
  "صنعاء": "Sanaa", "عدن": "Aden", "نواكشوط": "Nouakchott",
  "مدينة الكويت": "Kuwait City", "القدس": "Jerusalem",
  "رام الله": "Ramallah", "غزة": "Gaza", "حلب": "Aleppo",
  "بروكسل": "Brussels", "أمستردام": "Amsterdam", "روتردام": "Rotterdam",
  "ميلانو": "Milan", "روما": "Rome", "ميونخ": "Munich",
  "مانشستر": "Manchester", "برمنغهام": "Birmingham",
  "إشبيلية": "Seville", "أنتويرب": "Antwerp",
  "المحرق": "Muharraq", "الوكرة": "Al Wakrah",
  "أربيل": "Erbil", "صفاقس": "Sfax", "سوسة": "Sousse",
  "وهران": "Oran", "قسنطينة": "Constantine",
  "أم درمان": "Omdurman", "ديترويت": "Detroit",
};

async function googleTextSearch(query: string, apiKey: string, language = "en"): Promise<any[]> {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}&language=${language}`;
  console.log(`Searching: ${query} (lang=${language})`);
  const response = await fetch(url);
  const data = await response.json();
  console.log(`Google status: ${data.status}, results: ${data.results?.length || 0}`);
  if (data.error_message) console.error(`Google error: ${data.error_message}`);
  return data.results || [];
}

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

    const countryEn = COUNTRY_MAP[country] || country;

    // MODE: cities — search for major cities in a country
    if (mode === "cities") {
      const allCities = new Map<string, any>();

      // Multiple search strategies
      const queries = [
        `cities in ${countryEn}`,
        `major cities ${countryEn}`,
        `${countryEn} city`,
      ];

      for (const query of queries) {
        const results = await googleTextSearch(query, googleMapsApiKey, "ar");
        for (const place of results) {
          const placeId = place.place_id;
          const types = place.types || [];
          // Accept localities and administrative areas
          if (types.includes("locality") || types.includes("administrative_area_level_1") || 
              types.includes("administrative_area_level_2") || types.includes("political")) {
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

      // Also search in French for North African countries
      const frResults = await googleTextSearch(`villes de ${countryEn}`, googleMapsApiKey, "fr");
      for (const place of frResults) {
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

      const cities = Array.from(allCities.values());
      const seen = new Set<string>();
      const unique = cities.filter(c => {
        if (seen.has(c.name)) return false;
        seen.add(c.name);
        return true;
      });

      console.log(`Found ${unique.length} cities for ${country} (${countryEn})`);
      return new Response(
        JSON.stringify({ success: true, cities: unique, total: unique.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // MODE: neighborhoods (default)
    if (!city) {
      return new Response(
        JSON.stringify({ success: false, error: "city is required for neighborhood search" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cityEn = CITY_MAP[city] || city;
    const allResults = new Map<string, any>();

    // Multiple search strategies for neighborhoods
    const queries = [
      `neighborhoods in ${cityEn}, ${countryEn}`,
      `quarters of ${cityEn}`,
      `${cityEn} neighborhoods districts`,
      `quartiers de ${cityEn}`,
      `أحياء مدينة ${city}`,
    ];

    for (const query of queries) {
      const lang = query.includes("أحياء") ? "ar" : query.includes("quartiers") ? "fr" : "en";
      const results = await googleTextSearch(query, googleMapsApiKey, lang);
      for (const place of results) {
        const placeId = place.place_id;
        if (!allResults.has(placeId)) {
          allResults.set(placeId, {
            name_ar: place.name || "",
            name_fr: "",
            lat: place.geometry?.location?.lat || 0,
            lng: place.geometry?.location?.lng || 0,
            place_id: placeId,
          });
        }
        // If French query, save French name
        if (lang === "fr" && allResults.has(placeId)) {
          allResults.get(placeId).name_fr = place.name || "";
        }
      }
    }

    // Get Arabic names for all found places
    const arResults = await googleTextSearch(
      `${cityEn} area neighborhood district`, googleMapsApiKey, "ar"
    );
    for (const place of arResults) {
      const placeId = place.place_id;
      if (allResults.has(placeId)) {
        allResults.get(placeId).name_ar = place.name || "";
      } else {
        allResults.set(placeId, {
          name_ar: place.name || "",
          name_fr: "",
          lat: place.geometry?.location?.lat || 0,
          lng: place.geometry?.location?.lng || 0,
          place_id: placeId,
        });
      }
    }

    const neighborhoods = Array.from(allResults.values()).map(place => ({
      name_ar: place.name_ar,
      name_fr: place.name_fr || "",
      center_lat: place.lat,
      center_lng: place.lng,
    }));

    const seen = new Set<string>();
    const unique = neighborhoods.filter(n => {
      const key = `${n.name_ar}-${n.center_lat.toFixed(3)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`Found ${unique.length} neighborhoods for ${city} (${cityEn}), ${country} (${countryEn})`);
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
