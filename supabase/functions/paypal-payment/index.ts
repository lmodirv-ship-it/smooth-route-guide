import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load PayPal settings from DB (admin-configurable)
    const { data: settingsRow } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "paypal_settings")
      .maybeSingle();

    const ppSettings = (settingsRow?.value || {}) as Record<string, unknown>;
    const PAYPAL_CLIENT_ID = String(ppSettings.clientId || "");
    const PAYPAL_SECRET = String(ppSettings.secretKey || "") || Deno.env.get("PAYPAL_SECRET_KEY") || "";
    const sandboxMode = ppSettings.sandboxMode !== false;
    const configCurrency = String(ppSettings.currency || "USD");
    const brandName = String(ppSettings.brandName || "HN Driver");

    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
      throw new Error("PayPal credentials not configured. Set them in admin settings.");
    }

    const baseUrl = sandboxMode
      ? "https://api-m.sandbox.paypal.com"
      : "https://api-m.paypal.com";

    // Verify user (skip for test-connection from admin)
    const authHeader = req.headers.get("Authorization");
    const body = await req.json();
    const { action } = body;

    // Allow test-connection with auth
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { error: authError } = await supabase.auth.getUser(token);
      if (authError) throw new Error("Unauthorized");
    } else if (action !== "test-connection") {
      throw new Error("No auth");
    }

    // Get PayPal access token
    const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error("PayPal auth failed: " + (tokenData.error_description || "Invalid credentials"));
    const accessToken = tokenData.access_token;

    // Test connection
    if (action === "test-connection") {
      return new Response(JSON.stringify({ success: true, mode: sandboxMode ? "sandbox" : "live" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create-order") {
      const { amount, currency = configCurrency, description, transactionId } = body;

      // Convert MAD to USD approximate (1 MAD ≈ 0.10 USD)
      const finalCurrency = currency === "MAD" ? "USD" : currency;
      const finalAmount = currency === "MAD" ? (amount * 0.10).toFixed(2) : amount.toFixed(2);

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
            description: description || "Payment",
          }],
          application_context: {
            brand_name: brandName,
            ...(ppSettings.returnUrl ? { return_url: String(ppSettings.returnUrl) } : {}),
            ...(ppSettings.cancelUrl ? { cancel_url: String(ppSettings.cancelUrl) } : {}),
          },
        }),
      });

      const order = await orderRes.json();
      if (!order.id) throw new Error("Failed to create PayPal order");

      if (transactionId) {
        await supabase.from("payment_transactions").update({
          paypal_order_id: order.id,
          metadata: { paypal_order_id: order.id, description },
        }).eq("id", transactionId);
      }

      return new Response(JSON.stringify({
        orderId: order.id,
        approveUrl: order.links?.find((l: any) => l.rel === "approve")?.href,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "capture-order") {
      const { orderId, transactionId } = body;

      const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      const capture = await captureRes.json();
      const status = capture.status === "COMPLETED" ? "completed" : "failed";

      if (transactionId) {
        await supabase.from("payment_transactions").update({
          status,
          paypal_order_id: orderId,
          paypal_payer_id: capture.payer?.payer_id || null,
          completed_at: status === "completed" ? new Date().toISOString() : null,
          metadata: { paypal_capture: capture },
        }).eq("id", transactionId);

        if (status === "completed") {
          const { data: txn } = await supabase.from("payment_transactions")
            .select("amount, reference_type, user_id").eq("id", transactionId).single();

          if (txn?.reference_type === "wallet_topup") {
            const { data: wallet } = await supabase.from("wallet")
              .select("id, balance").eq("user_id", txn.user_id).single();

            if (wallet) {
              const newBalance = Number(wallet.balance) + Number(txn.amount);
              await supabase.from("wallet").update({ balance: newBalance }).eq("id", wallet.id);
              await supabase.from("wallet_transactions").insert({
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

      return new Response(JSON.stringify({ status, capture }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
