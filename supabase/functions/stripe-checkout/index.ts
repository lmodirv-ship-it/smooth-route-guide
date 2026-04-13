import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getStripeSecretKey } from "../_shared/apiKeys.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = await getStripeSecretKey();
    if (!stripeKey) throw new Error("Stripe not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { amount, currency = "mad", description, referenceType, referenceId, successUrl, cancelUrl } = await req.json();

    if (!amount || amount <= 0) throw new Error("Invalid amount");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16", httpClient: Stripe.createFetchHttpClient() });

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: currency.toLowerCase(),
          product_data: { name: description || "Payment" },
          unit_amount: Math.round(amount * 100), // Convert to cents
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: successUrl || `${req.headers.get("origin")}/customer?payment=success`,
      cancel_url: cancelUrl || `${req.headers.get("origin")}/customer?payment=cancelled`,
      metadata: {
        supabase_user_id: user.id,
        reference_type: referenceType || "",
        reference_id: referenceId || "",
      },
    });

    // Record transaction
    const { data: txn } = await supabase.from("payment_transactions").insert({
      user_id: user.id,
      amount,
      currency: currency.toUpperCase(),
      transaction_type: "payment",
      payment_method: "stripe",
      provider: "stripe",
      status: "pending",
      reference_type: referenceType || null,
      reference_id: referenceId || null,
      metadata: { stripe_session_id: session.id, stripe_customer_id: customerId },
    }).select("id").single();

    return new Response(JSON.stringify({
      sessionId: session.id,
      url: session.url,
      transactionId: txn?.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
