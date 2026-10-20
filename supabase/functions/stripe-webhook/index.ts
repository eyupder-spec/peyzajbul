import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import type { AdminPort, EmailMessage, StripeEventLike, StripePort } from "./handlers.ts";
import { handleWebhookRequest } from "./webhook.ts";

// apiVersion burada sabitlenmez: SDK varsayilani gecerlidir. Yuk sekli Stripe
// panelindeki uc noktanin API surumune baglidir ve handlers.ts iki sekli de okur.
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const admin: AdminPort = {
  async rpc(fn, args) {
    const { data, error } = await supabase.rpc(fn, args);
    return { data, error: error ? { message: error.message } : null };
  },

  // INSERT ... ON CONFLICT DO NOTHING: yalnizca ilk teslimat satir ekler
  async claimEvent(event) {
    const { data: inserted, error: insertError } = await supabase
      .from("stripe_events")
      .upsert(
        { id: event.id, type: event.type, livemode: event.livemode, object_id: event.objectId, status: "processing" },
        { onConflict: "id", ignoreDuplicates: true },
      )
      .select("id");
    if (insertError) throw new Error(`stripe_events insert failed: ${insertError.message}`);
    if (inserted && inserted.length > 0) return { alreadyProcessed: false };

    const { data: existing, error } = await supabase
      .from("stripe_events")
      .select("status, attempts")
      .eq("id", event.id)
      .maybeSingle();
    if (error || !existing) throw new Error(`stripe_events lookup failed: ${error?.message ?? "row missing"}`);
    if (existing.status === "processed") return { alreadyProcessed: true };

    // Daha once alinmis ama tamamlanmamis (failed/processing/needs_review): yeniden dene
    await supabase
      .from("stripe_events")
      .update({ status: "processing", attempts: (existing.attempts ?? 1) + 1 })
      .eq("id", event.id);
    return { alreadyProcessed: false };
  },

  async finishEvent(id, status, detail) {
    const { error } = await supabase
      .from("stripe_events")
      .update({ status, error: detail.error ?? null, processed_at: detail.processedAt })
      .eq("id", id);
    if (error) throw new Error(`stripe_events update failed: ${error.message}`);
  },

  // Stripe komisyon/net tutar bilgisi (mutabakat icin); odeme satirini gunceller
  async recordSettlement(providerObjectId, settlement) {
    const { error } = await supabase
      .from("payments")
      .update({
        fee_minor: settlement.feeMinor,
        net_minor: settlement.netMinor,
        settlement_currency: settlement.currency,
      })
      .eq("provider", "stripe")
      .eq("provider_object_id", providerObjectId);
    if (error) throw new Error(`payments settlement update failed: ${error.message}`);
  },
};

const stripePort: StripePort = {
  retrieveInvoice: async (id) => {
    const invoice = await stripe.invoices.retrieve(id, { expand: ["payments"] });
    return invoice as unknown as Record<string, unknown>;
  },
  retrieveSubscription: async (id) => {
    const subscription = await stripe.subscriptions.retrieve(id);
    return subscription as unknown as Record<string, unknown>;
  },
  retrieveSettlement: async (paymentIntentId) => {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge.balance_transaction"],
    });
    const charge = intent.latest_charge;
    if (!charge || typeof charge === "string") return null;
    const transaction = charge.balance_transaction;
    if (!transaction || typeof transaction === "string") return null;
    return { feeMinor: transaction.fee, netMinor: transaction.net, currency: transaction.currency };
  },
};

async function sendEmail(message: EmailMessage): Promise<void> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Peyzajbul <noreply@peyzajbul.com>",
      to: [message.to],
      subject: message.subject,
      html: message.html,
    }),
  });
}

Deno.serve((req) =>
  handleWebhookRequest(req, {
    admin,
    stripe: stripePort,
    now: () => new Date(),
    sendEmail,
    webhookSecret: Deno.env.get("STRIPE_WEBHOOK_SECRET"),
    verify: async (body, signature, secret) => {
      const event = await stripe.webhooks.constructEventAsync(body, signature, secret, undefined, cryptoProvider);
      return event as unknown as StripeEventLike;
    },
  })
);
