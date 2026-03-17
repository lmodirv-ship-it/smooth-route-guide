import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let { url, city } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize URL: add protocol if missing
    url = url.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: `عنوان URL غير صالح: "${url}". يرجى إدخال رابط موقع صحيح مثل https://example.com` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Fetch the webpage content
    console.log('Fetching URL:', url);
    let pageContent = '';
    try {
      const pageRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7,ar;q=0.6',
        },
      });
      pageContent = await pageRes.text();
      // Truncate to ~30k chars to fit in AI context
      if (pageContent.length > 30000) {
        pageContent = pageContent.substring(0, 30000);
      }
    } catch (fetchErr) {
      console.error('Fetch error:', fetchErr);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch URL: ${fetchErr.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Use AI to extract structured restaurant data
    console.log('Extracting data with AI...');
    const extractionPrompt = `You are a data extraction expert. Analyze this webpage HTML content from a restaurant/food delivery website and extract ALL restaurants, their categories, and menu items.

The city is: ${city || 'Tanger'}

Return a JSON object with this exact structure:
{
  "restaurants": [
    {
      "name": "Restaurant Name",
      "description": "Short description",
      "category": "restaurant",
      "address": "Address in ${city || 'Tanger'}",
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

    const aiResponse = await fetch('https://ai-gateway.lovable.dev/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: extractionPrompt }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI error:', errText);
      return new Response(
        JSON.stringify({ success: false, error: `AI extraction failed: ${aiResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '{}';
    
    let extracted;
    try {
      extracted = JSON.parse(content);
    } catch (parseErr) {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to parse AI response' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`Extracted ${extracted.restaurants?.length || 0} restaurants`);

    return new Response(
      JSON.stringify({ success: true, data: extracted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
