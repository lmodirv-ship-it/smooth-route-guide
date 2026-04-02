import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_CLIENT_ID = "AetPmdLcTL5KAJx6hYvo6K2NtAvaevJ2vTn0jxdc1hOE6X7pCmP6jMK3hrgSEUqN5xviMWUPTRe7uGqG";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const PAYPAL_SECRET = Deno.env.get("PAYPAL_SECRET_KEY");
    if (!PAYPAL_SECRET) throw new Error("PayPal secret not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { action } = body;

    // Get PayPal access token
    const tokenRes = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error("PayPal auth failed");
    const accessToken = tokenData.access_token;

    if (action === "create-order") {
      const { amount, currency = "USD", description, transactionId } = body;
      
      // Convert MAD to USD approximate (1 MAD ≈ 0.10 USD)
      const usdAmount = currency === "MAD" ? (amount * 0.10).toFixed(2) : amount.toFixed(2);

      const orderRes = await fetch("https://api-m.sandbox.paypal.com/v2/checkout/orders", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{
            amount: { currency_code: "USD", value: usdAmount },
            description: description || "Payment",
          }],
        }),
      });

      const order = await orderRes.json();
      if (!order.id) throw new Error("Failed to create PayPal order");

      // Update transaction with PayPal order ID
      if (transactionId) {
        await supabase.from("payment_transactions").update({
          paypal_order_id: order.id,
          metadata: { paypal_order_id: order.id, description },
        }).eq("id", transactionId);
      }

      return new Response(JSON.stringify({ orderId: order.id, approveUrl: order.links?.find((l: any) => l.rel === "approve")?.href }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "capture-order") {
      const { orderId, transactionId } = body;

      const captureRes = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`, {
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

        // If wallet topup, credit the wallet
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
