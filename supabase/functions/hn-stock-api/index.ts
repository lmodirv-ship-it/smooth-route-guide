import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function getDb() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface AuthContext {
  userId: string;
  isAdmin: boolean;
  isAgent: boolean;
  merchantId: string | null;
}

async function authenticate(req: Request): Promise<AuthContext | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "unauthorized" }, 401);
  }

  const token = authHeader.replace("Bearer ", "");
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claims, error } = await userClient.auth.getClaims(token);
  if (error || !claims?.claims?.sub) {
    return json({ error: "unauthorized" }, 401);
  }
  const userId = claims.claims.sub as string;

  const admin = getDb();
  const [{ data: roles }, { data: merchant }] = await Promise.all([
    admin.from("user_roles").select("role").eq("user_id", userId),
    admin.from("hn_stock_merchants").select("id").eq("user_id", userId).maybeSingle(),
  ]);

  const roleSet = new Set((roles || []).map((r: any) => r.role));
  return {
    userId,
    isAdmin: roleSet.has("admin"),
    isAgent: roleSet.has("agent"),
    merchantId: (merchant as any)?.id ?? null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await authenticate(req);
    if (auth instanceof Response) return auth;

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const db = getDb();

    // ── STATS (admin/agent only) ──
    if (action === "stats") {
      if (!auth.isAdmin && !auth.isAgent) {
        return json({ error: "forbidden" }, 403);
      }
      const [products, orders, merchants, shipments] = await Promise.all([
        db.from("hn_stock_products").select("id", { count: "exact", head: true }),
        db.from("hn_stock_orders").select("id, status, total_amount"),
        db.from("hn_stock_merchants").select("id", { count: "exact", head: true }),
        db.from("hn_stock_shipments").select("id, status"),
      ]);

      const orderData = orders.data || [];
      const shipmentData = shipments.data || [];

      return json({
        products: products.count || 0,
        orders: orders.count || orderData.length,
        pendingOrders: orderData.filter((o: any) => o.status === "pending").length,
        merchants: merchants.count || 0,
        totalShipments: shipmentData.length,
        activeShipments: shipmentData.filter((s: any) => !["delivered", "failed", "returned"].includes(s.status)).length,
        totalRevenue: orderData.reduce((s: number, o: any) => s + (Number(o.total_amount) || 0), 0),
      });
    }

    // ── CREATE ORDER ──
    if (action === "create_order" && req.method === "POST") {
      const body = await req.json();
      const { merchant_id, customer_name, customer_phone, customer_address, customer_city, payment_method, items, notes } = body;

      if (!merchant_id || !customer_name || !items?.length) {
        return json({ error: "missing_required_fields" }, 400);
      }

      // Authorization: admin/agent OR merchant operating on own record
      if (!auth.isAdmin && !auth.isAgent && auth.merchantId !== merchant_id) {
        return json({ error: "forbidden" }, 403);
      }

      // Fetch products and verify they belong to this merchant
      const productIds = items.map((i: any) => i.product_id);
      const { data: products } = await db
        .from("hn_stock_products")
        .select("id, name, price, quantity, merchant_id")
        .in("id", productIds);
      const productMap = new Map((products || []).map((p: any) => [p.id, p]));

      let totalAmount = 0;
      const orderItems: any[] = [];

      for (const item of items) {
        const product: any = productMap.get(item.product_id);
        if (!product) return json({ error: `product_not_found: ${item.product_id}` }, 400);
        if (product.merchant_id && product.merchant_id !== merchant_id) {
          return json({ error: "product_merchant_mismatch" }, 403);
        }
        if (product.quantity < item.quantity) return json({ error: `insufficient_stock: ${product.name}` }, 400);
        if (!Number.isFinite(item.quantity) || item.quantity <= 0 || item.quantity > 1000) {
          return json({ error: "invalid_quantity" }, 400);
        }
        totalAmount += product.price * item.quantity;
        orderItems.push({ product_id: item.product_id, name: product.name, quantity: item.quantity, price: product.price });
      }

      const orderNumber = "ORD-" + Date.now().toString(36).toUpperCase();

      const { data: order, error: oErr } = await db.from("hn_stock_orders").insert({
        merchant_id, order_number: orderNumber,
        customer_name, customer_phone, customer_address, customer_city,
        payment_method: payment_method || "cod",
        items: orderItems, total_amount: totalAmount, status: "pending",
      }).select().single();

      if (oErr) return json({ error: oErr.message }, 500);

      // Decrement stock
      for (const item of items) {
        const product: any = productMap.get(item.product_id)!;
        await db.from("hn_stock_products").update({ quantity: product.quantity - item.quantity }).eq("id", item.product_id);
      }

      await db.from("hn_stock_activity").insert({
        type: "order", title: "طلب جديد",
        description: `طلب ${orderNumber} — ${customer_name} — ${totalAmount.toFixed(2)} MAD`,
      });

      return json({ order });
    }

    // ── CREATE SHIPMENT ──
    if (action === "create_shipment" && req.method === "POST") {
      const { order_id, driver_id } = await req.json();
      if (!order_id) return json({ error: "order_id_required" }, 400);

      const { data: order } = await db.from("hn_stock_orders").select("*").eq("id", order_id).single();
      if (!order) return json({ error: "order_not_found" }, 404);

      // Authorization
      if (!auth.isAdmin && !auth.isAgent && auth.merchantId !== order.merchant_id) {
        return json({ error: "forbidden" }, 403);
      }

      const trackingNumber = "SHP-" + Date.now().toString(36).toUpperCase();

      const { data: shipment, error } = await db.from("hn_stock_shipments").insert({
        order_id, driver_id: driver_id || null,
        merchant_id: order.merchant_id,
        tracking_number: trackingNumber,
        delivery_address: order.customer_address,
        delivery_city: order.customer_city,
        delivery_phone: order.customer_phone,
        recipient_name: order.customer_name,
        is_cod: order.payment_method === "cod",
        cod_amount: order.payment_method === "cod" ? order.total_amount : 0,
        status: "preparing",
      }).select().single();

      if (error) return json({ error: error.message }, 500);

      await db.from("hn_stock_orders").update({ status: "processing" }).eq("id", order_id);

      return json({ shipment });
    }

    // ── UPDATE SHIPMENT STATUS ──
    if (action === "update_shipment" && req.method === "POST") {
      const { shipment_id, status } = await req.json();
      if (!shipment_id || !status) return json({ error: "missing_fields" }, 400);

      const ALLOWED_STATUSES = new Set([
        "preparing", "ready", "picked_up", "in_transit", "out_for_delivery",
        "delivered", "failed", "returned", "cancelled",
      ]);
      if (!ALLOWED_STATUSES.has(status)) {
        return json({ error: "invalid_status" }, 400);
      }

      const { data: existing } = await db.from("hn_stock_shipments").select("merchant_id").eq("id", shipment_id).single();
      if (!existing) return json({ error: "shipment_not_found" }, 404);

      if (!auth.isAdmin && !auth.isAgent && auth.merchantId !== existing.merchant_id) {
        return json({ error: "forbidden" }, 403);
      }

      const updates: any = { status };
      if (status === "delivered") updates.delivered_at = new Date().toISOString();

      const { data: shipment, error } = await db.from("hn_stock_shipments").update(updates).eq("id", shipment_id).select().single();
      if (error) return json({ error: error.message }, 500);

      if (status === "delivered" && shipment.order_id) {
        await db.from("hn_stock_orders").update({ status: "delivered" }).eq("id", shipment.order_id);
        if (shipment.is_cod && shipment.cod_amount > 0) {
          await db.from("hn_stock_transactions").insert({
            type: "cod_collection", amount: shipment.cod_amount,
            status: "completed", reference: shipment.tracking_number,
            description: `تحصيل COD — ${shipment.recipient_name}`,
            order_id: shipment.order_id, merchant_id: shipment.merchant_id,
          });
        }
      }

      return json({ shipment });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "unknown_error" }, 500);
  }
});
