import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, enforceRateLimit, handleError, HttpError, z } from "../_shared/security.ts";

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
  "profiles", "drivers", "vehicles", "ride_requests", "trips",
  "delivery_orders", "order_items", "stores", "menu_categories", "menu_items",
  "earnings", "payments", "wallet", "notifications", "alerts", "complaints",
  "tickets", "call_center", "call_logs", "promotions", "documents",
  "zones", "app_settings", "import_logs", "chat_conversations", "chat_messages",
  "trip_status_history", "ride_messages", "commission_rates",
  "assistant_knowledge_entries", "assistant_recommendations", "assistant_issue_patterns",
  "assistant_campaign_ideas", "assistant_activity_log", "product_images",
  "platform_languages", "platform_translations", "dynamic_pages",
  "social_media_posts", "smart_assistant_commands", "sub_assistants",
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
  {
    type: "function",
    function: {
      name: "manage_commission_rates",
      description: "View or update platform commission rates per category (restaurants, drivers, delivery, stores, pharmacy_beauty, courier, express_market, supermarket, shops_gifts). Default is 5%.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "update"], description: "'list' to view all rates, 'update' to change a rate" },
          category: { type: "string", description: "Category to update (only for 'update' action)" },
          rate: { type: "number", description: "New commission rate percentage (only for 'update' action)" },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manage_page",
      description: `Create, update, list or delete dynamic pages. Pages are stored in the database and rendered dynamically on the site.
Content is a JSON array of sections/blocks. Each block has a 'type' and properties.
Supported block types:
- hero: { type:"hero", title, subtitle, background_color, text_color, background_image, cta_text, cta_link }
- text: { type:"text", content (markdown), alignment }
- image: { type:"image", url, alt, width, caption }
- cards: { type:"cards", columns(1-4), items:[{title, description, icon, image, link}] }
- stats: { type:"stats", items:[{label, value, icon, color}] }
- cta: { type:"cta", title, subtitle, button_text, button_link, background_color }
- faq: { type:"faq", items:[{question, answer}] }
- gallery: { type:"gallery", columns(2-4), images:[{url, alt, caption}] }
- divider: { type:"divider", style:"line"|"space"|"dots" }
- html: { type:"html", code (raw HTML) }
- table: { type:"table", headers:[], rows:[[]] }
- video: { type:"video", url, title }
- form: { type:"form", title, fields:[{name,type,label,required}], submit_text }
- map: { type:"map", lat, lng, zoom, marker_title }
- pricing: { type:"pricing", plans:[{name,price,period,features:[],cta_text,highlighted}] }
- testimonials: { type:"testimonials", items:[{name,role,text,avatar}] }
- timeline: { type:"timeline", items:[{date,title,description}] }
- features: { type:"features", columns(2-4), items:[{title,description,icon}] }`,
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["create", "update", "list", "get", "delete", "publish", "unpublish"] },
          slug: { type: "string", description: "URL slug for the page (e.g. 'about-us', 'promo-summer')" },
          title: { type: "string", description: "Page title" },
          page_type: { type: "string", enum: ["content", "landing", "dashboard", "marketing"], description: "Type of page" },
          content: { type: "array", description: "Array of content blocks/sections" },
          meta_description: { type: "string", description: "SEO meta description" },
          css_overrides: { type: "string", description: "Custom CSS for this page" },
          is_published: { type: "boolean", description: "Whether page is live" },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manage_social_content",
      description: `Create, manage and schedule social media posts/ads for platforms like Facebook, Instagram, Twitter, TikTok, LinkedIn. Posts are saved as drafts and must be approved by the admin before they can be published. Use this to prepare marketing content, promotions, and ads.`,
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["create", "list", "update", "delete", "approve", "reject"], description: "Action to perform" },
          id: { type: "string", description: "Post ID (for update/delete/approve/reject)" },
          platform: { type: "string", enum: ["facebook", "instagram", "twitter", "tiktok", "linkedin", "all"], description: "Target platform" },
          post_type: { type: "string", enum: ["post", "story", "reel", "ad", "carousel"], description: "Type of post" },
          title: { type: "string", description: "Post title/headline" },
          content: { type: "string", description: "Post text content / caption" },
          image_url: { type: "string", description: "Image URL for the post" },
          hashtags: { type: "array", items: { type: "string" }, description: "Hashtags array" },
          target_audience: { type: "string", description: "Target audience description" },
          scheduled_at: { type: "string", description: "ISO date for scheduled publishing" },
          metadata: { type: "object", description: "Additional platform-specific data" },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_webpage",
      description: "Fetch and read the content of a webpage URL. Returns the page title, text content, meta description, and links. Use this when the admin asks you to read or analyze a website displayed in the preview panel.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The full URL of the webpage to fetch (e.g. https://example.com)" },
          extract: { type: "string", enum: ["text", "links", "meta", "all"], default: "all", description: "What to extract from the page" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manage_theme",
      description: "View or update the site theme/branding. Controls colors, fonts, logo, and visual identity stored in app_settings.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["get", "update"] },
          theme: {
            type: "object",
            description: "Theme settings to update",
            properties: {
              primary_color: { type: "string", description: "Primary brand color (hex)" },
              secondary_color: { type: "string", description: "Secondary color (hex)" },
              accent_color: { type: "string", description: "Accent/highlight color (hex)" },
              background_color: { type: "string", description: "Main background color (hex)" },
              text_color: { type: "string", description: "Main text color (hex)" },
              font_family: { type: "string", description: "Main font family" },
              font_heading: { type: "string", description: "Heading font family" },
              logo_url: { type: "string", description: "Logo image URL" },
              favicon_url: { type: "string", description: "Favicon URL" },
              border_radius: { type: "string", description: "Global border radius (e.g. '8px', '12px')" },
              custom_css: { type: "string", description: "Additional custom CSS" },
            },
          },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_code",
      description: `Generate code files for the website. Supports React/TypeScript components, CSS/Tailwind styles, SQL queries, HTML pages, and configuration files. The generated code is saved locally for the admin to review and deploy manually. Use this when the admin asks to create or modify components, pages, styles, or any code.`,
      parameters: {
        type: "object",
        properties: {
          file_path: { type: "string", description: "Target file path relative to project root (e.g. 'src/pages/NewPage.tsx', 'src/components/Banner.tsx', 'src/index.css')" },
          language: { type: "string", enum: ["typescript", "tsx", "css", "html", "sql", "json", "javascript"], description: "Programming language" },
          code: { type: "string", description: "The complete code content for the file" },
          description: { type: "string", description: "Brief description of what this code does" },
          action: { type: "string", enum: ["create", "modify", "delete"], default: "create", description: "Whether to create a new file, modify existing, or mark for deletion" },
        },
        required: ["file_path", "language", "code", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_deployment_package",
      description: "Generate a complete deployment package with all pending code changes, SQL migrations, and file modifications. This creates a downloadable JSON file containing everything the admin needs to deploy.",
      parameters: {
        type: "object",
        properties: {
          package_name: { type: "string", description: "Name for the deployment package" },
          include_sql: { type: "boolean", default: true, description: "Include SQL migration scripts" },
          include_files: { type: "boolean", default: true, description: "Include generated code files" },
        },
        required: ["package_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_store_with_page",
      description: `Create a new store/restaurant with its menu categories and automatically generate a dynamic page for it. This is a one-step wizard: provide the store details and the system will:
1. Create the store record in the 'stores' table
2. Create menu categories if provided
3. Create a beautiful dynamic page with hero, info, menu sections, map, and CTA
4. Link the page to the store
Use this when the admin wants to add a new restaurant or store quickly.`,
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Store/restaurant name" },
          description: { type: "string", description: "Short description" },
          address: { type: "string", description: "Physical address" },
          phone: { type: "string", description: "Contact phone" },
          category: { type: "string", enum: ["restaurant", "grocery", "pharmacy", "bakery", "cafe", "store"], default: "restaurant" },
          image_url: { type: "string", description: "Main image URL" },
          delivery_fee: { type: "number", default: 10, description: "Delivery fee in DH" },
          delivery_time_min: { type: "number", default: 20, description: "Min delivery time in minutes" },
          delivery_time_max: { type: "number", default: 40, description: "Max delivery time in minutes" },
          rating: { type: "number", default: 4.5, description: "Initial rating" },
          lat: { type: "number", description: "Latitude" },
          lng: { type: "number", description: "Longitude" },
          menu_categories: {
            type: "array",
            description: "Menu categories to create",
            items: {
              type: "object",
              properties: {
                name_ar: { type: "string" },
                name_fr: { type: "string" },
              },
              required: ["name_ar"],
            },
          },
          page_style: { type: "string", enum: ["modern", "classic", "minimal"], default: "modern", description: "Style of the generated page" },
          publish_page: { type: "boolean", default: true, description: "Auto-publish the page" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delegate_to_assistant",
      description: `Delegate a task to a specialized sub-assistant. You act as an orchestrator: read the admin's request, pick the best sub-assistant, and delegate. The sub-assistant executes within its allowed scope. List sub-assistants first with db_select on sub_assistants table if needed.`,
      parameters: {
        type: "object",
        properties: {
          assistant_id: { type: "string", description: "UUID of the sub-assistant" },
          task: { type: "string", description: "Clear task description" },
          context: { type: "string", description: "Additional context or data" },
        },
        required: ["assistant_id", "task"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manage_sub_assistants",
      description: "Create, update, list, or delete sub-assistants.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "create", "update", "delete", "activate", "deactivate"] },
          id: { type: "string" },
          name: { type: "string" },
          name_ar: { type: "string" },
          description: { type: "string" },
          assistant_type: { type: "string" },
          system_prompt: { type: "string" },
          allowed_tables: { type: "array", items: { type: "string" } },
          allowed_tools: { type: "array", items: { type: "string" } },
          icon: { type: "string" },
          color: { type: "string" },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "orchestrate_task",
      description: `تنسيق مهمة معقدة تلقائياً. يقوم بتحليل المهمة وتقسيمها لمهام فرعية، ثم يُنشئ مساعدين فرعيين مؤقتين إذا لزم الأمر أو يستخدم الموجودين، ويُفوّض لهم العمل بالتوازي لإنجاز المهمة بأسرع وقت.
مثال: "أنشئ صفحة هوم بيج" → ينشئ مساعد تصميم + مساعد محتوى + مساعد بيانات ويعملون معاً.`,
      parameters: {
        type: "object",
        properties: {
          task_description: { type: "string", description: "وصف المهمة الكاملة" },
          sub_tasks: {
            type: "array",
            description: "المهام الفرعية المطلوبة (اختياري - يمكن تركها للنظام ليحددها تلقائياً)",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "عنوان المهمة الفرعية" },
                description: { type: "string", description: "تفاصيل المهمة" },
                type: { type: "string", enum: ["design", "content", "data", "code", "analysis", "communication"], description: "نوع المهمة" },
                priority: { type: "string", enum: ["high", "medium", "low"], default: "medium" },
              },
              required: ["title", "description", "type"],
            },
          },
          auto_create_assistants: { type: "boolean", default: true, description: "إنشاء مساعدين مؤقتين تلقائياً إذا لم يوجد مناسب" },
          parallel: { type: "boolean", default: true, description: "تنفيذ المهام بالتوازي" },
        },
        required: ["task_description"],
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
        // Safety: count before deleting to prevent mass deletion
        let countQ = supabase.from(args.table).select("id", { count: "exact", head: true });
        countQ = applyFilters(countQ, args.filters);
        const { count: affectedCount } = await countQ;
        if (affectedCount && affectedCount > 10) {
          return JSON.stringify({ error: `Safety limit: would delete ${affectedCount} rows. Max 10 per operation. Add more specific filters.` });
        }
        let q = supabase.from(args.table).delete();
        q = applyFilters(q, args.filters);
        const { data, error } = await q.select();
        if (error) return JSON.stringify({ error: error.message });
        console.log(`[AUDIT] Deleted ${data?.length || 0} rows from ${args.table}`);
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
      case "analyze_image": {
        return JSON.stringify({
          success: true,
          message: "Image analysis requested. The AI model will analyze the image directly from the conversation context.",
          analysis_type: args.analysis_type,
          focus_areas: args.focus_areas || "general",
        });
      }
      case "fetch_webpage": {
        try {
          const targetUrl = args.url;
          if (!targetUrl || typeof targetUrl !== "string") return JSON.stringify({ error: "URL required" });
          // Basic URL validation
          let parsedUrl: URL;
          try { parsedUrl = new URL(targetUrl); } catch { return JSON.stringify({ error: "Invalid URL format" }); }
          if (!["http:", "https:"].includes(parsedUrl.protocol)) return JSON.stringify({ error: "Only HTTP/HTTPS URLs allowed" });

          const fetchResp = await fetch(targetUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; HNBot/1.0)",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "ar,fr,en;q=0.5",
            },
            redirect: "follow",
          });

          if (!fetchResp.ok) return JSON.stringify({ error: `Failed to fetch: HTTP ${fetchResp.status}` });

          const html = await fetchResp.text();
          const maxLen = 12000;

          // Extract title
          const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          const title = titleMatch ? titleMatch[1].trim().slice(0, 200) : "";

          // Extract meta description
          const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
          const metaDesc = metaMatch ? metaMatch[1].trim().slice(0, 500) : "";

          // Extract text content (strip tags)
          let textContent = html
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, maxLen);

          // Extract links
          const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
          const links: { href: string; text: string }[] = [];
          let linkMatch;
          while ((linkMatch = linkRegex.exec(html)) !== null && links.length < 30) {
            links.push({ href: linkMatch[1], text: linkMatch[2].replace(/<[^>]+>/g, "").trim().slice(0, 100) });
          }

          const extract = args.extract || "all";
          const result: any = { url: targetUrl, title };
          if (extract === "all" || extract === "text") result.text_content = textContent;
          if (extract === "all" || extract === "meta") result.meta_description = metaDesc;
          if (extract === "all" || extract === "links") result.links = links;

          return JSON.stringify(result);
        } catch (e: any) {
          return JSON.stringify({ error: `Fetch failed: ${e.message}` });
        }
      }
      case "manage_commission_rates": {
        if (args.action === "list") {
          const { data, error } = await supabase.from("commission_rates").select("*").order("category");
          if (error) return JSON.stringify({ error: error.message });
          return JSON.stringify({ rates: data });
        }
        if (args.action === "update") {
          if (!args.category || args.rate === undefined) return JSON.stringify({ error: "category and rate required" });
          const { data, error } = await supabase.from("commission_rates")
            .update({ rate: args.rate, updated_at: new Date().toISOString() })
            .eq("category", args.category)
            .select();
          if (error) return JSON.stringify({ error: error.message });
          if (!data?.length) return JSON.stringify({ error: "Category not found" });
          return JSON.stringify({ success: true, category: args.category, new_rate: args.rate });
        }
        return JSON.stringify({ error: "Invalid action" });
      }
      case "manage_page": {
        if (args.action === "list") {
          const { data, error } = await supabase.from("dynamic_pages").select("id, slug, title, page_type, is_published, sort_order, updated_at").order("updated_at", { ascending: false });
          if (error) return JSON.stringify({ error: error.message });
          return JSON.stringify({ pages: data });
        }
        if (args.action === "get") {
          if (!args.slug) return JSON.stringify({ error: "slug required" });
          const { data, error } = await supabase.from("dynamic_pages").select("*").eq("slug", args.slug).maybeSingle();
          if (error) return JSON.stringify({ error: error.message });
          return JSON.stringify(data || { error: "Page not found" });
        }
        if (args.action === "create") {
          if (!args.slug || !args.title) return JSON.stringify({ error: "slug and title required" });
          const { data, error } = await supabase.from("dynamic_pages").insert({
            slug: args.slug,
            title: args.title,
            page_type: args.page_type || "content",
            content: args.content || [],
            meta_description: args.meta_description || "",
            css_overrides: args.css_overrides || "",
            is_published: args.is_published ?? false,
          }).select().single();
          if (error) return JSON.stringify({ error: error.message });
          return JSON.stringify({ success: true, action: "created", page: data });
        }
        if (args.action === "update") {
          if (!args.slug) return JSON.stringify({ error: "slug required" });
          const updates: any = { updated_at: new Date().toISOString() };
          if (args.title !== undefined) updates.title = args.title;
          if (args.content !== undefined) updates.content = args.content;
          if (args.page_type !== undefined) updates.page_type = args.page_type;
          if (args.meta_description !== undefined) updates.meta_description = args.meta_description;
          if (args.css_overrides !== undefined) updates.css_overrides = args.css_overrides;
          if (args.is_published !== undefined) updates.is_published = args.is_published;
          const { data, error } = await supabase.from("dynamic_pages").update(updates).eq("slug", args.slug).select().single();
          if (error) return JSON.stringify({ error: error.message });
          return JSON.stringify({ success: true, action: "updated", page: data });
        }
        if (args.action === "delete") {
          if (!args.slug) return JSON.stringify({ error: "slug required" });
          const { error } = await supabase.from("dynamic_pages").delete().eq("slug", args.slug);
          if (error) return JSON.stringify({ error: error.message });
          return JSON.stringify({ success: true, action: "deleted", slug: args.slug });
        }
        if (args.action === "publish") {
          if (!args.slug) return JSON.stringify({ error: "slug required" });
          const { error } = await supabase.from("dynamic_pages").update({ is_published: true, updated_at: new Date().toISOString() }).eq("slug", args.slug);
          if (error) return JSON.stringify({ error: error.message });
          return JSON.stringify({ success: true, action: "published", slug: args.slug });
        }
        if (args.action === "unpublish") {
          if (!args.slug) return JSON.stringify({ error: "slug required" });
          const { error } = await supabase.from("dynamic_pages").update({ is_published: false, updated_at: new Date().toISOString() }).eq("slug", args.slug);
          if (error) return JSON.stringify({ error: error.message });
          return JSON.stringify({ success: true, action: "unpublished", slug: args.slug });
        }
        return JSON.stringify({ error: "Invalid action" });
      }
      case "manage_theme": {
        const THEME_KEY = "site_theme";
        if (args.action === "get") {
          const { data, error } = await supabase.from("app_settings").select("*").eq("key", THEME_KEY).maybeSingle();
          if (error) return JSON.stringify({ error: error.message });
          return JSON.stringify(data?.value || { message: "No theme configured, using defaults" });
        }
        if (args.action === "update") {
          if (!args.theme) return JSON.stringify({ error: "theme object required" });
          const { data: existing } = await supabase.from("app_settings").select("id, value").eq("key", THEME_KEY).maybeSingle();
          const merged = { ...(existing?.value || {}), ...args.theme };
          if (existing) {
            const { error } = await supabase.from("app_settings").update({ value: merged, updated_at: new Date().toISOString() }).eq("key", THEME_KEY);
            if (error) return JSON.stringify({ error: error.message });
          } else {
            const { error } = await supabase.from("app_settings").insert({ key: THEME_KEY, value: merged });
            if (error) return JSON.stringify({ error: error.message });
          }
          return JSON.stringify({ success: true, theme: merged });
        }
        return JSON.stringify({ error: "Invalid action" });
      }
      case "manage_social_content": {
        if (args.action === "list") {
          const { data, error } = await supabase.from("social_media_posts").select("*").order("created_at", { ascending: false }).limit(50);
          if (error) return JSON.stringify({ error: error.message });
          return JSON.stringify({ posts: data });
        }
        if (args.action === "create") {
          if (!args.content) return JSON.stringify({ error: "content required" });
          const { data, error } = await supabase.from("social_media_posts").insert({
            platform: args.platform || "facebook",
            post_type: args.post_type || "post",
            title: args.title || "",
            content: args.content,
            image_url: args.image_url || null,
            hashtags: args.hashtags || [],
            target_audience: args.target_audience || "general",
            scheduled_at: args.scheduled_at || null,
            metadata: args.metadata || {},
            status: "draft",
            admin_approved: false,
          }).select().single();
          if (error) return JSON.stringify({ error: error.message });
          return JSON.stringify({ success: true, action: "created", post: data, message: "تم إنشاء المنشور كمسودة. يحتاج موافقة المدير قبل النشر." });
        }
        if (args.action === "update") {
          if (!args.id) return JSON.stringify({ error: "id required" });
          const updates: any = { updated_at: new Date().toISOString() };
          if (args.title !== undefined) updates.title = args.title;
          if (args.content !== undefined) updates.content = args.content;
          if (args.platform !== undefined) updates.platform = args.platform;
          if (args.post_type !== undefined) updates.post_type = args.post_type;
          if (args.image_url !== undefined) updates.image_url = args.image_url;
          if (args.hashtags !== undefined) updates.hashtags = args.hashtags;
          if (args.target_audience !== undefined) updates.target_audience = args.target_audience;
          if (args.scheduled_at !== undefined) updates.scheduled_at = args.scheduled_at;
          if (args.metadata !== undefined) updates.metadata = args.metadata;
          const { data, error } = await supabase.from("social_media_posts").update(updates).eq("id", args.id).select().single();
          if (error) return JSON.stringify({ error: error.message });
          return JSON.stringify({ success: true, action: "updated", post: data });
        }
        if (args.action === "delete") {
          if (!args.id) return JSON.stringify({ error: "id required" });
          const { error } = await supabase.from("social_media_posts").delete().eq("id", args.id);
          if (error) return JSON.stringify({ error: error.message });
          return JSON.stringify({ success: true, action: "deleted" });
        }
        if (args.action === "approve") {
          if (!args.id) return JSON.stringify({ error: "id required" });
          const { data, error } = await supabase.from("social_media_posts").update({
            admin_approved: true,
            approved_at: new Date().toISOString(),
            status: "approved",
            updated_at: new Date().toISOString(),
          }).eq("id", args.id).select().single();
          if (error) return JSON.stringify({ error: error.message });
          return JSON.stringify({ success: true, action: "approved", post: data, message: "تمت الموافقة على المنشور. يمكن نشره الآن." });
        }
        if (args.action === "reject") {
          if (!args.id) return JSON.stringify({ error: "id required" });
          const { data, error } = await supabase.from("social_media_posts").update({
            admin_approved: false,
            status: "rejected",
            updated_at: new Date().toISOString(),
          }).eq("id", args.id).select().single();
          if (error) return JSON.stringify({ error: error.message });
          return JSON.stringify({ success: true, action: "rejected", post: data });
        }
        return JSON.stringify({ error: "Invalid action" });
      }
      case "generate_code": {
        // Save generated code to smart_assistant_commands as a code artifact
        const fileEntry = {
          file_path: args.file_path,
          language: args.language,
          code: args.code,
          description: args.description,
          action: args.action || "create",
          generated_at: new Date().toISOString(),
        };
        
        // Store in smart_assistant_commands table
        const { error: saveErr } = await supabase.from("smart_assistant_commands").insert({
          admin_id: "system",
          command_text: `generate_code: ${args.description}`,
          command_type: "code_generation",
          ai_response: args.code,
          generated_files: [fileEntry],
          status: "pending_review",
        });
        
        if (saveErr) return JSON.stringify({ error: saveErr.message });
        
        // Also upload the code file to storage
        const encoder = new TextEncoder();
        const fileContent = encoder.encode(args.code);
        const storagePath = `generated-code/${Date.now()}_${args.file_path.replace(/\//g, "_")}`;
        
        await supabase.storage.from("smart-assistant-files").upload(storagePath, fileContent, {
          contentType: "text/plain",
          upsert: true,
        });
        
        const { data: urlData } = supabase.storage.from("smart-assistant-files").getPublicUrl(storagePath);
        
        return JSON.stringify({
          success: true,
          file_path: args.file_path,
          language: args.language,
          description: args.description,
          action: args.action || "create",
          download_url: urlData.publicUrl,
          message: `✅ تم توليد الكود بنجاح: ${args.file_path}\n📥 الملف محفوظ محلياً ويمكن تحميله من سجل الأوامر.\n⚠️ لن يُطبق على السيرفر حتى ترفعه يدوياً.`,
        });
      }
      case "generate_deployment_package": {
        // Collect all pending code generations
        const { data: pendingCmds, error: fetchErr } = await supabase
          .from("smart_assistant_commands")
          .select("*")
          .eq("command_type", "code_generation")
          .eq("status", "pending_review")
          .order("created_at", { ascending: true });
          
        if (fetchErr) return JSON.stringify({ error: fetchErr.message });
        
        const deployPackage = {
          package_name: args.package_name,
          generated_at: new Date().toISOString(),
          total_files: pendingCmds?.length || 0,
          files: (pendingCmds || []).map((cmd: any) => ({
            ...((cmd.generated_files as any[])?.[0] || {}),
            command_id: cmd.id,
          })),
          instructions: [
            "1. راجع كل الملفات في القائمة أدناه",
            "2. انسخ كل ملف إلى المسار المحدد في مشروعك المحلي",
            "3. شغّل npm run build للتأكد من عدم وجود أخطاء",
            "4. ارفع التغييرات إلى السيرفر",
          ],
        };
        
        // Save package to storage
        const packageContent = new TextEncoder().encode(JSON.stringify(deployPackage, null, 2));
        const packagePath = `packages/${args.package_name}_${Date.now()}.json`;
        
        await supabase.storage.from("smart-assistant-files").upload(packagePath, packageContent, {
          contentType: "application/json",
          upsert: true,
        });
        
        const { data: pkgUrl } = supabase.storage.from("smart-assistant-files").getPublicUrl(packagePath);
        
        return JSON.stringify({
          success: true,
          package_name: args.package_name,
          total_files: deployPackage.total_files,
          download_url: pkgUrl.publicUrl,
          message: `📦 تم إنشاء حزمة النشر "${args.package_name}" بـ ${deployPackage.total_files} ملفات.\n📥 يمكنك تحميلها من الرابط أدناه.`,
        });
      }
      case "create_store_with_page": {
        // 1. Create the store
        const storeData: any = {
          name: args.name,
          description: args.description || "",
          address: args.address || "",
          phone: args.phone || "",
          category: args.category || "restaurant",
          image_url: args.image_url || "",
          delivery_fee: args.delivery_fee ?? 10,
          delivery_time_min: args.delivery_time_min ?? 20,
          delivery_time_max: args.delivery_time_max ?? 40,
          rating: args.rating ?? 4.5,
          is_open: true,
          lat: args.lat || null,
          lng: args.lng || null,
        };
        
        const { data: store, error: storeErr } = await supabase
          .from("stores").insert(storeData).select().single();
        if (storeErr) return JSON.stringify({ error: `فشل إنشاء المتجر: ${storeErr.message}` });
        
        // 2. Create menu categories if provided
        const createdCategories: any[] = [];
        if (args.menu_categories?.length) {
          const catRows = args.menu_categories.map((c: any, i: number) => ({
            store_id: store.id,
            name_ar: c.name_ar,
            name_fr: c.name_fr || "",
            sort_order: i,
            is_active: true,
          }));
          const { data: cats, error: catErr } = await supabase
            .from("menu_categories").insert(catRows).select();
          if (!catErr && cats) createdCategories.push(...cats);
        }
        
        // 3. Generate dynamic page
        const slug = args.name.toLowerCase()
          .replace(/[^\w\s\u0600-\u06FF-]/g, "")
          .replace(/\s+/g, "-")
          .slice(0, 50) || `store-${store.id.slice(0, 8)}`;
        
        const categoryLabel = {
          restaurant: "مطعم",
          grocery: "بقالة",
          pharmacy: "صيدلية",
          bakery: "مخبزة",
          cafe: "مقهى",
          store: "متجر",
        }[args.category || "restaurant"] || "متجر";
        
        const pageContent: any[] = [
          {
            type: "hero",
            title: args.name,
            subtitle: args.description || `مرحباً بكم في ${args.name}`,
            background_color: "#1a1a2e",
            text_color: "#ffffff",
            background_image: args.image_url || "",
            cta_text: "اطلب الآن",
            cta_link: `/delivery/store/${store.id}`,
          },
          {
            type: "cards",
            columns: 3,
            items: [
              { title: "⏱️ وقت التوصيل", description: `${args.delivery_time_min || 20}-${args.delivery_time_max || 40} دقيقة`, icon: "clock" },
              { title: "🚚 رسوم التوصيل", description: `${args.delivery_fee || 10} DH`, icon: "truck" },
              { title: "⭐ التقييم", description: `${args.rating || 4.5} / 5`, icon: "star" },
            ],
          },
          {
            type: "text",
            content: `## من نحن\n\n${args.description || `${args.name} - ${categoryLabel} متميز يقدم أفضل الخدمات والمنتجات.`}\n\n📍 **العنوان**: ${args.address || "سيتم التحديث"}\n📞 **الهاتف**: ${args.phone || "سيتم التحديث"}`,
            alignment: "right",
          },
        ];
        
        if (createdCategories.length) {
          pageContent.push({
            type: "text",
            content: `## 📋 أقسام المنيو\n\n${createdCategories.map((c: any) => `- **${c.name_ar}** ${c.name_fr ? `(${c.name_fr})` : ""}`).join("\n")}`,
            alignment: "right",
          });
        }
        
        if (args.lat && args.lng) {
          pageContent.push({
            type: "map",
            lat: args.lat,
            lng: args.lng,
            zoom: 15,
            marker_title: args.name,
          });
        }
        
        pageContent.push({
          type: "cta",
          title: `اطلب من ${args.name} الآن!`,
          subtitle: "توصيل سريع لباب منزلك",
          button_text: "تصفح المنيو واطلب",
          button_link: `/delivery/store/${store.id}`,
          background_color: "#16a34a",
        });
        
        const { data: page, error: pageErr } = await supabase.from("dynamic_pages").insert({
          slug,
          title: `${args.name} - ${categoryLabel}`,
          page_type: "landing",
          content: pageContent,
          meta_description: `${args.name} - ${args.description || categoryLabel}. اطلب الآن مع خدمة التوصيل السريع.`,
          is_published: args.publish_page !== false,
        }).select().single();
        
        return JSON.stringify({
          success: true,
          store: { id: store.id, name: store.name },
          categories_created: createdCategories.length,
          page: page ? { slug: page.slug, url: `/p/${page.slug}`, published: page.is_published } : null,
          store_url: `/delivery/store/${store.id}`,
          message: `✅ تم إنشاء ${categoryLabel} "${args.name}" بنجاح!\n📄 صفحة المتجر: /p/${slug}\n🛒 رابط المتجر: /delivery/store/${store.id}\n📂 الأقسام: ${createdCategories.length} قسم\n${page?.is_published ? "🌐 الصفحة منشورة ومتاحة للزوار" : "⚠️ الصفحة غير منشورة بعد"}`,
        });
      }
      case "delegate_to_assistant": {
        // Fetch the sub-assistant
        const { data: subAst, error: astErr } = await supabase
          .from("sub_assistants").select("*").eq("id", args.assistant_id).single();
        if (astErr || !subAst) return JSON.stringify({ error: "المساعد الفرعي غير موجود" });
        if (!subAst.is_active) return JSON.stringify({ error: `المساعد "${subAst.name_ar}" معطّل حالياً` });

        // Build a restricted tool set based on sub-assistant's allowed_tools
        const subTools = tools.filter((t: any) => subAst.allowed_tools.includes(t.function?.name));
        
        // Override ALLOWED_TABLES for the sub-assistant (restrict enum in db_select etc.)
        const subSystemPrompt = `${subAst.system_prompt}\n\nأنت مساعد فرعي متخصص. الجداول المسموحة لك فقط: ${subAst.allowed_tables.join(", ")}.\nلا تتجاوز نطاق مهامك أبداً.\n\nالمهمة المطلوبة: ${args.task}\n${args.context ? `\nسياق إضافي: ${args.context}` : ""}`;

        const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
        const subResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: subSystemPrompt },
              { role: "user", content: args.task },
            ],
            tools: subTools.length ? subTools : undefined,
            stream: false,
          }),
        });

        if (!subResponse.ok) return JSON.stringify({ error: "فشل الاتصال بالمساعد الفرعي" });
        const subResult = await subResponse.json();
        const subChoice = subResult.choices?.[0];
        
        // If sub-assistant wants to use tools, execute them within its scope
        let subFinalText = subChoice?.message?.content || "";
        if (subChoice?.message?.tool_calls?.length) {
          const toolResults: string[] = [];
          for (const tc of subChoice.message.tool_calls) {
            const fnName = tc.function.name;
            // Security: only allow tools in the sub-assistant's allowed list
            if (!subAst.allowed_tools.includes(fnName)) {
              toolResults.push(`⛔ الأداة ${fnName} غير مسموحة لهذا المساعد`);
              continue;
            }
            const fnArgs = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments;
            // Security: restrict table access
            if (fnArgs.table && !subAst.allowed_tables.includes(fnArgs.table)) {
              toolResults.push(`⛔ الجدول ${fnArgs.table} غير مسموح لهذا المساعد`);
              continue;
            }
            console.log(`[SUB-AGENT:${subAst.name}] Tool=${fnName} Args=${JSON.stringify(fnArgs).slice(0, 200)}`);
            const result = await executeTool(supabase, fnName, fnArgs);
            toolResults.push(result);
          }
          subFinalText = `نتائج تنفيذ المساعد "${subAst.name_ar}":\n${toolResults.join("\n")}`;
        }

        // Log execution
        await supabase.from("sub_assistants").update({
          execution_log: [...((subAst.execution_log as any[]) || []).slice(-49), {
            task: args.task,
            result: subFinalText.slice(0, 500),
            executed_at: new Date().toISOString(),
          }],
          updated_at: new Date().toISOString(),
        }).eq("id", args.assistant_id);

        return JSON.stringify({
          success: true,
          assistant: subAst.name_ar,
          type: subAst.assistant_type,
          response: subFinalText,
          message: `✅ المساعد "${subAst.name_ar}" نفّذ المهمة بنجاح`,
        });
      }
      case "manage_sub_assistants": {
        if (args.action === "list") {
          const { data, error } = await supabase.from("sub_assistants").select("id, name, name_ar, assistant_type, is_active, icon, color, description, allowed_tools, allowed_tables").order("created_at");
          if (error) return JSON.stringify({ error: error.message });
          return JSON.stringify({ assistants: data });
        }
        if (args.action === "create") {
          const { data, error } = await supabase.from("sub_assistants").insert({
            name: args.name || "", name_ar: args.name_ar || "", description: args.description || "",
            assistant_type: args.assistant_type || "general", system_prompt: args.system_prompt || "",
            allowed_tables: args.allowed_tables || [], allowed_tools: args.allowed_tools || [],
            icon: args.icon || "bot", color: args.color || "#3b82f6",
          }).select().single();
          if (error) return JSON.stringify({ error: error.message });
          return JSON.stringify({ success: true, assistant: data, message: "✅ تم إنشاء المساعد الفرعي" });
        }
        if (args.action === "update") {
          if (!args.id) return JSON.stringify({ error: "id required" });
          const updates: any = { updated_at: new Date().toISOString() };
          if (args.name !== undefined) updates.name = args.name;
          if (args.name_ar !== undefined) updates.name_ar = args.name_ar;
          if (args.description !== undefined) updates.description = args.description;
          if (args.system_prompt !== undefined) updates.system_prompt = args.system_prompt;
          if (args.allowed_tables !== undefined) updates.allowed_tables = args.allowed_tables;
          if (args.allowed_tools !== undefined) updates.allowed_tools = args.allowed_tools;
          const { data, error } = await supabase.from("sub_assistants").update(updates).eq("id", args.id).select().single();
          if (error) return JSON.stringify({ error: error.message });
          return JSON.stringify({ success: true, assistant: data });
        }
        if (args.action === "delete") {
          if (!args.id) return JSON.stringify({ error: "id required" });
          const { error } = await supabase.from("sub_assistants").delete().eq("id", args.id);
          if (error) return JSON.stringify({ error: error.message });
          return JSON.stringify({ success: true, message: "تم حذف المساعد" });
        }
        if (args.action === "activate" || args.action === "deactivate") {
          if (!args.id) return JSON.stringify({ error: "id required" });
          const { error } = await supabase.from("sub_assistants").update({ is_active: args.action === "activate", updated_at: new Date().toISOString() }).eq("id", args.id);
          if (error) return JSON.stringify({ error: error.message });
          return JSON.stringify({ success: true, message: args.action === "activate" ? "✅ تم تفعيل المساعد" : "تم تعطيل المساعد" });
        }
        return JSON.stringify({ error: "Invalid action" });
      }
      case "orchestrate_task": {
        const taskDesc = args.task_description;
        const autoCreate = args.auto_create_assistants !== false;
        const parallel = args.parallel !== false;

        // 1. Fetch existing sub-assistants
        const { data: existingAssistants } = await supabase
          .from("sub_assistants").select("*").eq("is_active", true);
        const activeAssistants = existingAssistants || [];

        // 2. Define sub-task types and their default configs
        const SUB_TASK_CONFIGS: Record<string, any> = {
          design: {
            name: "Design Worker", name_ar: "مساعد التصميم",
            system_prompt: "أنت مصمم واجهات متخصص. تُنشئ مكونات React/TSX جميلة باستخدام Tailwind CSS وshadcn/ui. صمم واجهات عصرية وجذابة.",
            allowed_tools: ["generate_code", "manage_page", "manage_theme"],
            allowed_tables: ["dynamic_pages", "app_settings"],
            icon: "zap", color: "#ec4899",
          },
          content: {
            name: "Content Worker", name_ar: "مساعد المحتوى",
            system_prompt: "أنت كاتب محتوى محترف. تكتب نصوصاً تسويقية وتعليمية بالعربية والفرنسية. أنشئ محتوى جذاباً ومقنعاً.",
            allowed_tools: ["manage_page", "manage_social_content", "db_select"],
            allowed_tables: ["dynamic_pages", "social_media_posts", "stores"],
            icon: "brain", color: "#8b5cf6",
          },
          data: {
            name: "Data Worker", name_ar: "مساعد البيانات",
            system_prompt: "أنت محلل بيانات متخصص. تقرأ البيانات وتنشئ سجلات جديدة وتعدّل الموجودة بدقة.",
            allowed_tools: ["db_select", "db_insert", "db_update", "db_count", "db_stats"],
            allowed_tables: ALLOWED_TABLES,
            icon: "bar-chart-3", color: "#10b981",
          },
          code: {
            name: "Code Worker", name_ar: "مساعد البرمجة",
            system_prompt: "أنت مبرمج Full-Stack متخصص في React/TypeScript/Tailwind/Supabase. اكتب كوداً نظيفاً وقابلاً للصيانة.",
            allowed_tools: ["generate_code", "generate_deployment_package", "db_select"],
            allowed_tables: ALLOWED_TABLES,
            icon: "zap", color: "#f97316",
          },
          analysis: {
            name: "Analysis Worker", name_ar: "مساعد التحليل",
            system_prompt: "أنت محلل أعمال متخصص. تحلل البيانات وتستخرج رؤى وتوصيات.",
            allowed_tools: ["db_select", "db_count", "db_stats", "fetch_webpage"],
            allowed_tables: ALLOWED_TABLES,
            icon: "bar-chart-3", color: "#3b82f6",
          },
          communication: {
            name: "Communication Worker", name_ar: "مساعد التواصل",
            system_prompt: "أنت مسؤول تواصل. ترسل إشعارات وتدير المحتوى التسويقي.",
            allowed_tools: ["bulk_notify", "manage_social_content", "db_select"],
            allowed_tables: ["notifications", "social_media_posts", "profiles"],
            icon: "bell", color: "#14b8a6",
          },
        };

        // 3. Determine sub-tasks (use provided or auto-generate)
        let subTasks = args.sub_tasks;
        if (!subTasks?.length) {
          // Auto-generate sub-tasks using AI
          const planResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: `أنت مخطط مهام. حلل المهمة التالية وقسمها إلى 2-5 مهام فرعية. أجب فقط بتنسيق JSON.` },
                { role: "user", content: `المهمة: ${taskDesc}\n\nقسمها إلى مهام فرعية بالتنسيق:\n[{"title":"...","description":"...","type":"design|content|data|code|analysis|communication","priority":"high|medium|low"}]` },
              ],
              tools: [{
                type: "function",
                function: {
                  name: "plan_tasks",
                  description: "Return task breakdown",
                  parameters: {
                    type: "object",
                    properties: {
                      tasks: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string" },
                            description: { type: "string" },
                            type: { type: "string", enum: ["design", "content", "data", "code", "analysis", "communication"] },
                            priority: { type: "string", enum: ["high", "medium", "low"] },
                          },
                          required: ["title", "description", "type"],
                        },
                      },
                    },
                    required: ["tasks"],
                  },
                },
              }],
              tool_choice: { type: "function", function: { name: "plan_tasks" } },
            }),
          });

          if (planResponse.ok) {
            const planResult = await planResponse.json();
            const toolCall = planResult.choices?.[0]?.message?.tool_calls?.[0];
            if (toolCall) {
              const planArgs = typeof toolCall.function.arguments === "string" ? JSON.parse(toolCall.function.arguments) : toolCall.function.arguments;
              subTasks = planArgs.tasks || [];
            }
          }
          if (!subTasks?.length) {
            subTasks = [{ title: taskDesc, description: taskDesc, type: "code", priority: "high" }];
          }
        }

        // 4. Match or create sub-assistants for each sub-task
        const assignments: { task: any; assistant: any; created: boolean }[] = [];

        for (const st of subTasks) {
          // Try to find an existing assistant matching the type
          const typeMap: Record<string, string[]> = {
            design: ["design", "ui", "frontend"],
            content: ["content", "marketing", "communications"],
            data: ["data", "reports", "analytics"],
            code: ["code", "development", "general"],
            analysis: ["analysis", "reports"],
            communication: ["communications", "notifications"],
          };
          const matchTypes = typeMap[st.type] || [st.type];
          let matched = activeAssistants.find((a: any) => matchTypes.includes(a.assistant_type));

          if (!matched && autoCreate) {
            // Create a temporary sub-assistant
            const config = SUB_TASK_CONFIGS[st.type] || SUB_TASK_CONFIGS.code;
            const { data: newAst, error: createErr } = await supabase.from("sub_assistants").insert({
              ...config,
              assistant_type: st.type,
              is_active: true,
            }).select().single();
            if (!createErr && newAst) {
              matched = newAst;
              assignments.push({ task: st, assistant: newAst, created: true });
              continue;
            }
          }
          assignments.push({ task: st, assistant: matched, created: false });
        }

        // 5. Execute delegations
        const executeOne = async (assignment: any) => {
          if (!assignment.assistant) {
            return { task: assignment.task.title, status: "skipped", reason: "لا يوجد مساعد متاح" };
          }
          try {
            const result = await executeTool(supabase, "delegate_to_assistant", {
              assistant_id: assignment.assistant.id,
              task: `${assignment.task.title}: ${assignment.task.description}`,
              context: `جزء من مهمة أكبر: ${taskDesc}`,
            });
            return { task: assignment.task.title, status: "completed", assistant: assignment.assistant.name_ar, result: JSON.parse(result) };
          } catch (e: any) {
            return { task: assignment.task.title, status: "failed", error: e.message };
          }
        };

        let results;
        if (parallel) {
          results = await Promise.all(assignments.map(executeOne));
        } else {
          results = [];
          for (const a of assignments) {
            results.push(await executeOne(a));
          }
        }

        // 6. Log the orchestration
        await supabase.from("assistant_activity_log").insert({
          action_type: "orchestration",
          title: `تنسيق مهمة: ${taskDesc.slice(0, 100)}`,
          details: `تم تقسيم المهمة إلى ${subTasks.length} مهمة فرعية وتنفيذها ${parallel ? "بالتوازي" : "بالتسلسل"}`,
          metadata: { task: taskDesc, sub_tasks: subTasks, results: results.map((r: any) => ({ task: r.task, status: r.status })) },
        });

        const completed = results.filter((r: any) => r.status === "completed").length;
        const failed = results.filter((r: any) => r.status === "failed").length;
        const created = assignments.filter(a => a.created).length;

        return JSON.stringify({
          success: true,
          task: taskDesc,
          total_sub_tasks: subTasks.length,
          completed,
          failed,
          assistants_created: created,
          execution_mode: parallel ? "parallel" : "sequential",
          results,
          message: `🚀 تم تنسيق المهمة "${taskDesc.slice(0, 50)}..."\n✅ ${completed}/${subTasks.length} مهمة فرعية مكتملة\n${created > 0 ? `🤖 تم إنشاء ${created} مساعد فرعي جديد\n` : ""}${failed > 0 ? `❌ ${failed} مهمة فشلت` : ""}`,
        });
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (e: any) {
    return JSON.stringify({ error: e.message || "Tool execution failed" });
  }
}

