import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, HttpError, handleError, jsonResponse, parseJson, z } from "../_shared/security.ts";

const supabase = () => createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

// ── Schemas ──
const CreateOrderSchema = z.object({
  merchant_id: z.string().uuid(),
  customer_name: z.string().min(1).max(200),
  customer_phone: z.string().min(5).max(20),
  customer_address: z.string().min(1).max(500),
  customer_city: z.string().min(1).max(100),
  payment_method: z.enum(["cod", "prepaid"]).default("cod"),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
  notes: z.string().max(500).optional(),
});

const CreateShipmentSchema = z.object({
  order_id: z.string().uuid(),
  driver_id: z.string().uuid().optional(),
});

const UpdateShipmentSchema = z.object({
  shipment_id: z.string().uuid(),
  status: z.enum(["preparing", "ready_for_pickup", "picked_up", "in_transit", "out_for_delivery", "delivered", "failed", "returned"]),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const db = supabase();

    // ── CREATE ORDER ──
    if (action === "create_order" && req.method === "POST") {
      const body = await parseJson(req, CreateOrderSchema);
      
      // Fetch product prices & check stock
      const productIds = body.items.map(i => i.product_id);
      const { data: products, error: pErr } = await db
        .from("hn_stock_products")
        .select("id, name, price, quantity")
        .in("id", productIds);
      if (pErr) throw new HttpError(500, pErr.message);

      const productMap = new Map(products!.map(p => [p.id, p]));
      let totalAmount = 0;
      const orderItems: any[] = [];

      for (const item of body.items) {
        const product = productMap.get(item.product_id);
        if (!product) throw new HttpError(400, `product_not_found: ${item.product_id}`);
        if (product.quantity < item.quantity) throw new HttpError(400, `insufficient_stock: ${product.name}`);
        totalAmount += product.price * item.quantity;
        orderItems.push({ product_id: item.product_id, name: product.name, quantity: item.quantity, price: product.price });
      }

      // Generate order number
      const orderNumber = "ORD-" + Date.now().toString(36).toUpperCase();

      // Create order
      const { data: order, error: oErr } = await db.from("hn_stock_orders").insert({
        merchant_id: body.merchant_id,
        order_number: orderNumber,
        customer_name: body.customer_name,
        customer_phone: body.customer_phone,
        customer_address: body.customer_address,
        customer_city: body.customer_city,
        payment_method: body.payment_method,
        items: orderItems,
        total_amount: totalAmount,
        status: "pending",
      }).select().single();
      if (oErr) throw new HttpError(500, oErr.message);

      // Decrement stock
      for (const item of body.items) {
        const product = productMap.get(item.product_id)!;
        await db.from("hn_stock_products").update({ quantity: product.quantity - item.quantity }).eq("id", item.product_id);
      }

      // Log activity
      await db.from("hn_stock_activity").insert({
        type: "order",
        title: "طلب جديد",
        description: `طلب ${orderNumber} — ${body.customer_name} — ${totalAmount.toFixed(2)} MAD`,
      });

      return jsonResponse({ order });
    }

    // ── CREATE SHIPMENT FROM ORDER ──
    if (action === "create_shipment" && req.method === "POST") {
      const body = await parseJson(req, CreateShipmentSchema);

      const { data: order, error: oErr } = await db
        .from("hn_stock_orders")
        .select("*")
        .eq("id", body.order_id)
        .single();
      if (oErr || !order) throw new HttpError(404, "order_not_found");

      const trackingNumber = "SHP-" + Date.now().toString(36).toUpperCase();

      const { data: shipment, error: sErr } = await db.from("hn_stock_shipments").insert({
        order_id: body.order_id,
        driver_id: body.driver_id || null,
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
      if (sErr) throw new HttpError(500, sErr.message);

      // Update order status
      await db.from("hn_stock_orders").update({ status: "processing" }).eq("id", body.order_id);

      await db.from("hn_stock_activity").insert({
        type: "shipment",
        title: "شحنة جديدة",
        description: `شحنة ${trackingNumber} للطلب ${order.order_number}`,
      });

      return jsonResponse({ shipment });
    }

    // ── UPDATE SHIPMENT STATUS ──
    if (action === "update_shipment" && req.method === "POST") {
      const body = await parseJson(req, UpdateShipmentSchema);

      const updates: any = { status: body.status };
      if (body.status === "delivered") updates.delivered_at = new Date().toISOString();
      if (["picked_up", "in_transit"].includes(body.status)) updates.shipped_at = new Date().toISOString();

      const { data: shipment, error } = await db
        .from("hn_stock_shipments")
        .update(updates)
        .eq("id", body.shipment_id)
        .select()
        .single();
      if (error) throw new HttpError(500, error.message);

      // If delivered, update order
      if (body.status === "delivered" && shipment.order_id) {
        await db.from("hn_stock_orders").update({ status: "delivered" }).eq("id", shipment.order_id);

        // Create transaction for COD
        if (shipment.is_cod && shipment.cod_amount > 0) {
          await db.from("hn_stock_transactions").insert({
            type: "cod_collection",
            amount: shipment.cod_amount,
            status: "completed",
            reference: shipment.tracking_number,
            description: `تحصيل COD — ${shipment.recipient_name}`,
            order_id: shipment.order_id,
            merchant_id: shipment.merchant_id,
          });
        }
      }

      return jsonResponse({ shipment });
    }

    // ── DASHBOARD STATS ──
    if (action === "stats" && req.method === "GET") {
      const [products, orders, merchants, shipments] = await Promise.all([
        db.from("hn_stock_products").select("id", { count: "exact", head: true }),
        db.from("hn_stock_orders").select("id, status, total_amount"),
        db.from("hn_stock_merchants").select("id", { count: "exact", head: true }),
        db.from("hn_stock_shipments").select("id, status"),
      ]);

      const orderData = orders.data || [];
      const shipmentData = shipments.data || [];

      return jsonResponse({
        products: products.count || 0,
        orders: orders.count || orderData.length,
        pendingOrders: orderData.filter(o => o.status === "pending").length,
        merchants: merchants.count || 0,
        totalShipments: shipmentData.length,
        activeShipments: shipmentData.filter(s => !["delivered", "failed", "returned"].includes(s.status)).length,
        totalRevenue: orderData.reduce((s, o) => s + (Number(o.total_amount) || 0), 0),
      });
    }

    throw new HttpError(400, "unknown_action");
  } catch (err) {
    return handleError(err);
  }
});
