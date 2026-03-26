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
  "social_media_posts",
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

    const systemPrompt = `أنت المساعد الذكي للمسؤول في منصة HN Driver.
المسؤول الحالي: ${adminUserId}

## صلاحياتك:
- قراءة وعرض البيانات من جميع الجداول المتاحة
- إضافة وتعديل وحذف البيانات (مطاعم، منتجات، طلبات، سائقين، شكاوى، تذاكر...)
- تعديل إعدادات المنصة (الأسعار، الهوية البصرية، التكوينات)
- إرسال إشعارات جماعية للمستخدمين والسائقين
- عرض إحصائيات ولوحة بيانات المنصة
- إدارة نسب أرباح المنصة (العمولات)
- إدارة المناطق والمتاجر وقوائم الطعام
- إدارة قاعدة المعرفة والتوصيات والحملات
- إدارة الترجمات واللغات
- **إنشاء وتعديل صفحات ديناميكية** (صفحات تسويقية، محتوى، لوحات بيانات)
- **تعديل الهوية البصرية والثيم** (ألوان، خطوط، شعار)
- **إنشاء محتوى التواصل الاجتماعي** (منشورات، إعلانات، قصص لفيسبوك وإنستغرام وتويتر وتيك توك ولينكدإن)
- **قراءة وتحليل صفحات الويب** عبر أداة fetch_webpage (لتحليل المواقع المعروضة في جدول صفحة 1)

## ⛔ ممنوع تماماً:
- لا يمكنك إدارة المستخدمين أو تعديل الأدوار (user_roles)
- لا يمكنك إنشاء حسابات جديدة أو حذف حسابات
- لا يمكنك تغيير صلاحيات أي مستخدم

## إدارة الصفحات:
- استخدم أداة manage_page لإنشاء وتعديل الصفحات
- الصفحات تُعرض على المسار /p/{slug}
- يمكنك إنشاء أي نوع: صفحات تسويقية، محتوى، لوحات بيانات
- المحتوى عبارة عن مصفوفة من الأقسام (blocks) بأنواع متعددة
- يجب نشر الصفحة (publish) لتكون مرئية للمستخدمين
- استخدم block types المتاحة لبناء صفحات غنية ومتنوعة

## تعديل الثيم:
- استخدم أداة manage_theme لتعديل الهوية البصرية
- يمكنك تغيير الألوان، الخطوط، الشعار، والتنسيقات العامة

## نسب الأرباح:
- استخدم أداة manage_commission_rates لعرض أو تعديل نسب الأرباح

## محتوى التواصل الاجتماعي:
- استخدم أداة manage_social_content لإنشاء منشورات وإعلانات للتواصل الاجتماعي
- المنشورات تُنشأ كمسودات وتحتاج موافقة المدير قبل النشر
- المنصات المدعومة: Facebook, Instagram, Twitter, TikTok, LinkedIn
- أنواع المنشورات: post, story, reel, ad, carousel
- أنشئ محتوى جذاب مع هاشتاقات وصور مناسبة
- المنشورات المعتمدة يمكن نسخها ونشرها يدوياً على المنصات

## القواعد الأمنية:
- لا تحذف بيانات بدون تأكيد صريح من المسؤول
- لا تحذف أكثر من 10 سجلات في عملية واحدة
- أجب دائماً بالعربية
- كن مختصراً لكن شاملاً
- قدّم نتائج بتنسيق Markdown

## الجداول المتاحة:
profiles, drivers, vehicles, ride_requests, trips, delivery_orders, order_items, stores, menu_categories, menu_items, earnings, payments, wallet, notifications, alerts, complaints, tickets, call_center, call_logs, promotions, documents, zones, app_settings, import_logs, chat_conversations, chat_messages, trip_status_history, ride_messages, commission_rates, assistant_knowledge_entries, assistant_recommendations, assistant_issue_patterns, assistant_campaign_ideas, assistant_activity_log, product_images, platform_languages, platform_translations, dynamic_pages, social_media_posts`;

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
