import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mock data for Tanger restaurants when API key is not available or for testing
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city, type, useGoogle } = await req.json();
    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

    // Try Google Places API if key exists and useGoogle is true
    if (useGoogle && GOOGLE_MAPS_API_KEY) {
      const query = `${type || 'restaurants'} in ${city || 'Tanger'}, Morocco`;
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&language=fr`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results?.length > 0) {
        const restaurants = data.results.map((place: any) => {
          // Extract area from address components
          const addressParts = (place.formatted_address || '').split(',');
          const area = addressParts.length > 1 ? addressParts[addressParts.length - 2]?.trim() : '';

          // Build photo URL
          let image_url = '';
          if (place.photos?.[0]?.photo_reference) {
            image_url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${GOOGLE_MAPS_API_KEY}`;
          }

          return {
            name: place.name,
            address: place.formatted_address || '',
            area,
            lat: place.geometry?.location?.lat || 0,
            lng: place.geometry?.location?.lng || 0,
            phone: '',
            rating: place.rating || 0,
            image_url,
            is_open: place.opening_hours?.open_now ?? true,
            google_place_id: place.place_id || '',
            category: 'restaurant',
          };
        });

        return new Response(JSON.stringify({ 
          restaurants, 
          source: 'google',
          total: restaurants.length 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fallback to mock data - return all for "restaurants" or "all"
    const filtered = MOCK_RESTAURANTS.filter(r => {
      if (type && type !== 'all' && type !== 'restaurants') {
        return r.category.toLowerCase().includes(type.toLowerCase());
      }
      return true;
    });

    return new Response(JSON.stringify({ 
      restaurants: filtered, 
      source: 'mock',
      total: filtered.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
