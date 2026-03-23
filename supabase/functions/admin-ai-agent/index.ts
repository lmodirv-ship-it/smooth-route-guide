import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, enforceRateLimit, handleError, z } from "../_shared/security.ts";

const contentSchema = z.union([
  z.string().trim().min(1).max(8000),
  z.array(z.object({
    type: z.enum(["text", "image_url"]),
    text: z.string().optional(),
    image_url: z.object({
      url: z.string(),
      detail: z.enum(["auto", "low", "high"]).optional(),
    }).optional(),
  })),
]);

const requestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: contentSchema,
    }),
  ).min(1).max(50),
});

const ALLOWED_TABLES = [
  "profiles", "user_roles", "drivers", "vehicles", "ride_requests", "trips",
  "delivery_orders", "order_items", "stores", "menu_categories", "menu_items",
  "earnings", "payments", "wallet", "notifications", "alerts", "complaints",
  "tickets", "call_center", "call_logs", "promotions", "documents",
  "zones", "app_settings", "import_logs", "chat_conversations", "chat_messages",
  "trip_status_history", "ride_messages",
];

const tools = [
  {
    type: "function",
    function: {
      name: "db_select",
      description: "Read data from any database table. Supports filtering, ordering, and limiting.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", enum: ALLOWED_TABLES },
          columns: { type: "string", default: "*" },
          filters: {
            type: "array",
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
          order_by: { type: "string" },
          ascending: { type: "boolean", default: false },
          limit: { type: "number", default: 20 },
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
          rows: { type: "array", items: { type: "object" } },
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
          updates: { type: "object" },
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
      description: "Get overview statistics of the entire platform.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "platform_config",
      description: "Read or write platform configuration settings (pricing, features, UI config, branding, etc). Use action 'get' to read a setting, 'set' to save/update, 'list' to list all settings.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["get", "set", "list"] },
          key: { type: "string", description: "Setting key like 'pricing', 'branding', 'features', 'ui_config', 'notifications_config'" },
          value: { type: "object", description: "Setting value (JSON object) - only for 'set' action" },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_notify",
      description: "Send notifications to multiple users at once. Specify target: 'all' for everyone, 'drivers' for all drivers, 'users' for all clients, or provide specific user_ids.",
      parameters: {
        type: "object",
        properties: {
          target: { type: "string", enum: ["all", "drivers", "users", "specific"] },
          user_ids: { type: "array", items: { type: "string" }, description: "Specific user IDs (only when target is 'specific')" },
          message: { type: "string", description: "Notification message" },
          type: { type: "string", default: "general", description: "Notification type: general, alert, promo, system" },
        },
        required: ["target", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manage_user_role",
      description: "Add, remove, or change a user's role. Supports: admin, moderator, user, driver, agent.",
      parameters: {
        type: "object",
        properties: {
          user_id: { type: "string", description: "The user's ID" },
          action: { type: "string", enum: ["add", "remove", "change"] },
          role: { type: "string", enum: ["admin", "moderator", "user", "driver", "agent"] },
          find_by_email: { type: "string", description: "Find user by email instead of ID" },
          find_by_phone: { type: "string", description: "Find user by phone instead of ID" },
        },
        required: ["action", "role"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_image",
      description: "Analyze an uploaded image and provide detailed feedback about its content, UI issues, design suggestions, data visible, etc. Call this when the user sends an image.",
      parameters: {
        type: "object",
        properties: {
          analysis_type: { type: "string", enum: ["ui_review", "data_extraction", "general", "bug_detection", "design_feedback"], description: "Type of analysis to perform" },
          focus_areas: { type: "string", description: "Specific areas to focus on in the analysis" },
        },
        required: ["analysis_type"],
      },
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
        const [users, drivers, activeDrivers, trips, pendingRides, deliveryOrders, todayEarnings, complaints, stores, tickets] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("drivers").select("id", { count: "exact", head: true }),
          supabase.from("drivers").select("id", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("trips").select("id", { count: "exact", head: true }),
          supabase.from("ride_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("delivery_orders").select("id", { count: "exact", head: true }),
          supabase.from("earnings").select("amount").gte("date", today),
          supabase.from("complaints").select("id", { count: "exact", head: true }).eq("status", "open"),
          supabase.from("stores").select("id", { count: "exact", head: true }),
          supabase.from("tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
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
          total_stores: stores.count || 0,
          open_tickets: tickets.count || 0,
        });
      }
      case "platform_config": {
        if (args.action === "list") {
          const { data, error } = await supabase.from("app_settings").select("*").order("key");
          if (error) return JSON.stringify({ error: error.message });
          return JSON.stringify({ settings: data });
        }
        if (args.action === "get") {
          const { data, error } = await supabase.from("app_settings").select("*").eq("key", args.key).maybeSingle();
          if (error) return JSON.stringify({ error: error.message });
          return JSON.stringify(data || { key: args.key, value: null, message: "Setting not found" });
        }
        if (args.action === "set") {
          const { data: existing } = await supabase.from("app_settings").select("id").eq("key", args.key).maybeSingle();
          if (existing) {
            const { error } = await supabase.from("app_settings").update({ value: args.value, updated_at: new Date().toISOString() }).eq("key", args.key);
            if (error) return JSON.stringify({ error: error.message });
            return JSON.stringify({ success: true, action: "updated", key: args.key });
          } else {
            const { error } = await supabase.from("app_settings").insert({ key: args.key, value: args.value });
            if (error) return JSON.stringify({ error: error.message });
            return JSON.stringify({ success: true, action: "created", key: args.key });
          }
        }
        return JSON.stringify({ error: "Invalid action" });
      }
      case "bulk_notify": {
        let userIds: string[] = [];
        if (args.target === "all") {
          const { data } = await supabase.from("profiles").select("id").limit(500);
          userIds = (data || []).map((u: any) => u.id);
        } else if (args.target === "drivers") {
          const { data } = await supabase.from("drivers").select("user_id").limit(500);
          userIds = (data || []).map((d: any) => d.user_id);
        } else if (args.target === "users") {
          const { data } = await supabase.from("user_roles").select("user_id").eq("role", "user").limit(500);
          userIds = (data || []).map((r: any) => r.user_id);
        } else if (args.target === "specific" && args.user_ids?.length) {
          userIds = args.user_ids;
        }
        if (!userIds.length) return JSON.stringify({ error: "No users found for target" });
        const rows = userIds.map((uid: string) => ({
          user_id: uid,
          message: args.message,
          type: args.type || "general",
        }));
        const { error } = await supabase.from("notifications").insert(rows);
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ success: true, notified: userIds.length });
      }
      case "manage_user_role": {
        let userId = args.user_id;
        if (!userId && args.find_by_email) {
          const { data } = await supabase.from("profiles").select("id").eq("email", args.find_by_email).maybeSingle();
          userId = data?.id;
        }
        if (!userId && args.find_by_phone) {
          const { data } = await supabase.from("profiles").select("id").eq("phone", args.find_by_phone).maybeSingle();
          userId = data?.id;
        }
        if (!userId) return JSON.stringify({ error: "User not found" });

        if (args.action === "add") {
          const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: args.role });
          if (error) return JSON.stringify({ error: error.message });
          if (args.role === "driver") {
            await supabase.from("drivers").upsert({ user_id: userId, status: "inactive" }, { onConflict: "user_id" });
          }
          return JSON.stringify({ success: true, action: "role_added", user_id: userId, role: args.role });
        }
        if (args.action === "remove") {
          const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", args.role);
          if (error) return JSON.stringify({ error: error.message });
          return JSON.stringify({ success: true, action: "role_removed", user_id: userId, role: args.role });
        }
        if (args.action === "change") {
          await supabase.from("user_roles").delete().eq("user_id", userId);
          const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: args.role });
          if (error) return JSON.stringify({ error: error.message });
          if (args.role === "driver") {
            await supabase.from("drivers").upsert({ user_id: userId, status: "inactive" }, { onConflict: "user_id" });
          }
          return JSON.stringify({ success: true, action: "role_changed", user_id: userId, new_role: args.role });
        }
        return JSON.stringify({ error: "Invalid action" });
      }
      case "analyze_image": {
        return JSON.stringify({
          success: true,
          message: "Image analysis requested. The AI model will analyze the image directly from the conversation context.",
          analysis_type: args.analysis_type,
          focus_areas: args.focus_areas || "general",
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

    let body: unknown;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "invalid_json_body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return new Response(JSON.stringify({ error: `${issue.path.join(".") || "body"}: ${issue.message}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = parsed.data;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) throw new Error("Backend credentials not configured");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const systemPrompt = `أنت المساعد الذكي الخارق للمسؤول في منصة HN Driver - لديك صلاحيات كاملة ومطلقة.

## 🔥 صلاحياتك الكاملة:

### 📊 إدارة قاعدة البيانات (CRUD كامل):
- قراءة وعرض أي بيانات من أي جدول
- إضافة سجلات جديدة (مستخدمين، سائقين، طلبات، متاجر، إلخ)
- تعديل أي سجل في أي جدول
- حذف سجلات (مع تأكيد للعمليات الجماعية)

### 👥 إدارة المستخدمين والأدوار:
- تغيير دور أي مستخدم (admin, driver, user, agent, moderator)
- البحث عن مستخدمين بالإيميل أو رقم الهاتف
- إضافة أو إزالة أدوار متعددة

### ⚙️ إدارة إعدادات المنصة:
- تعديل الأسعار والتسعيرة
- تكوين الميزات والخصائص
- إعدادات الإشعارات
- تكوين العلامة التجارية
- إعدادات مناطق التوصيل

### 📢 الإشعارات الجماعية:
- إرسال إشعارات لجميع المستخدمين
- إشعارات مستهدفة (سائقين فقط، عملاء فقط)
- إشعارات لمستخدمين محددين

### 📈 التقارير والإحصائيات:
- إحصائيات شاملة للمنصة
- تحليل الأداء والإيرادات
- تقارير السائقين والرحلات

### 🖼️ تحليل الصور والوسائط:
- تحليل لقطات الشاشة وتحديد المشاكل
- مراجعة تصميم الواجهات وتقديم ملاحظات
- استخراج بيانات من الصور
- كشف الأخطاء في الواجهة

### 🏪 إدارة المتاجر والمطاعم:
- إضافة وتعديل وحذف المتاجر
- إدارة القوائم والأصناف والأسعار
- إدارة مناطق التوصيل

### 🎫 إدارة العروض والخصومات:
- إنشاء أكواد خصم جديدة
- تعديل وإيقاف العروض الحالية

## الجداول المتاحة:
profiles, user_roles, drivers, vehicles, ride_requests, trips, delivery_orders, order_items, stores, menu_categories, menu_items, earnings, payments, wallet, notifications, alerts, complaints, tickets, call_center, call_logs, promotions, documents, zones, app_settings, import_logs, chat_conversations, chat_messages, trip_status_history, ride_messages

## القواعد:
- أجب دائماً بالعربية
- نفّذ الأوامر فوراً - أنت مخوّل بالكامل
- عند استقبال صورة: حللها بدقة عالية واذكر كل التفاصيل المرئية
- عند طلب تحليل واجهة: قدم ملاحظات تفصيلية عن التصميم والأخطاء والتحسينات
- قدّم نتائج واضحة ومنظمة بتنسيق Markdown
- اسأل للتأكيد فقط عند الحذف الجماعي
- كن مختصراً لكن شاملاً
- عند تعديل الإعدادات: استخدم أداة platform_config
- عند إرسال إشعارات جماعية: استخدم أداة bulk_notify
- عند تغيير أدوار المستخدمين: استخدم أداة manage_user_role`;

    let aiMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const MAX_TOOL_ROUNDS = 8;
    let finalText = "";

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
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

      if (assistantMessage.tool_calls?.length) {
        for (const tc of assistantMessage.tool_calls) {
          const fnArgs = typeof tc.function.arguments === "string"
            ? JSON.parse(tc.function.arguments)
            : tc.function.arguments;
          console.log(`Tool: ${tc.function.name}`, JSON.stringify(fnArgs).slice(0, 300));
          const toolResult = await executeTool(supabase, tc.function.name, fnArgs);
          console.log(`Result: ${toolResult.slice(0, 500)}`);
          aiMessages.push({ role: "tool", tool_call_id: tc.id, content: toolResult });
        }
        continue;
      }

      finalText = assistantMessage.content || "";
      break;
    }

    return new Response(JSON.stringify({ reply: finalText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("admin-ai-agent error:", error);
    return handleError(error);
  }
});
