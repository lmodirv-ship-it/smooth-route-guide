import { corsHeaders, jsonResponse, handleError, HttpError, sanitizePlainText } from "../_shared/security.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed canned messages — must match client-side lists exactly
const ALLOWED_MESSAGES = new Set([
  // Driver messages
  "أنا في الطريق إليك",
  "سأصل خلال دقائق قليلة",
  "هل يمكنك تأكيد موقع الاستلام؟",
  "وصلت إلى موقعك",
  "أنا أمام الباب",
  "أنا بالانتظار عند نقطة الالتقاء",
  "سنصل قريبًا إن شاء الله",
  "هناك ازدحام في الطريق",
  "عذرًا، سأتأخر قليلاً",
  "أعتذر عن التأخير، أنا في الطريق",
  "تم استلام الطلب وأنا في الطريق",
  "وصلت لمكان التسليم",
  "شكرًا لك",
  "تم بنجاح",
  // Customer messages
  "أنا في الانتظار",
  "أين أنت الآن؟",
  "متى ستصل تقريبًا؟",
  "أنا خارج المبنى",
  "سأنزل الآن",
  "أنا عند المدخل الرئيسي",
  "هل يمكنك التوقف هنا من فضلك؟",
  "غيّرت وجهتي، سأخبرك",
  "هل تأخرت؟",
  "أنا بالانتظار لاستلام الطلب",
  "حسنًا",
  "نعم",
  "لا",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new HttpError(401, "unauthorized");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new HttpError(401, "unauthorized");

    const body = await req.json();
    const message = sanitizePlainText(body?.message, 200);
    const rideId = sanitizePlainText(body?.ride_id, 100);

    if (!message || !rideId) {
      throw new HttpError(400, "message_and_ride_id_required");
    }

    // Server-side validation: only allow known canned messages
    if (!ALLOWED_MESSAGES.has(message)) {
      throw new HttpError(403, "only_preset_messages_allowed");
    }

    // Insert the message
    const { error: insertError } = await supabase
      .from("ride_messages")
      .insert({
        ride_id: rideId,
        sender_id: user.id,
        message: message,
      });

    if (insertError) {
      throw new HttpError(500, insertError.message);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    return handleError(error);
  }
});
