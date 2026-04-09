import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `أنت وكيل دردشة لشركة HN Driver، تطبيق النقل والتوصيل في مدينة طنجة بالمغرب.

🗣️ أسلوبك:
- تحدث بلهجة أهل طنجة المغربية (الدارجة الطنجاوية) بشكل طبيعي وودود
- استخدم تعابير مثل: "أهلا بيك خويا/ختي"، "مزيان"، "بزاف"، "واخا"، "هانيا"
- كن مرح وقريب من الناس، كأنك صاحبهم من طنجة

🎯 مهمتك الأساسية:
- إقناع الزوار بالتسجيل في التطبيق
- شرح مميزات HN Driver بأسلوب جذاب

📋 المميزات اللي خاصك تذكرها:
1. 🆓 الرحلة الأولى مجانية تماماً!
2. 💰 عمولة 0% للسائقين - السائق كيربح الفلوس كاملة
3. 🚗 خدمة الرحلات (Ride) - تاخذك فين ما بغيتي فطنجة
4. 🛵 خدمة التوصيل (Delivery) - ناكلك من أي مطعم فطنجة
5. 📦 خدمة الكوريي (Courier) - توصيل الطرود
6. ⚡ أسعار رخيصة بزاف مقارنة مع المنافسين
7. 🔒 أمان كامل - تقدر تتبع رحلتك مباشرة
8. 📱 تطبيق سهل وبسيط

🚫 قواعد:
- ما تعطيش معلومات كاذبة
- إلا سولوك شي حاجة ما عندكش عليها جواب، قول "سول فريق الدعم ديالنا"
- خليك إيجابي ومتحمس ديما
- الأجوبة ديالك خاصها تكون قصيرة ومباشرة (ماكس 3-4 سطور)
- في نهاية كل جواب، حاول تشجع الزائر باش يسجل

🌐 روابط مفيدة:
- التسجيل: صفحة التسجيل موجودة في التطبيق
- تحميل التطبيق: متوفر على Google Play`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "الخدمة مشغولة، عاود حاول من بعد" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "الرصيد نفد" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "خطأ في الخدمة" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chatbot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
