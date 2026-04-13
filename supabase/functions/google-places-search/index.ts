import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, enforceRateLimit, handleError, parseJson, sanitizePlainText, z } from "../_shared/security.ts";

const requestSchema = z.object({
  city: z.string().trim().max(80).optional(),
  type: z.string().trim().max(40).optional(),
  useGoogle: z.boolean().optional(),
  area: z.string().trim().max(80).optional(),
});

const MOCK_DATA: Record<string, any[]> = {
  restaurant: [
    { name: "Restaurant El Korsan", address: "85, Rue de la Kasbah, Tanger", area: "Kasbah", lat: 35.7873, lng: -5.8137, phone: "+212 539 935 885", rating: 4.5, google_place_id: "mock_elkorsan_001", category: "restaurant" },
    { name: "Le Saveur de Poisson", address: "2 Escalier Waller, Tanger", area: "Médina", lat: 35.7856, lng: -5.8122, phone: "+212 539 336 326", rating: 4.7, google_place_id: "mock_saveur_002", category: "restaurant" },
    { name: "Dar Naji", address: "Rue de la Plage, Tanger", area: "Malabata", lat: 35.7914, lng: -5.7856, phone: "+212 539 337 337", rating: 4.6, google_place_id: "mock_darnaji_005", category: "restaurant" },
    { name: "Chez Abdou", address: "10 Rue Siaghine, Tanger Médina", area: "Médina", lat: 35.7844, lng: -5.8101, phone: "+212 539 334 567", rating: 4.2, google_place_id: "mock_abdou_006", category: "restaurant" },
    { name: "Restaurant Ahlen", address: "8 Rue Mokhtar Ahardan, Tanger", area: "Mesnana", lat: 35.7683, lng: -5.8172, phone: "+212 539 940 000", rating: 4.0, google_place_id: "mock_ahlen_008", category: "restaurant" },
    { name: "Nord Pinus Tanger", address: "11 Rue du Riad Sultan, Tanger", area: "Kasbah", lat: 35.7880, lng: -5.8145, phone: "+212 539 333 140", rating: 4.5, google_place_id: "mock_nordpinus_011", category: "restaurant" },
    { name: "Restaurant Al Maimouni", address: "Boulevard Pasteur, Tanger", area: "Centre Ville", lat: 35.7761, lng: -5.8035, phone: "+212 539 938 100", rating: 4.3, google_place_id: "mock_maimouni_013", category: "restaurant" },
    { name: "Restaurant Hammadi", address: "2 Rue de la Kasbah, Tanger", area: "Kasbah", lat: 35.7870, lng: -5.8130, phone: "+212 539 934 514", rating: 4.1, google_place_id: "mock_hammadi_014", category: "restaurant" },
  ],
  cafe: [
    { name: "Café Hafa", address: "Avenue Hadi Mandri, Tanger", area: "Marshan", lat: 35.7892, lng: -5.8231, phone: "+212 539 334 024", rating: 4.3, google_place_id: "mock_hafa_003", category: "cafe" },
    { name: "La Fabrique", address: "7 Rue d'Angleterre, Tanger", area: "Centre Ville", lat: 35.7769, lng: -5.8054, phone: "+212 661 234 567", rating: 4.4, google_place_id: "mock_fabrique_007", category: "cafe" },
    { name: "Salon Bleu", address: "Petit Socco, Tanger Médina", area: "Médina", lat: 35.7851, lng: -5.8113, phone: "+212 539 335 500", rating: 4.3, google_place_id: "mock_salonbleu_010", category: "cafe" },
    { name: "Café de Paris", address: "Place de France, Tanger", area: "Centre Ville", lat: 35.7765, lng: -5.8040, phone: "+212 539 938 444", rating: 4.0, google_place_id: "mock_cafeparis_015", category: "cafe" },
    { name: "Gran Café Central", address: "Petit Socco, Médina, Tanger", area: "Médina", lat: 35.7852, lng: -5.8110, phone: "+212 539 336 100", rating: 4.1, google_place_id: "mock_grancentral_016", category: "cafe" },
  ],
  pharmacy: [
    { name: "Pharmacie Centrale", address: "12 Rue de la Liberté, Tanger", area: "Centre Ville", lat: 35.7760, lng: -5.8040, phone: "+212 539 932 100", rating: 4.4, google_place_id: "mock_pharma_cent_020", category: "pharmacy" },
    { name: "Pharmacie Ibn Sina", address: "Avenue Mohammed V, Tanger", area: "Centre Ville", lat: 35.7745, lng: -5.8020, phone: "+212 539 941 500", rating: 4.2, google_place_id: "mock_pharma_ibnsina_021", category: "pharmacy" },
    { name: "Pharmacie Al Amal", address: "Rue de Fès, Tanger", area: "Mesnana", lat: 35.7690, lng: -5.8150, phone: "+212 539 940 300", rating: 4.0, google_place_id: "mock_pharma_amal_022", category: "pharmacy" },
    { name: "Pharmacie Pasteur", address: "Boulevard Pasteur, Tanger", area: "Centre Ville", lat: 35.7758, lng: -5.8032, phone: "+212 539 933 200", rating: 4.5, google_place_id: "mock_pharma_pasteur_023", category: "pharmacy" },
    { name: "Pharmacie de la Plage", address: "Avenue des FAR, Tanger", area: "Malabata", lat: 35.7900, lng: -5.7870, phone: "+212 539 337 800", rating: 3.9, google_place_id: "mock_pharma_plage_024", category: "pharmacy" },
    { name: "Pharmacie Rif", address: "Rue du Rif, Tanger", area: "Médina", lat: 35.7840, lng: -5.8100, phone: "+212 539 335 600", rating: 4.1, google_place_id: "mock_pharma_rif_025", category: "pharmacy" },
    { name: "Pharmacie Tanja Balia", address: "Place 9 Avril, Tanger", area: "Centre Ville", lat: 35.7780, lng: -5.8050, phone: "+212 539 938 900", rating: 4.3, google_place_id: "mock_pharma_tanja_026", category: "pharmacy" },
    { name: "Pharmacie Al Hayat", address: "Route de Rabat, Tanger", area: "Boukhalef", lat: 35.7420, lng: -5.8560, phone: "+212 539 340 100", rating: 4.0, google_place_id: "mock_pharma_hayat_027", category: "pharmacy" },
  ],
  grocery_or_supermarket: [
    { name: "Marjane Tanger", address: "Route de Rabat, Tanger", area: "Boukhalef", lat: 35.7415, lng: -5.8570, phone: "+212 539 340 500", rating: 4.0, google_place_id: "mock_marjane_030", category: "grocery_or_supermarket" },
    { name: "Carrefour Market", address: "Boulevard Mohammed V, Tanger", area: "Centre Ville", lat: 35.7750, lng: -5.8025, phone: "+212 539 941 800", rating: 3.8, google_place_id: "mock_carrefour_031", category: "grocery_or_supermarket" },
    { name: "Acima Centre Ville", address: "Rue de Mexique, Tanger", area: "Centre Ville", lat: 35.7755, lng: -5.8030, phone: "+212 539 932 400", rating: 3.9, google_place_id: "mock_acima_032", category: "grocery_or_supermarket" },
    { name: "BIM Tanger", address: "Avenue Moulay Ismail, Tanger", area: "Mesnana", lat: 35.7680, lng: -5.8160, phone: "+212 539 940 700", rating: 3.7, google_place_id: "mock_bim_033", category: "grocery_or_supermarket" },
    { name: "Atacadao Tanger", address: "Zone Industrielle, Tanger", area: "Boukhalef", lat: 35.7400, lng: -5.8580, phone: "+212 539 340 900", rating: 4.1, google_place_id: "mock_atacadao_034", category: "grocery_or_supermarket" },
    { name: "Aswak Assalam", address: "Route de Tétouan, Tanger", area: "Souani", lat: 35.7830, lng: -5.7950, phone: "+212 539 325 000", rating: 4.2, google_place_id: "mock_aswak_035", category: "grocery_or_supermarket" },
  ],
  bakery: [
    { name: "Boulangerie Paul", address: "Boulevard Pasteur, Tanger", area: "Centre Ville", lat: 35.7762, lng: -5.8038, phone: "+212 539 933 500", rating: 4.4, google_place_id: "mock_boul_paul_040", category: "bakery" },
    { name: "Pâtisserie Rahmouni", address: "Rue de la Liberté, Tanger", area: "Centre Ville", lat: 35.7758, lng: -5.8035, phone: "+212 539 932 800", rating: 4.6, google_place_id: "mock_rahmouni_041", category: "bakery" },
    { name: "Boulangerie Al Andalous", address: "Avenue des FAR, Tanger", area: "Malabata", lat: 35.7895, lng: -5.7880, phone: "+212 539 337 500", rating: 4.1, google_place_id: "mock_andalous_042", category: "bakery" },
    { name: "Pâtisserie Florence", address: "Rue du Prince Héritier, Tanger", area: "Centre Ville", lat: 35.7770, lng: -5.8045, phone: "+212 539 934 200", rating: 4.3, google_place_id: "mock_florence_043", category: "bakery" },
    { name: "Boulangerie Tanja", address: "Rue de Fès, Tanger", area: "Mesnana", lat: 35.7685, lng: -5.8155, phone: "+212 539 940 400", rating: 4.0, google_place_id: "mock_boul_tanja_044", category: "bakery" },
  ],
  clothing_store: [
    { name: "Zara Tanger", address: "Tanger City Mall, Tanger", area: "Boukhalef", lat: 35.7410, lng: -5.8565, phone: "+212 539 340 200", rating: 4.2, google_place_id: "mock_zara_050", category: "clothing_store" },
    { name: "H&M Tanger", address: "Tanger City Mall, Tanger", area: "Boukhalef", lat: 35.7411, lng: -5.8566, phone: "+212 539 340 300", rating: 4.0, google_place_id: "mock_hm_051", category: "clothing_store" },
    { name: "Marwa Tanger", address: "Boulevard Mohammed V, Tanger", area: "Centre Ville", lat: 35.7748, lng: -5.8022, phone: "+212 539 941 600", rating: 4.1, google_place_id: "mock_marwa_052", category: "clothing_store" },
    { name: "LC Waikiki Tanger", address: "Tanger City Mall, Tanger", area: "Boukhalef", lat: 35.7412, lng: -5.8567, phone: "+212 539 340 400", rating: 3.9, google_place_id: "mock_lcwaikiki_053", category: "clothing_store" },
    { name: "Defacto Tanger", address: "Avenue Moulay Ismail, Tanger", area: "Centre Ville", lat: 35.7755, lng: -5.8030, phone: "+212 539 932 500", rating: 3.8, google_place_id: "mock_defacto_054", category: "clothing_store" },
  ],
  electronics_store: [
    { name: "Electroplanet Tanger", address: "Tanger City Mall, Tanger", area: "Boukhalef", lat: 35.7413, lng: -5.8568, phone: "+212 539 340 600", rating: 4.0, google_place_id: "mock_electro_060", category: "electronics_store" },
    { name: "Cosmos Electro", address: "Boulevard Mohammed V, Tanger", area: "Centre Ville", lat: 35.7746, lng: -5.8018, phone: "+212 539 941 700", rating: 3.9, google_place_id: "mock_cosmos_061", category: "electronics_store" },
    { name: "Virgin Megastore", address: "Place de France, Tanger", area: "Centre Ville", lat: 35.7764, lng: -5.8042, phone: "+212 539 938 500", rating: 4.2, google_place_id: "mock_virgin_062", category: "electronics_store" },
    { name: "Biougnach Informatique", address: "Rue Ibn Batouta, Tanger", area: "Centre Ville", lat: 35.7752, lng: -5.8028, phone: "+212 539 941 300", rating: 4.1, google_place_id: "mock_biougnach_063", category: "electronics_store" },
  ],
  florist: [
    { name: "Fleurs de Tanger", address: "Boulevard Pasteur, Tanger", area: "Centre Ville", lat: 35.7760, lng: -5.8036, phone: "+212 539 933 600", rating: 4.5, google_place_id: "mock_fleurs_070", category: "florist" },
    { name: "Rose Garden", address: "Avenue des FAR, Tanger", area: "Malabata", lat: 35.7898, lng: -5.7875, phone: "+212 539 337 600", rating: 4.3, google_place_id: "mock_rose_071", category: "florist" },
    { name: "Jardin Fleuri", address: "Rue de Mexique, Tanger", area: "Centre Ville", lat: 35.7756, lng: -5.8032, phone: "+212 539 932 600", rating: 4.0, google_place_id: "mock_jardin_072", category: "florist" },
  ],
  courier: [
    { name: "Glovo Tanger", address: "Centre Ville, Tanger", area: "Centre Ville", lat: 35.7750, lng: -5.8030, phone: "+212 600 100 200", rating: 3.8, google_place_id: "mock_glovo_080", category: "courier" },
    { name: "Yassir Express", address: "Boulevard Mohammed V, Tanger", area: "Centre Ville", lat: 35.7745, lng: -5.8020, phone: "+212 600 300 400", rating: 3.9, google_place_id: "mock_yassir_081", category: "courier" },
    { name: "Tanger Express Livraison", address: "Rue de Fès, Tanger", area: "Mesnana", lat: 35.7688, lng: -5.8158, phone: "+212 661 500 600", rating: 4.0, google_place_id: "mock_tangexpress_082", category: "courier" },
    { name: "Speed Delivery Tanger", address: "Avenue Moulay Ismail, Tanger", area: "Centre Ville", lat: 35.7753, lng: -5.8028, phone: "+212 661 700 800", rating: 3.7, google_place_id: "mock_speed_083", category: "courier" },
  ],
  moving_company: [
    { name: "Déménagement Tanger Pro", address: "Zone Industrielle, Tanger", area: "Boukhalef", lat: 35.7405, lng: -5.8575, phone: "+212 539 340 700", rating: 4.1, google_place_id: "mock_demenag_090", category: "moving_company" },
    { name: "Transport El Amana", address: "Route de Rabat, Tanger", area: "Boukhalef", lat: 35.7418, lng: -5.8562, phone: "+212 661 900 100", rating: 3.9, google_place_id: "mock_elamana_091", category: "moving_company" },
    { name: "Tanger Moving", address: "Avenue des FAR, Tanger", area: "Malabata", lat: 35.7896, lng: -5.7878, phone: "+212 661 200 300", rating: 4.0, google_place_id: "mock_tangmov_092", category: "moving_company" },
  ],
  store: [
    { name: "Bricoma Tanger", address: "Route de Rabat, Tanger", area: "Boukhalef", lat: 35.7408, lng: -5.8572, phone: "+212 539 340 800", rating: 4.0, google_place_id: "mock_bricoma_100", category: "store" },
    { name: "Mr Bricolage", address: "Boulevard Mohammed V, Tanger", area: "Centre Ville", lat: 35.7747, lng: -5.8020, phone: "+212 539 941 900", rating: 3.8, google_place_id: "mock_mrbricol_101", category: "store" },
    { name: "Kitea Tanger", address: "Tanger City Mall, Tanger", area: "Boukhalef", lat: 35.7414, lng: -5.8569, phone: "+212 539 341 000", rating: 4.1, google_place_id: "mock_kitea_102", category: "store" },
    { name: "Decathlon Tanger", address: "Route de Rabat, Tanger", area: "Boukhalef", lat: 35.7406, lng: -5.8574, phone: "+212 539 341 100", rating: 4.3, google_place_id: "mock_decathlon_103", category: "store" },
  ],
};

