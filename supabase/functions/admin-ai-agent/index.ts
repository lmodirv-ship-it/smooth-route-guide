import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, enforceRateLimit, handleError, parseJson, z } from "../_shared/security.ts";

const requestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string().trim().min(1).max(8000),
    }),
  ).min(1).max(50),
});

// All tables the admin AI can access
const ALLOWED_TABLES = [
  "profiles", "user_roles", "drivers", "vehicles", "ride_requests", "trips",
  "delivery_orders", "order_items", "stores", "menu_categories", "menu_items",
  "earnings", "payments", "wallet", "notifications", "alerts", "complaints",
  "tickets", "call_center", "call_logs", "promotions", "documents",
  "zones", "app_settings", "import_logs", "chat_conversations", "chat_messages",
  "trip_status_history", "ride_messages",
];

// Tools the AI can call
const tools = [
  {
    type: "function",
    function: {
      name: "db_select",
      description: "Read data from any database table. Supports filtering, ordering, and limiting.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", description: "Table name", enum: ALLOWED_TABLES },
          columns: { type: "string", description: "Comma-separated columns to select, default *", default: "*" },
          filters: {
            type: "array",
            description: "Array of filter conditions",
            items: {
              type: "object",
              properties: {
                column: { type: "string" },
                operator: { type: "string", enum: ["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in", "is"] },
                value: { type: "string" },
              },
              required: ["column", "operator", "value"],
            },
          },
          order_by: { type: "string", description: "Column to order by" },
          ascending: { type: "boolean", default: false },
          limit: { type: "number", default: 20, description: "Max rows to return (max 100)" },
        },
        required: ["table"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "db_insert",
      description: "Insert one or more rows into a database table.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", enum: ALLOWED_TABLES },
          rows: {
            type: "array",
            items: { type: "object" },
            description: "Array of row objects to insert",
          },
        },
        required: ["table", "rows"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "db_update",
      description: "Update rows in a database table matching filters.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", enum: ALLOWED_TABLES },
          updates: { type: "object", description: "Key-value pairs to update" },
          filters: {
            type: "array",
            items: {
              type: "object",
              properties: {
                column: { type: "string" },
                operator: { type: "string", enum: ["eq", "neq", "gt", "gte", "lt", "lte"] },
                value: { type: "string" },
              },
              required: ["column", "operator", "value"],
            },
            description: "Filters to match rows (required for safety)",
          },
        },
        required: ["table", "updates", "filters"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "db_delete",
      description: "Delete rows from a database table matching filters.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", enum: ALLOWED_TABLES },
          filters: {
            type: "array",
            items: {
              type: "object",
              properties: {
                column: { type: "string" },
                operator: { type: "string", enum: ["eq", "neq"] },
                value: { type: "string" },
              },
              required: ["column", "operator", "value"],
            },
          },
        },
        required: ["table", "filters"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "db_count",
      description: "Count rows in a table, optionally with filters.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", enum: ALLOWED_TABLES },
          filters: {
            type: "array",
            items: {
              type: "object",
              properties: {
                column: { type: "string" },
                operator: { type: "string", enum: ["eq", "neq", "gt", "gte", "lt", "lte"] },
                value: { type: "string" },
              },
              required: ["column", "operator", "value"],
            },
          },
        },
        required: ["table"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "db_stats",
      description: "Get overview statistics of the entire platform: user counts, driver counts, trip counts, revenue, etc.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

function applyFilters(query: any, filters: any[]) {
  for (const f of filters) {
    switch (f.operator) {
      case "eq": query = query.eq(f.column, f.value); break;
      case "neq": query = query.neq(f.column, f.value); break;
      case "gt": query = query.gt(f.column, f.value); break;
      case "gte": query = query.gte(f.column, f.value); break;
      case "lt": query = query.lt(f.column, f.value); break;
      case "lte": query = query.lte(f.column, f.value); break;
      case "like": query = query.like(f.column, f.value); break;
      case "ilike": query = query.ilike(f.column, f.value); break;
      case "is": query = query.is(f.column, f.value === "null" ? null : f.value); break;
      case "in": query = query.in(f.column, JSON.parse(f.value)); break;
    }
  }
  return query;
}

async function executeTool(supabase: any, name: string, args: any): Promise<string> {
  try {
    switch (name) {
      case "db_select": {
        let q = supabase.from(args.table).select(args.columns || "*");
        if (args.filters?.length) q = applyFilters(q, args.filters);
        if (args.order_by) q = q.order(args.order_by, { ascending: args.ascending ?? false });
        q = q.limit(Math.min(args.limit || 20, 100));
        const { data, error } = await q;
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ count: data?.length || 0, data });
      }
      case "db_insert": {
        const { data, error } = await supabase.from(args.table).insert(args.rows).select();
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ inserted: data?.length || 0, data });
      }
      case "db_update": {
        if (!args.filters?.length) return JSON.stringify({ error: "Filters required for update" });
        let q = supabase.from(args.table).update(args.updates);
        q = applyFilters(q, args.filters);
        const { data, error } = await q.select();
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ updated: data?.length || 0, data });
      }
      case "db_delete": {
        if (!args.filters?.length) return JSON.stringify({ error: "Filters required for delete" });
        let q = supabase.from(args.table).delete();
        q = applyFilters(q, args.filters);
        const { data, error } = await q.select();
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ deleted: data?.length || 0 });
      }
      case "db_count": {
        let q = supabase.from(args.table).select("id", { count: "exact", head: true });
        if (args.filters?.length) q = applyFilters(q, args.filters);
        const { count, error } = await q;
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ table: args.table, count });
      }
      case "db_stats": {
        const today = new Date().toISOString().slice(0, 10);
        const [users, drivers, activeDrivers, trips, pendingRides, deliveryOrders, todayEarnings, complaints] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("drivers").select("id", { count: "exact", head: true }),
          supabase.from("drivers").select("id", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("trips").select("id", { count: "exact", head: true }),
          supabase.from("ride_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("delivery_orders").select("id", { count: "exact", head: true }),
          supabase.from("earnings").select("amount").gte("date", today),
          supabase.from("complaints").select("id", { count: "exact", head: true }).eq("status", "open"),
        ]);
        const totalRevenue = (todayEarnings.data || []).reduce((s: number, e: any) => s + Number(e.amount), 0);
        return JSON.stringify({
          total_users: users.count || 0,
          total_drivers: drivers.count || 0,
          active_drivers: activeDrivers.count || 0,
          total_trips: trips.count || 0,
          pending_rides: pendingRides.count || 0,
          total_delivery_orders: deliveryOrders.count || 0,
          today_revenue: totalRevenue,
          open_complaints: complaints.count || 0,
        });
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (e: any) {
    return JSON.stringify({ error: e.message || "Tool execution failed" });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    await enforceRateLimit(req, "admin-ai-agent", 30, 60);
    const { messages } = await parseJson(req, requestSchema);

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) throw new Error("Backend credentials not configured");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const systemPrompt = `أنت المساعد الذكي للمسؤول في منصة HN Driver. لديك صلاحيات كاملة للوصول لقاعدة البيانات وتعديلها.

## قدراتك:
1. **قراءة البيانات**: استعرض أي جدول، فلترة، بحث، إحصائيات
2. **إضافة بيانات**: أضف مستخدمين، سائقين، طلبات، إشعارات، إلخ
3. **تعديل بيانات**: حدّث حالة السائقين، أسعار، إعدادات، أدوار المستخدمين
4. **حذف بيانات**: احذف سجلات حسب الحاجة
5. **تحليل وإحصائيات**: قدّم تقارير وتحليلات شاملة
6. **إدارة الأدوار**: غيّر أدوار المستخدمين (admin, driver, user, agent, moderator)
7. **إدارة المتاجر**: أضف وعدّل المطاعم والمتاجر والقوائم
8. **إدارة المناطق**: أضف وعدّل مناطق التوصيل
9. **إدارة العروض**: أنشئ وعدّل أكواد الخصم
10. **إدارة الإعدادات**: غيّر إعدادات المنصة (التسعيرة، الإشعارات، إلخ)

## الجداول المتاحة:
profiles, user_roles, drivers, vehicles, ride_requests, trips, delivery_orders, order_items, stores, menu_categories, menu_items, earnings, payments, wallet, notifications, alerts, complaints, tickets, call_center, call_logs, promotions, documents, zones, app_settings, import_logs, chat_conversations, chat_messages, trip_status_history, ride_messages

## القواعد:
- أجب دائماً بالعربية
- نفّذ الأوامر فوراً عندما يطلب المدير شيئاً
- استخدم الأدوات المتاحة لتنفيذ العمليات
- قدّم نتائج واضحة ومنظمة
- اسأل للتأكيد فقط عند العمليات الخطيرة (حذف جماعي)
- عند الاستعلام، اعرض البيانات بشكل جدولي منظم
- كن مختصراً ومباشراً
- استخدم db_stats للحصول على نظرة عامة سريعة`;

    // Multi-turn tool calling loop
    let aiMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const MAX_TOOL_ROUNDS = 5;
    let finalText = "";

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: aiMessages,
          tools,
          stream: false,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "تم تجاوز الحد المسموح، حاول لاحقاً" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "رصيد غير كافٍ" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ error: "خطأ في خدمة الذكاء الاصطناعي" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const result = await response.json();
      const choice = result.choices?.[0];
      
      if (!choice) {
        return new Response(JSON.stringify({ error: "لا توجد استجابة" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const assistantMessage = choice.message;
      aiMessages.push(assistantMessage);

      // If there are tool calls, execute them
      if (assistantMessage.tool_calls?.length) {
        for (const tc of assistantMessage.tool_calls) {
          const args = typeof tc.function.arguments === "string" 
            ? JSON.parse(tc.function.arguments) 
            : tc.function.arguments;
          
          console.log(`Executing tool: ${tc.function.name}`, JSON.stringify(args));
          const toolResult = await executeTool(supabase, tc.function.name, args);
          console.log(`Tool result: ${toolResult.slice(0, 500)}`);
          
          aiMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: toolResult,
          });
        }
        // Continue loop to let AI process tool results
        continue;
      }

      // No tool calls = final response
      finalText = assistantMessage.content || "";
      break;
    }

    // Return the final text as a simple JSON response
    return new Response(JSON.stringify({ reply: finalText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("admin-ai-agent error:", error);
    return handleError(error);
  }
});
