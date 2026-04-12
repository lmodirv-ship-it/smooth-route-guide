import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, enforceRateLimit, handleError, parseJson, sanitizePlainText, z } from "../_shared/security.ts";

const requestSchema = z.object({
  city: z.string().trim().max(80).optional(),
  type: z.string().trim().max(40).optional(),
  useGoogle: z.boolean().optional(),
  area: z.string().trim().max(80).optional(),
});

const MOCK_RESTAURANTS = [
  {
    name: "Restaurant El Korsan",
    address: "85, Rue de la Kasbah, Tanger 90000",
    area: "Kasbah",
    lat: 35.7873,
    lng: -5.8137,
    phone: "+212 539 935 885",
    rating: 4.5,
    image_url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400",
    is_open: true,
    google_place_id: "mock_elkorsan_001",
    category: "restaurant"
  },
  {
    name: "Le Saveur de Poisson",
    address: "2 Escalier Waller, Tanger 90000",
    area: "Médina",
    lat: 35.7856,
    lng: -5.8122,
    phone: "+212 539 336 326",
    rating: 4.7,
    image_url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400",
    is_open: true,
    google_place_id: "mock_saveur_002",
    category: "restaurant"
  },
  {
    name: "Café Hafa",
    address: "Avenue Hadi Mandri, Tanger",
    area: "Marshan",
    lat: 35.7892,
    lng: -5.8231,
    phone: "+212 539 334 024",
    rating: 4.3,
    image_url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400",
    is_open: true,
    google_place_id: "mock_hafa_003",
    category: "café"
  },
  {
    name: "Pizzeria Populaire",
    address: "23 Rue Ibn Batouta, Tanger",
    area: "Centre Ville",
    lat: 35.7753,
    lng: -5.8029,
    phone: "+212 539 941 234",
    rating: 4.1,
    image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400",
    is_open: true,
    google_place_id: "mock_pizzeria_004",
    category: "pizzeria"
  },
  {
    name: "Dar Naji",
    address: "Rue de la Plage, Tanger",
    area: "Malabata",
    lat: 35.7914,
    lng: -5.7856,
    phone: "+212 539 337 337",
    rating: 4.6,
    image_url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400",
    is_open: true,
    google_place_id: "mock_darnaji_005",
    category: "restaurant"
  },
  {
    name: "Chez Abdou",
    address: "10 Rue Siaghine, Tanger Médina",
    area: "Médina",
    lat: 35.7844,
    lng: -5.8101,
    phone: "+212 539 334 567",
    rating: 4.2,
    image_url: "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400",
    is_open: true,
    google_place_id: "mock_abdou_006",
    category: "restaurant"
  },
  {
    name: "La Fabrique",
    address: "7 Rue d'Angleterre, Tanger",
    area: "Centre Ville",
    lat: 35.7769,
    lng: -5.8054,
    phone: "+212 661 234 567",
    rating: 4.4,
    image_url: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400",
    is_open: false,
    google_place_id: "mock_fabrique_007",
    category: "café"
  },
  {
    name: "Restaurant Ahlen",
    address: "8 Rue Mokhtar Ahardan, Tanger",
    area: "Mesnana",
    lat: 35.7683,
    lng: -5.8172,
    phone: "+212 539 940 000",
    rating: 4.0,
    image_url: "https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?w=400",
    is_open: true,
    google_place_id: "mock_ahlen_008",
    category: "restaurant"
  },
  {
    name: "Tacos de Lyon - Tanger",
    address: "Boulevard Mohammed V, Tanger",
    area: "Centre Ville",
    lat: 35.7742,
    lng: -5.8013,
    phone: "+212 539 322 100",
    rating: 3.9,
    image_url: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400",
    is_open: true,
    google_place_id: "mock_tacos_009",
    category: "fast-food"
  },
  {
    name: "Salon Bleu",
    address: "Petit Socco, Tanger Médina",
    area: "Médina",
    lat: 35.7851,
    lng: -5.8113,
    phone: "+212 539 335 500",
    rating: 4.3,
    image_url: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400",
    is_open: true,
    google_place_id: "mock_salonbleu_010",
    category: "café"
  },
  {
    name: "Nord Pinus Tanger",
    address: "11 Rue du Riad Sultan, Tanger",
    area: "Kasbah",
    lat: 35.7880,
    lng: -5.8145,
    phone: "+212 539 333 140",
    rating: 4.5,
    image_url: "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=400",
    is_open: true,
    google_place_id: "mock_nordpinus_011",
    category: "restaurant"
  },
  {
    name: "Burger King Tanger",
    address: "Tanger City Mall, Tanger",
    area: "Boukhalef",
    lat: 35.7412,
    lng: -5.8567,
    phone: "+212 539 340 000",
    rating: 3.8,
    image_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400",
    is_open: true,
    google_place_id: "mock_burgerking_012",
    category: "fast-food"
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await enforceRateLimit(req, "google-places-search", 20, 60);
    const { city, type, useGoogle, area } = await parseJson(req, requestSchema);
    const googleMapsApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    const safeCity = sanitizePlainText(city || "Tanger", 80);
    const safeType = sanitizePlainText(type || "restaurants", 40);
    const safeArea = area ? sanitizePlainText(area, 80) : "";

    if (useGoogle && googleMapsApiKey) {
      const areaQuery = safeArea
        ? `${safeType} in ${safeArea}, ${safeCity}, Morocco`
        : `${safeType} in ${safeCity}, Morocco`;
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(areaQuery)}&key=${googleMapsApiKey}&language=fr`;

      console.log("Google Places API URL:", areaQuery);
      const response = await fetch(url);
      const data = await response.json();
      console.log("Google Places API status:", data.status, "results:", data.results?.length || 0, "error:", data.error_message || "none");

      if (data.status === "OK" && data.results?.length > 0) {
        // Fetch details (phone, website) for each place in parallel (max 10)
        const placesToDetail = data.results.slice(0, 15);
        const detailedRestaurants = await Promise.all(
          placesToDetail.map(async (place: any) => {
            const addressParts = (place.formatted_address || "").split(",");
            const areaLabel = addressParts.length > 1 ? addressParts[addressParts.length - 2]?.trim() : "";

            let phone = "";
            let website = "";
            // Fetch Place Details for phone number
            if (place.place_id) {
              try {
                const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_phone_number,international_phone_number,website&key=${googleMapsApiKey}&language=fr`;
                const detailRes = await fetch(detailUrl);
                const detailData = await detailRes.json();
                if (detailData.status === "OK" && detailData.result) {
                  phone = detailData.result.international_phone_number || detailData.result.formatted_phone_number || "";
                  website = detailData.result.website || "";
                }
              } catch (e) {
                console.error("Place details error:", e);
              }
            }

            // Get photo URL if available
            let imageUrl = "";
            if (place.photos && place.photos.length > 0) {
              const photoRef = place.photos[0].photo_reference;
              imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoRef}&key=${googleMapsApiKey}`;
            }

            return {
              name: sanitizePlainText(place.name || "", 120),
              address: sanitizePlainText(place.formatted_address || "", 220),
              area: sanitizePlainText(areaLabel || "", 80),
              lat: Number(place.geometry?.location?.lat || 0),
              lng: Number(place.geometry?.location?.lng || 0),
              phone: sanitizePlainText(phone, 40),
              rating: Number(place.rating || 0),
              image_url: imageUrl,
              is_open: place.opening_hours?.open_now ?? true,
              google_place_id: sanitizePlainText(place.place_id || "", 160),
              category: "restaurant",
              website: sanitizePlainText(website, 200),
            };
          })
        );

        return new Response(JSON.stringify({
          restaurants: detailedRestaurants,
          source: "google",
          total: detailedRestaurants.length,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let filtered = MOCK_RESTAURANTS.filter((restaurant) => {
      if (safeType && safeType !== "all" && safeType !== "restaurants") {
        return restaurant.category.toLowerCase().includes(safeType.toLowerCase());
      }
      return true;
    });

    if (safeArea) {
      filtered = filtered.filter((restaurant) => restaurant.area.toLowerCase().includes(safeArea.toLowerCase()));
    }

    return new Response(JSON.stringify({
      restaurants: filtered,
      source: "mock",
      total: filtered.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("google-places-search error:", error);
    return handleError(error);
  }
});