// Flatten all mock data for "all" queries
const ALL_MOCK = Object.values(MOCK_DATA).flat();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await enforceRateLimit(req, "google-places-search", 20, 60);
    const { city, type, useGoogle, area } = await parseJson(req, requestSchema);
    const googleMapsApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    const safeCity = sanitizePlainText(city || "Tanger", 80);
    const safeType = sanitizePlainText(type || "restaurant", 40);
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
        const placesToDetail = data.results.slice(0, 15);
        const detailedRestaurants = await Promise.all(
          placesToDetail.map(async (place: any) => {
            const addressParts = (place.formatted_address || "").split(",");
            const areaLabel = addressParts.length > 1 ? addressParts[addressParts.length - 2]?.trim() : "";

            let phone = "";
            let website = "";
            if (place.place_id) {
              try {
                const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_phone_number,international_phone_number,website,url,editorial_summary&key=${googleMapsApiKey}&language=fr`;
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

            let email = "";
            if (website) {
              try {
                const siteRes = await fetch(website, {
                  headers: { "User-Agent": "HN-Driver-Bot/1.0" },
                  redirect: "follow",
                });
                if (siteRes.ok) {
                  const html = await siteRes.text();
                  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
                  const emails = html.match(emailRegex) || [];
                  const filtered = emails.filter((e: string) =>
                    !e.includes("example.com") &&
                    !e.includes("sentry") &&
                    !e.includes("webpack") &&
                    !e.includes("wixpress") &&
                    !e.endsWith(".png") &&
                    !e.endsWith(".jpg")
                  );
                  if (filtered.length > 0) email = filtered[0];
                }
              } catch (e) {
                // Website scraping failed, skip
              }
            }

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
              email: sanitizePlainText(email, 120),
              rating: Number(place.rating || 0),
              image_url: imageUrl,
              is_open: place.opening_hours?.open_now ?? true,
              google_place_id: sanitizePlainText(place.place_id || "", 160),
              category: safeType,
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

    // Fallback to mock data
    let filtered: any[];
    if (!safeType || safeType === "all" || safeType === "restaurants") {
      filtered = ALL_MOCK;
    } else {
      filtered = MOCK_DATA[safeType] || ALL_MOCK.filter(item =>
        item.category.toLowerCase().includes(safeType.toLowerCase())
      );
    }

    if (safeArea) {
      filtered = filtered.filter((item) => item.area.toLowerCase().includes(safeArea.toLowerCase()));
    }

    // Add is_open and image_url defaults for mock data
    filtered = filtered.map(item => ({
      ...item,
      is_open: item.is_open ?? true,
      image_url: item.image_url || "",
      email: item.email || "",
    }));

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
