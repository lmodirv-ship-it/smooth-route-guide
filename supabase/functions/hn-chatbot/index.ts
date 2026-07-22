import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, enforceRateLimit, HttpError, handleError } from "../_shared/security.ts";
import { callAIStream } from "../_shared/aiProvider.ts";

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
    // Rate limit: 15 requests per minute per IP/session to prevent AI credit drain
    await enforceRateLimit(req, "hn-chatbot", 15, 60);

    const { messages } = await req.json();

    // Validate messages payload to prevent abuse
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 30) {
      throw new HttpError(400, "invalid_messages_payload");
    }
    for (const m of messages) {
      if (!m || typeof m.content !== "string" || m.content.length > 4000) {
        throw new HttpError(400, "invalid_message_content");
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    try {
      const streamResp = await callAIStream({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.7,
      });
      return new Response(streamResp.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    } catch (err: any) {
      const status = err?.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "الخدمة مشغولة، عاود حاول من بعد" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "الرصيد نفد" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI provider error:", err);
      return new Response(JSON.stringify({ error: "خطأ في الخدمة" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("chatbot error:", e);
    return handleError(e);
  }
});
