import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { corsHeaders, enforceRateLimit, handleError, normalizeUrl, parseJson, sanitizePlainText, z } from "../_shared/security.ts";

const requestSchema = z.object({
  url: z.string().trim().min(3).max(2048),
  city: z.string().trim().max(80).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    await enforceRateLimit(req, "scrape-restaurant", 8, 60);
    const { url, city } = await parseJson(req, requestSchema);
    const safeUrl = normalizeUrl(url);
    const safeCity = sanitizePlainText(city || "Tanger", 80);

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "AI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let pageContent = "";
    try {
      const pageRes = await fetch(safeUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7,ar;q=0.6",
        },
      });

      if (!pageRes.ok) {
        return new Response(
          JSON.stringify({ success: false, error: `Failed to fetch URL: ${pageRes.status}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      pageContent = await pageRes.text();
      if (pageContent.length > 30000) {
        pageContent = pageContent.substring(0, 30000);
      }
    } catch (fetchErr) {
      console.error("scrape-restaurant fetch error:", fetchErr);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const extractionPrompt = `You are a data extraction expert. Analyze this webpage HTML content from a restaurant/food delivery website and extract ALL restaurants, their categories, and menu items.

The city is: ${safeCity}

Return a JSON object with this exact structure:
{
  "restaurants": [
    {
      "name": "Restaurant Name",
      "description": "Short description",
      "category": "restaurant",
      "address": "Address in ${safeCity}",
      "phone": "phone number or empty string",
      "rating": 4.5,
      "delivery_fee": 10,
      "delivery_time_min": 20,
      "delivery_time_max": 40,
      "image_url": "image URL if found",
      "is_open": true,
      "categories": [
        {
          "name_ar": "Category name in Arabic",
          "name_fr": "Category name in French",
          "items": [
            {
              "name_ar": "Item name in Arabic",
              "name_fr": "Item name in French/original",
              "description_ar": "Description in Arabic",
              "description_fr": "Description in French/original",
              "price": 35,
              "image_url": "image URL if found",
              "is_available": true
            }
          ]
        }
      ]
    }
  ]
}

IMPORTANT:
- Extract ALL restaurants you can find
- Extract ALL menu categories and items
- Prices should be in DH (Moroccan Dirham)
- If names are in French, also provide Arabic transliteration
- If no categories are found, group items under a "عام" (General) category
- Return ONLY valid JSON, no markdown or extra text

Here is the webpage content:
${pageContent}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: extractionPrompt }],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("scrape-restaurant AI error:", errText);
      return new Response(
        JSON.stringify({ success: false, error: `AI extraction failed: ${aiResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";

    let extracted;
    try {
      extracted = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        return new Response(
          JSON.stringify({ success: false, error: "Failed to parse AI response" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: extracted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("scrape-restaurant error:", error);
    return handleError(error);
  }
});