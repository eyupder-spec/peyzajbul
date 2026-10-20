// Stripe olaylari -> para yolu RPC'leri. Saf mantik: tum dis bagimliliklar
// (Supabase, Stripe, saat, e-posta) `deps` ile enjekte edilir, bu yuzden ag
// olmadan test edilebilir. Yuk (payload) sekli, Stripe panelindeki webhook
// uc noktasinin API surumune baglidir; bu nedenle hem eski (invoice.subscription)
// hem yeni "clover" (invoice.parent.subscription_details) sekilleri okunur.

export type EventStatus = "processing" | "processed" | "failed" | "ignored" | "needs_review";
export type FinalStatus = "processed" | "ignored" | "needs_review";

type Obj = Record<string, unknown>;

export interface StripeEventLike {
  id: string;
  type: string;
  livemode: boolean;
  data: { object: Obj };
}

export interface RpcResult {
  data: unknown;
  error: { message: string } | null;
}

export interface Settlement {
  feeMinor: number;
  netMinor: number;
  currency: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export interface AdminPort {
  rpc(fn: string, args: Obj): Promise<RpcResult>;
  claimEvent(event: { id: string; type: string; livemode: boolean; objectId: string | null }): Promise<{ alreadyProcessed: boolean }>;
  finishEvent(id: string, status: EventStatus, detail: { error?: string; processedAt: string }): Promise<void>;
  recordSettlement(providerObjectId: string, settlement: Settlement): Promise<void>;
}

export interface StripePort {
  retrieveInvoice(id: string): Promise<Obj>;
  retrieveSubscription(id: string): Promise<Obj>;
  retrieveSettlement(paymentIntentId: string): Promise<Settlement | null>;
}

export interface WebhookDeps {
  admin: AdminPort;
  stripe: StripePort;
  now: () => Date;
  sendEmail: (message: EmailMessage) => Promise<void>;
}

export interface EventOutcome {
  status: FinalStatus;
  reason?: string;
}

const PAYMENT_FAILED_COPY =
  "Premium aboneliğiniz için ödeme alınamadı. Kartınızı güncellemezseniz üyelik dönem sonunda sona erer.";

// ---------------------------------------------------------------------------
// Kucuk okuyucular (genisletilebilir alanlar string veya {id} nesnesi olabilir)
// ---------------------------------------------------------------------------
function asObj(value: unknown): Obj | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Obj) : null;
}

