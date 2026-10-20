import { type EventOutcome, processEvent, redact, type StripeEventLike, type WebhookDeps } from "./handlers.ts";

export interface WebhookRequestDeps extends WebhookDeps {
  webhookSecret: string | undefined;
  // Stripe imzasini dogrular (Deno icin SubtleCrypto saglayicisi ile) ve olayi dondurur
  verify(body: string, signature: string, secret: string): Promise<StripeEventLike>;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" }, status });
}

function errorText(error: unknown): string {
  return redact(error instanceof Error ? error.message : String(error)).slice(0, 500);
}

// HTTP kabugu: imza -> tekrar korumasi -> isleme -> stripe_events durumu.
// Gecici hatalarda 500 doner (Stripe yeniden dener); duzeltilemeyen durumlar
// (eslesmeyen firma/odeme) needs_review olarak kaydedilir ve 200 doner.
export async function handleWebhookRequest(req: Request, deps: WebhookRequestDeps): Promise<Response> {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return json({ error: "Missing stripe-signature" }, 400);
  }

  if (!deps.webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set. Webhook cannot be verified.");
    return json({ error: "Configuration Error" }, 500);
  }

  const body = await req.text();

  let event: StripeEventLike;
  try {
    event = await deps.verify(body, signature, deps.webhookSecret);
  } catch (error) {
    console.error(`Invalid signature: ${errorText(error)}`);
    return json({ error: "Invalid signature" }, 400);
  }

  try {
    const objectId = typeof event.data.object.id === "string" ? event.data.object.id : null;
    const { alreadyProcessed } = await deps.admin.claimEvent({
      id: event.id,
      type: event.type,
      livemode: event.livemode,
      objectId,
    });
    if (alreadyProcessed) {
      return json({ received: true, duplicate: true }, 200);
    }
  } catch (error) {
    console.error("[money][FAILED]", event.id, event.type, errorText(error));
    return json({ error: "Event could not be recorded" }, 500);
  }

  let outcome: EventOutcome;
  try {
    outcome = await processEvent(event, deps);
  } catch (error) {
    const message = errorText(error);
    console.error("[money][FAILED]", event.id, event.type, message);
    try {
      await deps.admin.finishEvent(event.id, "failed", { error: message, processedAt: deps.now().toISOString() });
    } catch (finishError) {
      console.error("[money][FAILED]", event.id, "status update failed:", errorText(finishError));
    }
    return json({ error: "Event processing failed" }, 500);
  }

  if (outcome.status === "needs_review") {
    console.error("[money][UNMATCHED]", event.id, event.type, outcome.reason ?? "");
  }

  try {
    await deps.admin.finishEvent(event.id, outcome.status, {
      error: outcome.status === "needs_review" ? outcome.reason : undefined,
      processedAt: deps.now().toISOString(),
    });
  } catch (error) {
    // Isleme tamamlandi; durum yazilamadiysa Stripe yeniden denesin (handler'lar tekrar guvenlidir)
    console.error("[money][FAILED]", event.id, "status update failed:", errorText(error));
    return json({ error: "Event status could not be saved" }, 500);
  }

  return json({ received: true }, 200);
}
