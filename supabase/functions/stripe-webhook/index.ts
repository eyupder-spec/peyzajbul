import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

serve(async (req) => {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { firm_user_id, package_id, coins } = session.metadata || {};

    if (firm_user_id && coins) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const coinAmount = parseInt(coins, 10);

      // Get firm
      const { data: firm } = await supabaseAdmin
        .from("firms")
        .select("id, coin_balance")
        .eq("user_id", firm_user_id)
        .single();

      if (firm) {
        // Update balance
        await supabaseAdmin
          .from("firms")
          .update({ coin_balance: firm.coin_balance + coinAmount })
          .eq("id", firm.id);

        // Record purchase transaction
        await supabaseAdmin.from("coin_transactions").insert({
          firm_id: firm.id,
          type: "purchase",
          amount: coinAmount,
          description: `${package_id} paketi - ${coinAmount} jeton`,
          stripe_session_id: session.id,
        });
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
