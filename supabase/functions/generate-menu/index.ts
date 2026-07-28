import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, enforceRateLimit, handleError, parseJson, requireRole, sanitizePlainText, z } from "../_shared/security.ts";
import { callAI } from "../_shared/aiProvider.ts";

const requestSchema = z.object({
  restaurantName: z.string().trim().min(1).max(120),
  restaurantCategory: z.string().trim().max(80).optional(),
  restaurantAddress: z.string().trim().max(200).optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    await requireRole(req, ["admin", "agent", "moderator"]);
    await enforceRateLimit(req, "generate-menu", 10, 60);
    const { restaurantName, restaurantCategory, restaurantAddress } = await parseJson(req, requestSchema);
    
    const prompt = `Tu es un expert en restauration marocaine, spécialisé dans les restaurants de Tanger.

Génère un menu RÉALISTE pour le restaurant "${sanitizePlainText(restaurantName, 120)}" (catégorie: ${sanitizePlainText(restaurantCategory || "restaurant", 80)}, adresse: ${sanitizePlainText(restaurantAddress || "Tanger, Maroc", 200)}).

IMPORTANT:
- Les prix doivent être en DH (Dirhams marocains) et réalistes pour Tanger
- Les noms doivent être en arabe ET en français
- Génère 3-5 catégories avec 3-6 produits chacune
- Adapte le menu au type de restaurant (fast-food, café, restaurant traditionnel, pizzeria, etc.)

Réponds STRICTEMENT en JSON valide, sans texte ni markdown, selon ce schéma:
{
  "categories": [
    {
      "name_ar": "string",
      "name_fr": "string",
      "items": [
        { "name_ar": "string", "name_fr": "string", "description_ar": "string", "description_fr": "string", "price": number }
      ]
    }
  ]
}`;

    let menu: any;
    try {
      const result = await callAI({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        jsonMode: true,
        maxTokens: 4096,
      });
      const cleaned = result.content.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
      menu = JSON.parse(cleaned);
    } catch (err: any) {
      console.error("AI error:", err);
      if (String(err?.message || "").includes("429")) {
        return new Response(JSON.stringify({ error: "تم تجاوز الحد المسموح، حاول لاحقاً" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (String(err?.message || "").includes("402")) {
        return new Response(JSON.stringify({ error: "يرجى شحن الرصيد" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI provider error");
    }

    return new Response(JSON.stringify({ success: true, menu }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-menu error:", e);
    return handleError(e);
  }
});