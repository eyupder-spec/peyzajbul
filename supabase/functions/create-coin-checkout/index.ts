import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.peyzajbul.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Coin Package Prices from Environment Variables
const COIN_PACKAGES: Record<string, { coins: number; priceId: string }> = {
  starter: { 
    coins: 50, 
    priceId: Deno.env.get("STRIPE_PRICE_COIN_STARTER") || "price_1TBFMj1xCIRoZJIRQ5ZPTEpw" 
  },
  advantage: { 
    coins: 220, 
    priceId: Deno.env.get("STRIPE_PRICE_COIN_ADVANTAGE") || "price_1TBFNc1xCIRoZJIRW09ivdv3" 
  },
  pro: { 
    coins: 600, 
    priceId: Deno.env.get("STRIPE_PRICE_COIN_PRO") || "price_1TBFOZ1xCIRoZJIRfpt2gjWe" 
  },
  ultra: { 
    coins: 1300, 
    priceId: Deno.env.get("STRIPE_PRICE_COIN_ULTRA") || "price_1TBFPV1xCIRoZJIROmYLZs56" 
  },
};

serve(async (req) => {
  console.log("Request received:", req.method);
  
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

    const { package_id } = await req.json();
    const pkg = COIN_PACKAGES[package_id];
    if (!pkg) throw new Error("Invalid package");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2026-02-25.clover",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: pkg.priceId, quantity: 1 }],
      mode: "payment",
      metadata: {
        firm_user_id: user.id,
        package_id,
        coins: String(pkg.coins),
      },
      success_url: `${req.headers.get("origin")}/firma/jeton?success=true`,
      cancel_url: `${req.headers.get("origin")}/firma/jeton`,
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
