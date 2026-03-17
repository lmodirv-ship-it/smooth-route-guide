import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { restaurantName, restaurantCategory, restaurantAddress } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `Tu es un expert en restauration marocaine, spécialisé dans les restaurants de Tanger.

Génère un menu RÉALISTE pour le restaurant "${restaurantName}" (catégorie: ${restaurantCategory || "restaurant"}, adresse: ${restaurantAddress || "Tanger, Maroc"}).

IMPORTANT:
- Les prix doivent être en DH (Dirhams marocains) et réalistes pour Tanger
- Les noms doivent être en arabe ET en français
- Génère 3-5 catégories avec 3-6 produits chacune
- Adapte le menu au type de restaurant (fast-food, café, restaurant traditionnel, pizzeria, etc.)

Utilise le tool generate_menu pour retourner les données.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_menu",
              description: "Generate a complete restaurant menu with categories and items",
              parameters: {
                type: "object",
                properties: {
                  categories: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name_ar: { type: "string", description: "Category name in Arabic" },
                        name_fr: { type: "string", description: "Category name in French" },
                        items: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name_ar: { type: "string", description: "Item name in Arabic" },
                              name_fr: { type: "string", description: "Item name in French" },
                              description_ar: { type: "string", description: "Short description in Arabic" },
                              description_fr: { type: "string", description: "Short description in French" },
                              price: { type: "number", description: "Price in DH (Moroccan Dirhams)" },
                            },
                            required: ["name_ar", "name_fr", "price"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["name_ar", "name_fr", "items"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["categories"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_menu" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز الحد المسموح، حاول لاحقاً" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى شحن الرصيد في Lovable AI" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("No structured response from AI");
    }

    const menu = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, menu }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-menu error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