function asStr(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNum(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function idOf(value: unknown): string | null {
  return asStr(value) ?? asStr(asObj(value)?.id);
}

function httpsUrl(value: unknown): string | null {
  const raw = asStr(value);
  if (!raw) return null;

  try {
    return new URL(raw).protocol === "https:" ? raw : null;
  } catch {
    return null;
  }
}

function isoFromSeconds(value: unknown): string | null {
  const seconds = asNum(value);
  return seconds === null ? null : new Date(seconds * 1000).toISOString();
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Loglarda ve stripe_events.error alaninda kimlik/e-posta gorunmesin
export function redact(text: string): string {
  return text
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "***")
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "***");
}

async function callRpc(deps: WebhookDeps, fn: string, args: Obj): Promise<Obj> {
  const { data, error } = await deps.admin.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return asObj(data) ?? {};
}

// Stripe kesintisi/komisyonu kaydi: odeme akisini asla bozmaz
async function fillSettlement(deps: WebhookDeps, providerObjectId: string | null, paymentIntentId: string | null) {
  if (!providerObjectId || !paymentIntentId) return;
  try {
    const settlement = await deps.stripe.retrieveSettlement(paymentIntentId);
    if (settlement) await deps.admin.recordSettlement(providerObjectId, settlement);
  } catch (error) {
    console.error("[money][SETTLEMENT]", redact(error instanceof Error ? error.message : String(error)));
  }
}

function needsReview(reason: string): EventOutcome {
  return { status: "needs_review", reason };
}

function ignored(reason: string): EventOutcome {
  return { status: "ignored", reason };
}

// ---------------------------------------------------------------------------
// checkout.session.completed / async_payment_succeeded
// ---------------------------------------------------------------------------
async function handleCheckoutSession(event: StripeEventLike, deps: WebhookDeps): Promise<EventOutcome> {
  const session = event.data.object;

  if (session.payment_status !== "paid") return ignored("not_paid");
  // Abonelikte premium YALNIZCA invoice.paid ile verilir (tek dogruluk kaynagi)
  if (session.mode === "subscription") return ignored("subscription_granted_by_invoice");
  if (session.mode !== "payment") return ignored("unsupported_mode");

  const metadata = asObj(session.metadata) ?? {};
  const kind = asStr(metadata.kind);
  // Webhook yayinlanmadan once acilmis eski oturumlar metadata.kind tasimaz
  const isCoinPack = kind === "coin_pack" || (!kind && !!metadata.coins && !!metadata.package_id);
  if (!isCoinPack) return needsReview("unknown_payment_kind");

  const coins = Number.parseInt(String(metadata.coins ?? ""), 10);
  if (!Number.isFinite(coins) || coins <= 0) return needsReview("invalid_coins");

  const sessionId = asStr(session.id);
  const paymentIntent = idOf(session.payment_intent);

  const result = await callRpc(deps, "record_coin_pack_payment", {
    p_event_id: event.id,
    p_session_id: sessionId,
    p_payment_intent: paymentIntent,
    p_user: asStr(metadata.firm_user_id),
    p_firm: asStr(metadata.firm_id),
    p_plan_id: asStr(metadata.plan_id) ?? asStr(metadata.package_id),
    p_coins: coins,
    p_gross: asNum(session.amount_total),
    p_currency: asStr(session.currency),
    p_livemode: event.livemode,
  });

  if (result.reason === "firm_not_found") return needsReview("firm_not_found");

  if (result.credited === true) await fillSettlement(deps, sessionId, paymentIntent);
  return { status: "processed" };
}

// ---------------------------------------------------------------------------
// Abonelik faturalari
// ---------------------------------------------------------------------------
function subscriptionDetails(invoice: Obj): Obj | null {
  return asObj(asObj(invoice.parent)?.subscription_details);
}

function invoiceSubscriptionId(invoice: Obj): string | null {
  return idOf(subscriptionDetails(invoice)?.subscription) ?? idOf(invoice.subscription);
}

function invoiceMetadata(invoice: Obj): Obj {
  return asObj(subscriptionDetails(invoice)?.metadata) ?? asObj(asObj(invoice.subscription_details)?.metadata) ?? {};
}

// Faturanin kapsadigi donemin sonu (Stripe'in verdigi, saniye -> timestamptz)
function invoicePeriodEnd(invoice: Obj): string | null {
  const lines = asObj(invoice.lines)?.data;
  if (!Array.isArray(lines)) return null;

  let latest: number | null = null;
  for (const line of lines) {
    const end = asNum(asObj(asObj(line)?.period)?.end);
    if (end !== null && (latest === null || end > latest)) latest = end;
  }
  return isoFromSeconds(latest);
}

function subscriptionPeriodEnd(subscription: Obj): string | null {
  const items = asObj(subscription.items)?.data;
  const firstItem = Array.isArray(items) ? asObj(items[0]) : null;
  return isoFromSeconds(firstItem?.current_period_end ?? subscription.current_period_end);
}

function paymentIntentFromPayments(payments: unknown): string | null {
  const list = asObj(payments)?.data;
  if (!Array.isArray(list)) return null;

  for (const item of list) {
    const paymentIntent = idOf(asObj(asObj(item)?.payment)?.payment_intent);
    if (paymentIntent) return paymentIntent;
  }
  return null;
}

// Tutar > 0 faturalar icin payment_intent'i yakalamaya calisir (iade/itiraz
// eslestirmesi icin). Hata olayi asla basarisiz yapmaz.
async function invoicePaymentIntent(invoice: Obj, deps: WebhookDeps): Promise<string | null> {
  const direct = idOf(invoice.payment_intent);
  if (direct) return direct;

  const invoiceId = asStr(invoice.id);
  if (!invoiceId) return null;

  try {
    const full = await deps.stripe.retrieveInvoice(invoiceId);
    return idOf(full.payment_intent) ?? paymentIntentFromPayments(full.payments);
  } catch (error) {
    console.error("[money][INVOICE_LOOKUP]", redact(error instanceof Error ? error.message : String(error)));
    return null;
  }
}

async function handleInvoicePaid(event: StripeEventLike, deps: WebhookDeps): Promise<EventOutcome> {
  const invoice = event.data.object;
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return ignored("invoice_without_subscription");

  const invoiceId = asStr(invoice.id);
  const metadata = invoiceMetadata(invoice);
  const gross = asNum(invoice.amount_paid);

  let periodEnd = invoicePeriodEnd(invoice);
  if (!periodEnd) {
    const subscription = await deps.stripe.retrieveSubscription(subscriptionId);
    periodEnd = subscriptionPeriodEnd(subscription);
  }
  if (!periodEnd) throw new Error("invoice.paid: period end could not be determined");

  const paymentIntent = gross !== null && gross > 0 ? await invoicePaymentIntent(invoice, deps) : null;

  const result = await callRpc(deps, "record_subscription_payment", {
    p_event_id: event.id,
    p_invoice_id: invoiceId,
    p_payment_intent: paymentIntent,
    p_subscription_id: subscriptionId,
    p_customer_id: idOf(invoice.customer),
    p_user: asStr(metadata.firm_user_id),
    p_firm: asStr(metadata.firm_id),
    p_plan: asStr(metadata.plan) ?? asStr(metadata.plan_id),
    p_period_end: periodEnd,
    p_gross: gross,
    p_currency: asStr(invoice.currency),
    p_livemode: event.livemode,
  });

  if (result.reason === "firm_not_found") return needsReview("firm_not_found");

  if (result.applied === true) await fillSettlement(deps, invoiceId, paymentIntent);
  return { status: "processed" };
}

async function handleInvoicePaymentFailed(event: StripeEventLike, deps: WebhookDeps): Promise<EventOutcome> {
  const invoice = event.data.object;
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return ignored("invoice_without_subscription");

  await callRpc(deps, "sync_subscription_state", {
    p_subscription_id: subscriptionId,
    p_status: "past_due",
    p_cancel_at_period_end: null,
    p_period_end: null,
    p_reason: "payment_failed",
  });

  const to = asStr(invoice.customer_email);
  if (to) {
    try {
      const name = asStr(invoice.customer_name);
      // Stripe'in barindirdigi fatura sayfasi: firma ayni sayfadan farkli bir kartla odeyebilir
      const payUrl = httpsUrl(invoice.hosted_invoice_url);
      const payBlock = payUrl
        ? `<p style="color:#333;font-size:15px;line-height:1.6;">Ödemeyi tamamlamak veya farklı bir kart kullanmak için faturanızı güvenli ödeme sayfasında açabilirsiniz:</p>
            <p style="margin:24px 0;"><a href="${escapeHtml(payUrl)}" style="display:inline-block;padding:12px 24px;background:#a64826;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:bold;">Ödemeyi tamamla</a></p>`
        : "";
      await deps.sendEmail({
        to,
        subject: "Premium aboneliğiniz için ödeme alınamadı - Peyzajbul",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#ffffff;border-radius:12px;">
            ${name ? `<p style="color:#333;font-size:15px;line-height:1.6;">Merhaba <strong>${escapeHtml(name)}</strong>,</p>` : ""}
            <p style="color:#333;font-size:15px;line-height:1.6;">${escapeHtml(PAYMENT_FAILED_COPY)}</p>
            ${payBlock}
            <p style="color:#999;font-size:12px;">Bu e-posta Peyzajbul tarafından otomatik olarak gönderilmiştir.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error("[money][EMAIL]", redact(error instanceof Error ? error.message : String(error)));
    }
  }

  return { status: "processed" };
}

async function handleSubscriptionChange(event: StripeEventLike, deps: WebhookDeps): Promise<EventOutcome> {
  const subscription = event.data.object;
  const deleted = event.type === "customer.subscription.deleted";

  await callRpc(deps, "sync_subscription_state", {
    p_subscription_id: asStr(subscription.id),
    p_status: deleted ? "canceled" : asStr(subscription.status),
    p_cancel_at_period_end: subscription.cancel_at_period_end === true || asNum(subscription.cancel_at) !== null,
    p_period_end: subscriptionPeriodEnd(subscription),
    p_reason: deleted ? "deleted" : "updated",
  });

  return { status: "processed" };
}

// ---------------------------------------------------------------------------
// Iade ve itirazlar
// ---------------------------------------------------------------------------
async function reverse(
  event: StripeEventLike,
  deps: WebhookDeps,
  paymentIntent: string | null,
  kind: "refund" | "dispute_opened" | "dispute_won" | "dispute_lost",
  amountMinor: number | null,
): Promise<EventOutcome> {
  if (!paymentIntent) return needsReview("payment_intent_missing");

  const result = await callRpc(deps, "apply_payment_reversal", {
    p_event_id: event.id,
    p_payment_intent: paymentIntent,
    p_kind: kind,
    p_amount_minor: amountMinor,
  });

  if (result.matched === false) return needsReview("payment_not_found");
  if (asStr(result.review_reason)) return needsReview(String(result.review_reason));
  return { status: "processed" };
}

function handleChargeRefunded(event: StripeEventLike, deps: WebhookDeps): Promise<EventOutcome> {
  const charge = event.data.object;
  // amount_refunded kumulatiftir
  return reverse(event, deps, idOf(charge.payment_intent), "refund", asNum(charge.amount_refunded));
}

function handleDispute(event: StripeEventLike, deps: WebhookDeps): Promise<EventOutcome> {
  const dispute = event.data.object;
  const paymentIntent = idOf(dispute.payment_intent);
  const amount = asNum(dispute.amount);

  if (event.type === "charge.dispute.created") {
    return reverse(event, deps, paymentIntent, "dispute_opened", amount);
  }

  if (dispute.status === "won") return reverse(event, deps, paymentIntent, "dispute_won", amount);
  if (dispute.status === "lost") return reverse(event, deps, paymentIntent, "dispute_lost", amount);
  return Promise.resolve(ignored("dispute_closed_without_decision"));
}

// ---------------------------------------------------------------------------
// Yonlendirici
// ---------------------------------------------------------------------------
export async function processEvent(event: StripeEventLike, deps: WebhookDeps): Promise<EventOutcome> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return await handleCheckoutSession(event, deps);

    case "checkout.session.async_payment_failed":
      console.error("[money][ASYNC_PAYMENT_FAILED]", event.id);
      return ignored("async_payment_failed");

    case "invoice.paid":
      return await handleInvoicePaid(event, deps);

    case "invoice.payment_failed":
      return await handleInvoicePaymentFailed(event, deps);

    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return await handleSubscriptionChange(event, deps);

    case "charge.refunded":
      return await handleChargeRefunded(event, deps);

    case "charge.dispute.created":
    case "charge.dispute.closed":
      return await handleDispute(event, deps);

    default:
      return ignored("unhandled_event_type");
  }
}
