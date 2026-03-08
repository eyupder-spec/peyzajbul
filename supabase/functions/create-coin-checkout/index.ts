import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COIN_PACKAGES: Record<string, { coins: number; priceId: string }> = {
  starter: { coins: 50, priceId: "price_1T8iq71hkDypIvi1dybYwQGr" },
  advantage: { coins: 220, priceId: "price_1T8iqo1hkDypIvi1esb741jp" },
  pro: { coins: 600, priceId: "price_1T8ixK1hkDypIvi1Jg5A28EO" },
  ultra: { coins: 1300, priceId: "price_1T8iyP1hkDypIvi1bnbXgXBT" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
      apiVersion: "2025-08-27.basil",
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
