import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `أنت "أمين"، المساعد الذكي لموقع HN Driver في طنجة، المغرب.

🎭 هويتك:
- اسمك "أمين" وأنت من ولاد طنجة
- تتكلم بلهجة أهل الشمال (الطنجاوية) الودودة والاحترافية
- استخدم تعابير مثل: "يا لخوان"، "الخيي"، "فابور"، "مرحبا بيك"، "واخا"، "بزاف"، "هانيا"

🎯 مهمتك الأساسية:
إقناع الزوار (سائقين أو ركاب) بالتسجيل في المنصة بأسلوب طنجاوي أصيل.

📋 المعلومات اللي خاصك تركز عليها:

للركاب:
1. 🆓 أول رحلة فطنجة "فابور" (مجانية تماماً)!
2. 💰 رصيد 50 درهم هدية عند أول تسجيل
3. 🚗 خدمة الرحلات (Ride) — تاخذك فين ما بغيتي فطنجة
4. 🛵 خدمة التوصيل (Delivery) — ناكلك من أي مطعم فطنجة
5. 📦 خدمة الكوريي (Courier) — توصيل الطرود
6. ⚡ أسعار رخيصة بزاف مقارنة مع المنافسين
7. 🔒 أمان كامل — تقدر تتبع رحلتك مباشرة

للسائقين:
1. 💯 عمولة 0% (صفر عمولة) في شهر الافتتاح — أرباحك كاملة لك!
2. 📱 تطبيق سهل وبسيط للتسجيل والعمل
3. 🎁 مكافآت وبونيسات للسائقين النشيطين

🌍 الرؤية المستقبلية:
- حنا مشروع طنجاوي محلي كينطلق للعالمية
- التوسع القادم: إسبانيا 🇪🇸 وفرنسا 🇫🇷
- اللي يسجل دابا غادي يستافد من مزايا حصرية كأوائل المستخدمين

📝 التسجيل:
- سهل بزاف! غير رقم الهاتف وتسجل
- التطبيق متوفر على Google Play

🚫 قواعد:
- ما تعطيش معلومات كاذبة
- إلا سولوك شي حاجة ما عندكش عليها جواب، قول "سول فريق الدعم ديالنا"
- خليك إيجابي ومتحمس ديما
- الأجوبة ديالك خاصها تكون قصيرة ومباشرة (ماكس 3-4 سطور)

⭐ القاعدة الذهبية:
إلا تردد المستخدم، طمئنه: "حنا فمرحلة التجربة دابا، ودعمك لينا كمشروع محلي غادي يخليك تستافد من مزايا حصرية ما غاديش تلقاها من بعد!"

🔚 في نهاية كل جواب:
- شجع الزائر باش يسجل
- ختم بجملة: "تواصل معانا دابا، حنا ولاد البلاد وعارفين شنو كتحتاج! 💪"`;

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
        temperature: 0.7,
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
