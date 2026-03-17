import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Gather real-time context
    const today = new Date().toISOString().slice(0, 10);

    const [pendingReqs, activeDrivers, ongoingTrips, earnings] = await Promise.all([
      supabase.from("ride_requests").select("id, pickup, destination, price, created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(5),
      supabase.from("drivers").select("id, user_id, rating, status, current_lat, current_lng").eq("status", "active"),
      supabase.from("trips").select("id, start_location, end_location, fare, status, driver_id").eq("status", "in_progress"),
      supabase.from("earnings").select("amount").gte("date", today),
    ]);

    const totalIncome = (earnings.data || []).reduce((s: number, e: any) => s + Number(e.amount), 0);

    const context = `
بيانات النظام الحالية:
- طلبات معلقة: ${pendingReqs.data?.length || 0}
- سائقين نشطين: ${activeDrivers.data?.length || 0}
- رحلات جارية: ${ongoingTrips.data?.length || 0}
- أرباح اليوم: ${totalIncome} ر.س
${pendingReqs.data?.length ? `\nالطلبات المعلقة:\n${pendingReqs.data.map((r: any) => `- من "${r.pickup}" إلى "${r.destination}" (${r.price || 0} ر.س)`).join("\n")}` : ""}
${activeDrivers.data?.length ? `\nالسائقين النشطين: ${activeDrivers.data.length} سائق (متوسط التقييم: ${(activeDrivers.data.reduce((s: number, d: any) => s + Number(d.rating || 0), 0) / activeDrivers.data.length).toFixed(1)})` : ""}
`;

    const SYSTEM_PROMPT = `أنت مساعد ذكي للمسؤول في منصة HN Driver لإدارة خدمات النقل.

مهامك:
1. تحليل البيانات وتقديم توصيات ذكية
2. اقتراح أفضل سائق لكل طلب بناءً على القرب والتقييم
3. اكتشاف المشاكل وتقديم تنبيهات
4. تقديم إحصائيات وتحليلات

القواعد:
- أجب دائماً بالعربية
- كن مختصراً ومباشراً
- استخدم الأرقام والبيانات الحقيقية
- قدم اقتراحات عملية

${context}`;

    const { messages } = await req.json();

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
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "تم تجاوز الحد المسموح، حاول لاحقاً" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "رصيد غير كافٍ" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "خطأ في خدمة الذكاء الاصطناعي" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("admin-ai-agent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير معروف" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
