import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Monthly: $15, Yearly: $150
// NOTE: These should be real Price IDs from Stripe Dashboard
const PLANS: Record<string, { priceId: string; planType: string }> = {
  monthly: { priceId: "price_1TAI8L1hkDypIvi1Ka6gUZDF", planType: "monthly" },
  yearly: { priceId: "price_1TAI8f1hkDypIvi1r8S8cXpu", planType: "yearly" },
};

serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  console.log("Request received. Auth Header present:", !!authHeader);
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { plan } = await req.json(); // 'monthly' or 'yearly'
    const selectedPlan = PLANS[plan];
    if (!selectedPlan) throw new Error("Invalid plan selected");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // 1. Find or create customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = customers.data.length > 0 ? customers.data[0].id : null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    // 2. Create Checkout Session for Subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: selectedPlan.priceId, quantity: 1 }],
      mode: "subscription",
      allow_promotion_codes: true,
      metadata: {
        firm_user_id: user.id,
        plan: selectedPlan.planType,
      },
      success_url: `${req.headers.get("origin")}/firma/premium?success=true`,
      cancel_url: `${req.headers.get("origin")}/firma/premium`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
