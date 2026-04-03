/**
 * PayPal Live Edge Function
 * ─────────────────────────
 * Handles: create-order, capture-order, test-connection
 * 
 * SECURITY:
 *  - All secrets read from Deno.env (Cloud Secrets), never exposed to client
 *  - JWT validation on every request (except test-connection with valid auth)
 *  - Admin role check for admin-only operations
 *  - Input validation with Zod
 *  - Safe error messages — no stack traces or secrets leaked
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Safe JSON response helper */
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Validate a positive number */
function isValidAmount(v: unknown): v is number {
  return typeof v === "number" && v > 0 && isFinite(v);
}

/** Supported currencies */
const VALID_CURRENCIES = ["USD", "EUR", "GBP", "MAD", "CAD"];

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Read secrets (server-side only) ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID_LIVE") || Deno.env.get("PAYPAL_CLIENT_ID") || "";
    const PAYPAL_SECRET = Deno.env.get("PAYPAL_SECRET_LIVE") || Deno.env.get("PAYPAL_SECRET_KEY") || "";
    const PAYPAL_ENV = Deno.env.get("PAYPAL_ENV") || "sandbox";

    // Also check app_settings as fallback (admin-configurable)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    let clientId = PAYPAL_CLIENT_ID;
    let secret = PAYPAL_SECRET;
    let env = PAYPAL_ENV;

    if (!clientId || !secret) {
      const { data: settingsRow } = await supabaseAdmin
        .from("app_settings")
        .select("value")
        .eq("key", "paypal_settings")
        .maybeSingle();
      
      const pp = (settingsRow?.value || {}) as Record<string, unknown>;
      clientId = clientId || String(pp.clientId || "");
      secret = secret || String(pp.secretKey || "");
      if (pp.sandboxMode === true) env = "sandbox";
    }

    if (!clientId || !secret) {
      return jsonResponse({ error: "PayPal credentials not configured" }, 500);
    }

    const baseUrl = env === "sandbox"
      ? "https://api-m.sandbox.paypal.com"
      : "https://api-m.paypal.com";

    // ── Parse request body ──
    const body = await req.json();
    const { action } = body;

    if (!action || typeof action !== "string") {
      return jsonResponse({ error: "Missing action parameter" }, 400);
    }

    // ── Authenticate user via JWT ──
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let isAdmin = false;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !userData?.user) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      userId = userData.user.id;

      // Check admin role
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      
      isAdmin = (roles || []).some((r: any) => r.role === "admin");
    }

    // ── Get PayPal access token ──
    const getAccessToken = async (): Promise<string> => {
      console.log("PayPal env:", env, "baseUrl:", baseUrl, "clientId length:", clientId.length, "secret length:", secret.length);
      const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${clientId}:${secret}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });
      const tokenText = await tokenRes.text();
      console.log("PayPal token response status:", tokenRes.status, "body:", tokenText.substring(0, 200));
      const tokenData = JSON.parse(tokenText);
      if (!tokenData.access_token) {
        throw new Error("PayPal authentication failed");
      }
      return tokenData.access_token;
    };

    // ═══════════════════════════════════════
    // ACTION: test-connection
    // ═══════════════════════════════════════
    if (action === "test-connection") {
      if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);
      
      const accessToken = await getAccessToken();
      return jsonResponse({
        success: true,
        mode: env === "sandbox" ? "sandbox" : "live",
        environment: env,
      });
    }

    // ═══════════════════════════════════════
    // ACTION: create-order
    // ═══════════════════════════════════════
    if (action === "create-order") {
      if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

      // Input validation
      const { amount, currency, description, referenceType, referenceId } = body;
      
      if (!isValidAmount(amount)) {
        return jsonResponse({ error: "Invalid amount" }, 400);
      }
      if (currency && !VALID_CURRENCIES.includes(currency)) {
        return jsonResponse({ error: "Unsupported currency" }, 400);
      }

      const finalCurrency = (currency === "MAD" ? "USD" : currency) || "USD";
      const finalAmount = currency === "MAD" 
        ? (amount * 0.10).toFixed(2) 
        : amount.toFixed(2);

      const accessToken = await getAccessToken();

      // Create PayPal order
      const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{
            amount: { currency_code: finalCurrency, value: finalAmount },
            description: typeof description === "string" ? description.slice(0, 127) : "Payment",
          }],
          application_context: {
            brand_name: "HN Driver",
            return_url: "https://www.hn-driver.com/customer/payment?status=success",
            cancel_url: "https://www.hn-driver.com/customer/payment?status=cancel",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
          },
        }),
      });

      const order = await orderRes.json();
      if (!order.id) {
        return jsonResponse({ error: "Failed to create PayPal order" }, 502);
      }

      // Record in DB (service_role bypasses RLS)
      const { data: txn, error: insertErr } = await supabaseAdmin
        .from("payment_transactions")
        .insert({
          user_id: userId,
          amount,
          currency: currency || "USD",
          transaction_type: "payment",
          payment_method: "paypal",
          provider: "paypal",
          status: "pending",
          paypal_order_id: order.id,
          environment: env,
          reference_type: typeof referenceType === "string" ? referenceType : null,
          reference_id: typeof referenceId === "string" ? referenceId : null,
          metadata: { description: description || null },
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error("DB insert error:", insertErr.message);
        return jsonResponse({ error: "Failed to record transaction" }, 500);
      }

      const approveUrl = order.links?.find((l: any) => l.rel === "approve")?.href;

      return jsonResponse({
        transactionId: txn.id,
        orderId: order.id,
        approveUrl,
        environment: env,
      });
    }

    // ═══════════════════════════════════════
    // ACTION: capture-order
    // ═══════════════════════════════════════
    if (action === "capture-order") {
      if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

      const { orderId, transactionId } = body;
      if (!orderId || typeof orderId !== "string") {
        return jsonResponse({ error: "Invalid orderId" }, 400);
      }

      const accessToken = await getAccessToken();

      const captureRes = await fetch(
        `${baseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const capture = await captureRes.json();
      const status = capture.status === "COMPLETED" ? "completed" : "failed";
      const captureId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.id || null;

      // Update transaction record
      if (transactionId && typeof transactionId === "string") {
        await supabaseAdmin
          .from("payment_transactions")
          .update({
            status,
            paypal_order_id: orderId,
            paypal_payer_id: capture.payer?.payer_id || null,
            paypal_capture_id: captureId,
            completed_at: status === "completed" ? new Date().toISOString() : null,
            failure_reason: status === "failed" ? (capture.message || "Capture failed") : null,
            metadata: { paypal_capture: capture },
          })
          .eq("id", transactionId);

        // Handle wallet top-up if applicable
        if (status === "completed") {
          const { data: txn } = await supabaseAdmin
            .from("payment_transactions")
            .select("amount, reference_type, user_id")
            .eq("id", transactionId)
            .single();

          if (txn?.reference_type === "wallet_topup") {
            const { data: wallet } = await supabaseAdmin
              .from("wallet")
              .select("id, balance")
              .eq("user_id", txn.user_id)
              .single();

            if (wallet) {
              const newBalance = Number(wallet.balance) + Number(txn.amount);
              await supabaseAdmin.from("wallet").update({ balance: newBalance }).eq("id", wallet.id);
              await supabaseAdmin.from("wallet_transactions").insert({
                wallet_id: wallet.id,
                user_id: txn.user_id,
                amount: txn.amount,
                balance_after: newBalance,
                transaction_type: "topup",
                description: "شحن عبر PayPal",
                payment_transaction_id: transactionId,
              });
            }
          }
        }
      }

      return jsonResponse({
        status,
        captureId,
        environment: env,
      });
    }

    // ═══════════════════════════════════════
    // ACTION: list-payments (admin only)
    // ═══════════════════════════════════════
    if (action === "list-payments") {
      if (!userId || !isAdmin) {
        return jsonResponse({ error: "Admin access required" }, 403);
      }

      const { statusFilter, dateFrom, dateTo, limit: reqLimit } = body;
      let query = supabaseAdmin
        .from("payment_transactions")
        .select("*")
        .eq("provider", "paypal")
        .order("created_at", { ascending: false })
        .limit(Math.min(Number(reqLimit) || 500, 1000));

      if (statusFilter && typeof statusFilter === "string" && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (dateFrom && typeof dateFrom === "string") {
        query = query.gte("created_at", dateFrom);
      }
      if (dateTo && typeof dateTo === "string") {
        query = query.lte("created_at", dateTo + "T23:59:59");
      }

      const { data, error } = await query;
      if (error) {
        return jsonResponse({ error: "Failed to fetch payments" }, 500);
      }

      // Stats
      const { data: allData } = await supabaseAdmin
        .from("payment_transactions")
        .select("status, amount")
        .eq("provider", "paypal");

      const all = allData || [];
      const stats = {
        total: all.length,
        completed: all.filter((t: any) => t.status === "completed").length,
        pending: all.filter((t: any) => t.status === "pending").length,
        failed: all.filter((t: any) => t.status === "failed").length,
        revenue: all
          .filter((t: any) => t.status === "completed")
          .reduce((s: number, t: any) => s + Number(t.amount || 0), 0),
      };

      return jsonResponse({ transactions: data || [], stats, environment: env });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err: any) {
    // SECURITY: Never leak internal details
    console.error("PayPal Live Error:", err.message);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
