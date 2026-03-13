// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

serve(async (req) => {
  console.log("Stripe Webhook request received");
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature" }), { status: 400 });
  }

  const body = await req.text();
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set. Webhook cannot be verified.");
    return new Response(JSON.stringify({ error: "Configuration Error" }), { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    const error = err as Error;
    console.error(`Invalid signature: ${error.message}`);
    return new Response(JSON.stringify({ error: `Webhook Error: ${error.message}` }), { status: 400 });
  }

  console.log(`Event received: ${event.type}`);

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { firm_user_id, package_id, coins, plan } = session.metadata || {};

    // 1. Handle COIN Purchases (Existing logic)
    if (firm_user_id && coins) {
      const { data: existingTx } = await supabaseAdmin
        .from("coin_transactions")
        .select("id")
        .eq("stripe_session_id", session.id)
        .maybeSingle();

      if (existingTx) return new Response(JSON.stringify({ received: true }), { status: 200 });

      const coinAmount = parseInt(coins, 10);
      const { data: firm } = await supabaseAdmin
        .from("firms")
        .select("id, coin_balance")
        .eq("user_id", firm_user_id)
        .single();

      if (firm) {
        await supabaseAdmin.from("firms")
          .update({ coin_balance: firm.coin_balance + coinAmount })
          .eq("id", firm.id);

        await supabaseAdmin.from("coin_transactions").insert({
          firm_id: firm.id,
          type: "purchase",
          amount: coinAmount,
          description: `${package_id} paketi - ${coinAmount} jeton`,
          stripe_session_id: session.id,
        });
      }
    }

    // 2. Handle PREMIUM Subscription activation
    if (firm_user_id && plan) {
      const premiumUntil = new Date();
      if (plan === "yearly") premiumUntil.setFullYear(premiumUntil.getFullYear() + 1);
      else premiumUntil.setMonth(premiumUntil.getMonth() + 1);

      await supabaseAdmin.from("firms")
        .update({
          is_premium: true,
          premium_until: premiumUntil.toISOString(),
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          subscription_plan: plan,
        })
        .eq("user_id", firm_user_id);
      
      console.log(`Premium activated for user ${firm_user_id} (${plan})`);
    }
  }

  // 3. Handle Subscription Cancellation / Expiration
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    await supabaseAdmin.from("firms")
      .update({
        is_premium: false,
        premium_until: null,
        stripe_subscription_id: null,
        subscription_plan: null,
      })
      .eq("stripe_subscription_id", subscription.id);
    
    console.log(`Subscription deleted: ${subscription.id}`);
  }

  // 4. Handle Recurring Payments (Invoice Paid)
  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
      const plan = subscription.metadata.plan;
      
      const premiumUntil = new Date();
      if (plan === "yearly") premiumUntil.setFullYear(premiumUntil.getFullYear() + 1);
      else premiumUntil.setMonth(premiumUntil.getMonth() + 1);

      await supabaseAdmin.from("firms")
        .update({
          is_premium: true,
          premium_until: premiumUntil.toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);
      
      console.log(`Subscription renewed: ${subscription.id}`);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