async function authenticateAdmin(req: Request): Promise<{ userId: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    console.warn("[AUTH] Missing or malformed Authorization header");
    throw new HttpError(401, "unauthorized: missing token");
  }

  const token = authHeader.replace("Bearer ", "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new HttpError(500, "backend_not_configured");
  }

  // Create a client scoped to the caller's JWT to verify identity
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data?.user) {
    console.warn("[AUTH] Invalid JWT:", error?.message);
    throw new HttpError(401, "unauthorized: invalid token");
  }

  const userId = data.user.id;

  // Use service role to check admin role (bypasses RLS on user_roles)
  const adminClient = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data: roles, error: rolesError } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin");

  if (rolesError || !roles?.length) {
    console.warn(`[AUTH] User ${userId} denied: not admin. Roles query error: ${rolesError?.message}`);
    throw new HttpError(403, "forbidden: admin role required");
  }

  console.log(`[AUTH] Admin authenticated: ${userId} (${data.user.email})`);
  return { userId };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 1. Rate limit
    await enforceRateLimit(req, "admin-ai-agent", 20, 60);

    // 2. CRITICAL: Authenticate and verify admin role
    const { userId: adminUserId } = await authenticateAdmin(req);

    // 3. Parse and validate request body
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const systemPrompt = `أنت المساعد الذكي والمطور التلقائي للمسؤول في منصة HN Driver.
المسؤول الحالي: ${adminUserId}

## 🔧 هويتك:
أنت مطور Full-Stack متخصص يعمل كمساعد تنفيذي للمدير. تفهم وتكتب الكود بجميع اللغات المستخدمة في المشروع.

## 📐 التقنيات المستخدمة في المشروع:
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Framer Motion
- **Backend**: Supabase (PostgreSQL + Edge Functions + Auth + Storage)
- **Routing**: React Router v6
- **State**: React Query (TanStack Query) + React Context
- **UI Components**: shadcn/ui (Button, Card, Dialog, Table, etc.)
- **Styling**: Tailwind CSS with design tokens from index.css
- **i18n**: نظام ترجمة مخصص (ar, fr, en, es)
- **Mobile**: Capacitor (Android/iOS) + PWA
- **Desktop**: Electron

## 💻 قدراتك البرمجية:
- **إنشاء مكونات React/TSX**: صفحات، مكونات، hooks، contexts
- **تعديل CSS/Tailwind**: أنماط، ثيمات، تصميم متجاوب
- **كتابة SQL**: استعلامات، migrations، triggers، RLS policies
- **إنشاء Edge Functions**: Deno/TypeScript للخلفية
- **تعديل HTML**: صفحات ثابتة، قوالب
- **إدارة JSON**: إعدادات، بيانات، ترجمات

## 📋 آلية العمل:
1. المدير يرسل تعليمات (نص + ملفات اختيارية)
2. أنت تقرأ التعليمات وتحلل المحتوى المعروض في صفحة 1
3. تولّد الكود المناسب باستخدام أداة generate_code
4. الكود يُحفظ محلياً (لا يُنشر تلقائياً)
5. المدير يراجع ويقرر النشر يدوياً

## 🛠️ أدوات التطوير:
- **generate_code**: لإنشاء أو تعديل ملفات الكود (TSX, CSS, SQL, HTML, JSON)
- **generate_deployment_package**: لتجميع كل التغييرات المعلقة في حزمة واحدة للنشر
- **manage_page**: لإنشاء صفحات ديناميكية (محتوى مرن عبر JSON blocks)
- **manage_theme**: لتعديل الهوية البصرية
- **fetch_webpage**: لقراءة وتحليل المواقع
- **create_store_with_page**: ✨ أداة سحرية لإنشاء مطعم/متجر كامل بخطوة واحدة!
- **delegate_to_assistant**: 🤖 تفويض مهمة لمساعد فرعي متخصص
- **manage_sub_assistants**: إنشاء/حذف/تعديل المساعدين الفرعيين
- **orchestrate_task**: 🚀 الأداة الأقوى! تحلل المهمة المعقدة وتقسمها تلقائياً لمهام فرعية، تُنشئ مساعدين متخصصين إذا لزم الأمر، وتنفذ كل شيء بالتوازي لتسريع العمل.

## 🤖 نظام المساعدين الفرعيين (التنسيق التلقائي):
أنت المساعد الرئيسي (المنسق). لديك فريق من المساعدين الفرعيين المتخصصين:
- عند استلام مهمة معقدة (مثل إنشاء صفحة، تصميم واجهة، تحليل شامل)، استخدم **orchestrate_task** مباشرة
- الأداة ستقسم المهمة تلقائياً وتنشئ مساعدين متخصصين وتوزع العمل بينهم بالتوازي
- للمهام البسيطة، استخدم delegate_to_assistant مباشرة أو نفّذها بنفسك
- يمكنك أيضاً إنشاء مساعدين جدد يدوياً عبر manage_sub_assistants
- المساعدون المُنشأون تلقائياً يبقون متاحين للمهام المستقبلية

## 📝 قواعد كتابة الكود:
- استخدم TypeScript strict mode
- استخدم design tokens من Tailwind (لا ألوان مباشرة)
- استخدم shadcn/ui components
- أضف التعليقات بالعربية
- اتبع بنية المشروع: src/pages/, src/components/, src/hooks/, src/lib/
- استخدم imports مطلقة (@/components/..., @/lib/..., @/hooks/...)
- كل ملف يجب أن يكون قابلاً للنسخ مباشرة إلى المشروع

## صلاحياتك الإدارية:
- قراءة وتعديل جميع الجداول المتاحة
- تعديل إعدادات المنصة والهوية البصرية
- إرسال إشعارات جماعية
- إدارة العمولات والمناطق والمتاجر
- إنشاء صفحات ديناميكية ومحتوى تواصل اجتماعي
- قراءة وتحليل صفحات الويب

## ⛔ ممنوع تماماً:
- لا يمكنك إدارة المستخدمين أو تعديل الأدوار (user_roles)
- لا يمكنك إنشاء حسابات جديدة أو حذف حسابات
- لا تحذف بيانات بدون تأكيد صريح
- لا تحذف أكثر من 10 سجلات في عملية واحدة
- أجب دائماً بالعربية مع كتابة الكود بالإنجليزية
- قدّم نتائج بتنسيق Markdown

## الجداول المتاحة:
profiles, drivers, vehicles, ride_requests, trips, delivery_orders, order_items, stores, menu_categories, menu_items, earnings, payments, wallet, notifications, alerts, complaints, tickets, call_center, call_logs, promotions, documents, zones, app_settings, import_logs, chat_conversations, chat_messages, trip_status_history, ride_messages, commission_rates, assistant_knowledge_entries, assistant_recommendations, assistant_issue_patterns, assistant_campaign_ideas, assistant_activity_log, product_images, platform_languages, platform_translations, dynamic_pages, social_media_posts, smart_assistant_commands`;

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
          console.log(`[TOOL] Admin=${adminUserId} Tool=${tc.function.name} Args=${JSON.stringify(fnArgs).slice(0, 300)}`);
          const toolResult = await executeTool(supabase, tc.function.name, fnArgs);
          console.log(`[TOOL] Result: ${toolResult.slice(0, 500)}`);
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
    console.error("[ERROR] admin-ai-agent:", error);
    return handleError(error);
  }
});
