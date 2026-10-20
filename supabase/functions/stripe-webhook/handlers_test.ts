// How to run: deno test --allow-env supabase/functions
import { assert, assertEquals, assertFalse, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import {
  type AdminPort,
  type EmailMessage,
  type EventStatus,
  processEvent,
  type RpcResult,
  type Settlement,
  type StripeEventLike,
  type StripePort,
  type WebhookDeps,
} from "./handlers.ts";
import { handleWebhookRequest, type WebhookRequestDeps } from "./webhook.ts";

type Obj = Record<string, unknown>;

const NOW = new Date("2026-10-20T10:00:00.000Z");
const FIRM_ID = "30000000-0000-4000-8000-000000000003";
const USER_ID = "20000000-0000-4000-8000-000000000002";
// 2026-12-31T00:00:00Z: now()+1 ay degil, Stripe'in verdigi donem sonu
const PERIOD_END_SECONDS = 1798675200;
const PERIOD_END_ISO = new Date(PERIOD_END_SECONDS * 1000).toISOString();
const SECRET = "whsec_fixture_secret";

interface Harness {
  deps: WebhookRequestDeps;
  rpcCalls: Array<{ fn: string; args: Obj }>;
  events: Map<string, { status: EventStatus; error?: string }>;
  emails: EmailMessage[];
  settlements: Array<{ id: string; settlement: Settlement }>;
  retrievedInvoices: string[];
  retrievedSubscriptions: string[];
}

function harness(
  options: {
    rpc?: (fn: string, args: Obj) => RpcResult;
    invoice?: Obj;
    subscription?: Obj;
    settlement?: Settlement | null | Error;
    verifyAs?: (body: string) => StripeEventLike;
  } = {},
): Harness {
  const rpcCalls: Array<{ fn: string; args: Obj }> = [];
  const events = new Map<string, { status: EventStatus; error?: string }>();
  const emails: EmailMessage[] = [];
  const settlements: Array<{ id: string; settlement: Settlement }> = [];
  const retrievedInvoices: string[] = [];
  const retrievedSubscriptions: string[] = [];

  const admin: AdminPort = {
    rpc: (fn, args) => {
      rpcCalls.push({ fn, args });
      return Promise.resolve(options.rpc ? options.rpc(fn, args) : { data: { credited: true, applied: true }, error: null });
    },
    claimEvent: (event) => {
      const existing = events.get(event.id);
      if (existing?.status === "processed") return Promise.resolve({ alreadyProcessed: true });
      events.set(event.id, { status: "processing" });
      return Promise.resolve({ alreadyProcessed: false });
    },
    finishEvent: (id, status, detail) => {
      events.set(id, { status, error: detail.error });
      return Promise.resolve();
    },
    recordSettlement: (id, settlement) => {
      settlements.push({ id, settlement });
      return Promise.resolve();
    },
  };

  const stripe: StripePort = {
    retrieveInvoice: (id) => {
      retrievedInvoices.push(id);
      return Promise.resolve(options.invoice ?? { payments: { data: [{ payment: { payment_intent: "pi_from_invoice" } }] } });
    },
    retrieveSubscription: (id) => {
      retrievedSubscriptions.push(id);
      return Promise.resolve(options.subscription ?? { items: { data: [{ current_period_end: PERIOD_END_SECONDS }] } });
    },
    retrieveSettlement: () => {
      if (options.settlement instanceof Error) return Promise.reject(options.settlement);
      return Promise.resolve(options.settlement === undefined ? { feeMinor: 1800, netMinor: 58200, currency: "try" } : options.settlement);
    },
  };

  const deps: WebhookRequestDeps = {
    admin,
    stripe,
    now: () => NOW,
    sendEmail: (message) => {
      emails.push(message);
      return Promise.resolve();
    },
    webhookSecret: SECRET,
    verify: (body) => Promise.resolve(options.verifyAs ? options.verifyAs(body) : (JSON.parse(body) as StripeEventLike)),
  };

  return { deps, rpcCalls, events, emails, settlements, retrievedInvoices, retrievedSubscriptions };
}

function event(type: string, object: Obj, id = "evt_test_1"): StripeEventLike {
  return { id, type, livemode: false, data: { object } };
}

function deliver(h: Harness, evt: StripeEventLike): Promise<Response> {
  return handleWebhookRequest(
    new Request("https://example.test/stripe-webhook", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=fixture" },
      body: JSON.stringify(evt),
    }),
    h.deps,
  );
}

const SUB_METADATA = { kind: "pro_sub", firm_id: FIRM_ID, firm_user_id: USER_ID, plan: "monthly", plan_id: "monthly" };

function cloverInvoice(extra: Obj = {}): Obj {
  return {
    id: "in_clover",
    amount_paid: 60000,
    currency: "try",
    customer: "cus_1",
    parent: { type: "subscription_details", subscription_details: { subscription: "sub_1", metadata: SUB_METADATA } },
    lines: { data: [{ period: { start: PERIOD_END_SECONDS - 2592000, end: PERIOD_END_SECONDS } }] },
    ...extra,
  };
}

function legacyInvoice(extra: Obj = {}): Obj {
  return {
    id: "in_legacy",
    amount_paid: 60000,
    currency: "try",
    customer: "cus_1",
    subscription: "sub_1",
    subscription_details: { metadata: SUB_METADATA },
    lines: { data: [{ period: { start: PERIOD_END_SECONDS - 2592000, end: PERIOD_END_SECONDS } }] },
    ...extra,
  };
}

function coinSession(extra: Obj = {}): Obj {
  return {
    id: "cs_test_1",
    mode: "payment",
    payment_status: "paid",
    amount_total: 60000,
    currency: "try",
    payment_intent: "pi_coin_1",
    metadata: { kind: "coin_pack", firm_id: FIRM_ID, firm_user_id: USER_ID, plan_id: "pro", package_id: "pro", coins: "600" },
    ...extra,
  };
}

// (a) ------------------------------------------------------------------
Deno.test("clover-shaped and legacy-shaped invoice.paid both record one subscription payment with the Stripe period end", async () => {
  for (const invoice of [cloverInvoice(), legacyInvoice()]) {
    const h = harness();
    const response = await deliver(h, event("invoice.paid", invoice));
    assertEquals(response.status, 200);

    assertEquals(h.rpcCalls.length, 1);
    const { fn, args } = h.rpcCalls[0];
    assertEquals(fn, "record_subscription_payment");
    assertEquals(args.p_period_end, PERIOD_END_ISO);
    assertEquals(args.p_subscription_id, "sub_1");
    assertEquals(args.p_customer_id, "cus_1");
    assertEquals(args.p_firm, FIRM_ID);
    assertEquals(args.p_user, USER_ID);
    assertEquals(args.p_plan, "monthly");
    assertEquals(args.p_gross, 60000);
    assertEquals(args.p_currency, "try");
    assertEquals(args.p_event_id, "evt_test_1");
    assertEquals(args.p_payment_intent, "pi_from_invoice");

    const oneMonthFromNow = new Date(NOW);
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    assert(args.p_period_end !== oneMonthFromNow.toISOString(), "period end must not be now()+1 month");
    assertEquals(h.events.get("evt_test_1")?.status, "processed");
  }
});

Deno.test("invoice.paid uses the latest line period end and falls back to the subscription when lines carry none", async () => {
  const multi = harness();
  await deliver(
    multi,
    event(
      "invoice.paid",
      cloverInvoice({
        lines: { data: [{ period: { end: PERIOD_END_SECONDS - 86400 } }, { period: { end: PERIOD_END_SECONDS } }] },
      }),
    ),
  );
  assertEquals(multi.rpcCalls[0].args.p_period_end, PERIOD_END_ISO);

  const fallback = harness();
  await deliver(fallback, event("invoice.paid", cloverInvoice({ lines: { data: [] } })));
  assertEquals(fallback.retrievedSubscriptions, ["sub_1"]);
  assertEquals(fallback.rpcCalls[0].args.p_period_end, PERIOD_END_ISO);
});

Deno.test("invoice.paid without a subscription is ignored and a zero invoice skips the payment intent lookup", async () => {
  const noSub = harness();
  const response = await deliver(noSub, event("invoice.paid", { id: "in_x", amount_paid: 100, currency: "try", lines: { data: [] } }));
  assertEquals(response.status, 200);
  assertEquals(noSub.rpcCalls.length, 0);
  assertEquals(noSub.events.get("evt_test_1")?.status, "ignored");

  const zero = harness();
  await deliver(zero, event("invoice.paid", cloverInvoice({ amount_paid: 0 })));
  assertEquals(zero.retrievedInvoices.length, 0);
  assertEquals(zero.rpcCalls[0].args.p_gross, 0);
  assertEquals(zero.rpcCalls[0].args.p_payment_intent, null);
});

Deno.test("a failing payment intent lookup never fails invoice.paid", async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const h = harness();
    h.deps.stripe.retrieveInvoice = () => Promise.reject(new Error("stripe down"));
    const response = await deliver(h, event("invoice.paid", cloverInvoice()));
    assertEquals(response.status, 200);
    assertEquals(h.rpcCalls[0].args.p_payment_intent, null);
  } finally {
    console.error = originalError;
  }
});

// (b) ------------------------------------------------------------------
Deno.test("checkout.session.completed with payment_status unpaid makes zero RPC calls", async () => {
  const h = harness();
  const response = await deliver(h, event("checkout.session.completed", coinSession({ payment_status: "unpaid" })));
  assertEquals(response.status, 200);
  assertEquals(h.rpcCalls.length, 0);
  assertEquals(h.events.get("evt_test_1")?.status, "ignored");
});

Deno.test("subscription checkout sessions never grant premium (invoice.paid is the single source)", async () => {
  const h = harness();
  await deliver(h, event("checkout.session.completed", coinSession({ mode: "subscription", metadata: SUB_METADATA })));
  assertEquals(h.rpcCalls.length, 0);
  assertEquals(h.events.get("evt_test_1")?.status, "ignored");
});

// (c) ------------------------------------------------------------------
Deno.test("a paid coin session maps to record_coin_pack_payment with amount_total, currency and coins", async () => {
  for (const type of ["checkout.session.completed", "checkout.session.async_payment_succeeded"]) {
    const h = harness();
    const response = await deliver(h, event(type, coinSession()));
    assertEquals(response.status, 200);
    assertEquals(h.rpcCalls, [
      {
        fn: "record_coin_pack_payment",
        args: {
          p_event_id: "evt_test_1",
          p_session_id: "cs_test_1",
          p_payment_intent: "pi_coin_1",
          p_user: USER_ID,
          p_firm: FIRM_ID,
          p_plan_id: "pro",
          p_coins: 600,
          p_gross: 60000,
          p_currency: "try",
          p_livemode: false,
        },
      },
    ]);
    assertEquals(h.events.get("evt_test_1")?.status, "processed");
    assertEquals(h.settlements, [{ id: "cs_test_1", settlement: { feeMinor: 1800, netMinor: 58200, currency: "try" } }]);
  }
});

Deno.test("legacy coin sessions without metadata.kind are still credited", async () => {
  const h = harness();
  await deliver(
    h,
    event(
      "checkout.session.completed",
      coinSession({ metadata: { firm_user_id: USER_ID, package_id: "starter", coins: "50" } }),
    ),
  );
  assertEquals(h.rpcCalls.length, 1);
  assertEquals(h.rpcCalls[0].args.p_plan_id, "starter");
  assertEquals(h.rpcCalls[0].args.p_firm, null);
  assertEquals(h.rpcCalls[0].args.p_coins, 50);
});

Deno.test("an unknown paid payment kind or invalid coins are flagged for review and still answered 200", async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const unknown = harness();
    const r1 = await deliver(unknown, event("checkout.session.completed", coinSession({ metadata: { kind: "sponsorship" } })));
    assertEquals(r1.status, 200);
    assertEquals(unknown.rpcCalls.length, 0);
    assertEquals(unknown.events.get("evt_test_1")?.status, "needs_review");

    const invalid = harness();
    await deliver(invalid, event("checkout.session.completed", coinSession({ metadata: { kind: "coin_pack", coins: "abc" } })));
    assertEquals(invalid.rpcCalls.length, 0);
    assertEquals(invalid.events.get("evt_test_1")?.status, "needs_review");
  } finally {
    console.error = originalError;
  }
});

Deno.test("a paid session whose firm cannot be resolved is needs_review with HTTP 200", async () => {
  const errors: unknown[][] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => errors.push(args);
  try {
    const h = harness({ rpc: () => ({ data: { credited: false, reason: "firm_not_found" }, error: null }) });
    const response = await deliver(h, event("checkout.session.completed", coinSession()));
    assertEquals(response.status, 200);
    assertEquals(h.events.get("evt_test_1")?.status, "needs_review");
    assertEquals(h.settlements.length, 0);
    assert(errors.some((args) => args[0] === "[money][UNMATCHED]" && args[1] === "evt_test_1"));
  } finally {
    console.error = originalError;
  }
});

Deno.test("a settlement lookup failure never fails the event", async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const h = harness({ settlement: new Error("balance transaction not ready") });
    const response = await deliver(h, event("checkout.session.completed", coinSession()));
    assertEquals(response.status, 200);
    assertEquals(h.events.get("evt_test_1")?.status, "processed");
  } finally {
    console.error = originalError;
  }
});

// (d) ------------------------------------------------------------------
Deno.test("the same event id delivered twice calls the RPC once", async () => {
  const h = harness();
  const evt = event("checkout.session.completed", coinSession());

  const first = await deliver(h, evt);
  assertEquals(first.status, 200);
  assertEquals(await first.json(), { received: true });

  const second = await deliver(h, evt);
  assertEquals(second.status, 200);
  assertEquals(await second.json(), { received: true, duplicate: true });

  assertEquals(h.rpcCalls.length, 1);
  assertEquals(h.events.size, 1);
});

// (e) ------------------------------------------------------------------
Deno.test("an RPC error yields HTTP 500 and a failed stripe_events row, then a retry can succeed", async () => {
  const errors: unknown[][] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => errors.push(args);
  try {
    let failing = true;
    const h = harness({
      rpc: () => (failing ? { data: null, error: { message: "connection refused" } } : { data: { credited: true }, error: null }),
    });
    const evt = event("checkout.session.completed", coinSession());

    const response = await deliver(h, evt);
    assertEquals(response.status, 500);
    assertEquals(h.events.get("evt_test_1")?.status, "failed");
    assertStringIncludes(h.events.get("evt_test_1")?.error ?? "", "record_coin_pack_payment");
    assert(errors.some((args) => args[0] === "[money][FAILED]"));

    failing = false;
    const retry = await deliver(h, evt);
    assertEquals(retry.status, 200);
    assertEquals(h.events.get("evt_test_1")?.status, "processed");
  } finally {
    console.error = originalError;
  }
});

// (f) ------------------------------------------------------------------
Deno.test("charge.refunded maps to apply_payment_reversal kind refund with the cumulative amount_refunded", async () => {
  const h = harness({ rpc: () => ({ data: { matched: true, status: "partially_refunded" }, error: null }) });
  const response = await deliver(
    h,
    event("charge.refunded", { id: "ch_1", payment_intent: "pi_coin_1", amount: 60000, amount_refunded: 15000 }, "evt_refund"),
  );
  assertEquals(response.status, 200);
  assertEquals(h.rpcCalls, [
    {
      fn: "apply_payment_reversal",
      args: { p_event_id: "evt_refund", p_payment_intent: "pi_coin_1", p_kind: "refund", p_amount_minor: 15000 },
    },
  ]);
  assertEquals(h.events.get("evt_refund")?.status, "processed");
});

Deno.test("an unmatched refund or a refund shortfall is flagged needs_review and still answered 200", async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const unmatched = harness({ rpc: () => ({ data: { matched: false }, error: null }) });
    const r1 = await deliver(unmatched, event("charge.refunded", { payment_intent: "pi_none", amount_refunded: 1 }));
    assertEquals(r1.status, 200);
    assertEquals(unmatched.events.get("evt_test_1")?.status, "needs_review");

    const shortfall = harness({ rpc: () => ({ data: { matched: true, review_reason: "refund_shortfall:40" }, error: null }) });
    await deliver(shortfall, event("charge.refunded", { payment_intent: "pi_coin_1", amount_refunded: 60000 }));
    assertEquals(shortfall.events.get("evt_test_1")?.status, "needs_review");
  } finally {
    console.error = originalError;
  }
});

Deno.test("dispute events map to the matching reversal kinds", async () => {
  const cases: Array<[string, Obj, string | null]> = [
    ["charge.dispute.created", { payment_intent: "pi_coin_1", amount: 60000, status: "needs_response" }, "dispute_opened"],
    ["charge.dispute.closed", { payment_intent: "pi_coin_1", amount: 60000, status: "won" }, "dispute_won"],
    ["charge.dispute.closed", { payment_intent: "pi_coin_1", amount: 60000, status: "lost" }, "dispute_lost"],
    ["charge.dispute.closed", { payment_intent: "pi_coin_1", amount: 60000, status: "warning_closed" }, null],
  ];

  for (const [type, object, kind] of cases) {
    const h = harness({ rpc: () => ({ data: { matched: true }, error: null }) });
    const response = await deliver(h, event(type, object));
    assertEquals(response.status, 200);
    if (kind) {
      assertEquals(h.rpcCalls.length, 1);
      assertEquals(h.rpcCalls[0].args.p_kind, kind);
      assertEquals(h.rpcCalls[0].args.p_payment_intent, "pi_coin_1");
    } else {
      assertEquals(h.rpcCalls.length, 0);
      assertEquals(h.events.get("evt_test_1")?.status, "ignored");
    }
  }
});

// subscription state --------------------------------------------------
Deno.test("invoice.payment_failed syncs past_due state and sends one escaped email", async () => {
  const h = harness();
  const response = await deliver(
    h,
    event("invoice.payment_failed", legacyInvoice({ customer_email: "firma@example.com", customer_name: "<b>Yeşil</b> Bahçe" })),
  );
  assertEquals(response.status, 200);
  assertEquals(h.rpcCalls, [
    {
      fn: "sync_subscription_state",
      args: { p_subscription_id: "sub_1", p_status: "past_due", p_cancel_at_period_end: null, p_period_end: null, p_reason: "payment_failed" },
    },
  ]);
  assertEquals(h.emails.length, 1);
  assertEquals(h.emails[0].to, "firma@example.com");
  assertStringIncludes(h.emails[0].html, "Premium aboneliğiniz için ödeme alınamadı. Kartınızı güncellemezseniz üyelik dönem sonunda sona erer.");
  assertFalse(h.emails[0].html.includes("<b>Yeşil"));
  // hosted_invoice_url yoksa baglanti eklenmez
  assertFalse(h.emails[0].html.includes("<a "));
});

Deno.test("invoice.payment_failed email links the hosted invoice page, escaped and https only", async () => {
  const withLink = harness();
  await deliver(
    withLink,
    event(
      "invoice.payment_failed",
      legacyInvoice({
        customer_email: "firma@example.com",
        hosted_invoice_url: "https://invoice.stripe.com/i/acct_1/test_1?a=1&b=\"2\"",
      }),
    ),
  );
  assertEquals(withLink.emails.length, 1);
  assertStringIncludes(withLink.emails[0].html, 'href="https://invoice.stripe.com/i/acct_1/test_1?a=1&amp;b=&quot;2&quot;"');
  assertStringIncludes(withLink.emails[0].html, "Ödemeyi tamamla");

  for (const unsafe of ["javascript:alert(1)", "http://invoice.stripe.com/i/1", "not a url"]) {
    const h = harness();
    await deliver(h, event("invoice.payment_failed", legacyInvoice({ customer_email: "firma@example.com", hosted_invoice_url: unsafe })));
    assertEquals(h.emails.length, 1);
    assertFalse(h.emails[0].html.includes("<a "), unsafe);
  }
});

Deno.test("customer.subscription.updated and deleted map to sync_subscription_state", async () => {
  const updated = harness();
  await deliver(
    updated,
    event("customer.subscription.updated", {
      id: "sub_1",
      status: "active",
      cancel_at_period_end: true,
      items: { data: [{ current_period_end: PERIOD_END_SECONDS }] },
    }),
  );
  assertEquals(updated.rpcCalls[0], {
    fn: "sync_subscription_state",
    args: { p_subscription_id: "sub_1", p_status: "active", p_cancel_at_period_end: true, p_period_end: PERIOD_END_ISO, p_reason: "updated" },
  });

  const deleted = harness();
  await deliver(deleted, event("customer.subscription.deleted", { id: "sub_1", status: "canceled", current_period_end: PERIOD_END_SECONDS }));
  assertEquals(deleted.rpcCalls[0].args.p_reason, "deleted");
  assertEquals(deleted.rpcCalls[0].args.p_status, "canceled");
  assertEquals(deleted.rpcCalls[0].args.p_period_end, PERIOD_END_ISO);
});

// (g) ------------------------------------------------------------------
Deno.test("an unknown event type yields 200 and ignored", async () => {
  const h = harness();
  const response = await deliver(h, event("customer.created", { id: "cus_1" }));
  assertEquals(response.status, 200);
  assertEquals(h.rpcCalls.length, 0);
  assertEquals(h.events.get("evt_test_1")?.status, "ignored");
  assertEquals(h.events.size, 1);
});

Deno.test("async_payment_failed is logged and ignored", async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const h = harness();
    await deliver(h, event("checkout.session.async_payment_failed", coinSession({ payment_status: "unpaid" })));
    assertEquals(h.rpcCalls.length, 0);
    assertEquals(h.events.get("evt_test_1")?.status, "ignored");
  } finally {
    console.error = originalError;
  }
});

Deno.test("processEvent is usable on its own with injected deps", async () => {
  const h = harness();
  const outcome = await processEvent(event("customer.created", {}), h.deps as WebhookDeps);
  assertEquals(outcome.status, "ignored");
});

// (h) ------------------------------------------------------------------
Deno.test("signature handling: bad or missing signature yields 400, missing secret 500, a valid signature 200", async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const stripe = new Stripe("sk_test_fixture", { httpClient: Stripe.createFetchHttpClient() });
    const cryptoProvider = Stripe.createSubtleCryptoProvider();
    const payload = JSON.stringify({
      id: "evt_sig_1",
      object: "event",
      type: "customer.created",
      livemode: false,
      data: { object: { id: "cus_1" } },
    });

    const h = harness();
    h.deps.verify = async (body, signature, secret) =>
      await stripe.webhooks.constructEventAsync(body, signature, secret, undefined, cryptoProvider) as unknown as StripeEventLike;

    const send = (headers: Record<string, string>, deps = h.deps) =>
      handleWebhookRequest(new Request("https://example.test/stripe-webhook", { method: "POST", headers, body: payload }), deps);

    // imza yok
    assertEquals((await send({})).status, 400);

    // yanlis sir ile imzalanmis
    const forged = await stripe.webhooks.generateTestHeaderStringAsync({
      payload,
      secret: "whsec_wrong_secret",
      cryptoProvider,
    });
    assertEquals((await send({ "stripe-signature": forged })).status, 400);
    assertEquals(h.events.size, 0);
    assertEquals(h.rpcCalls.length, 0);

    // gecerli imza
    const valid = await stripe.webhooks.generateTestHeaderStringAsync({ payload, secret: SECRET, cryptoProvider });
    const ok = await send({ "stripe-signature": valid });
    assertEquals(ok.status, 200);
    assertEquals(h.events.get("evt_sig_1")?.status, "ignored");

    // webhook sirri tanimli degil
    assertEquals((await send({ "stripe-signature": valid }, { ...h.deps, webhookSecret: undefined })).status, 500);
  } finally {
    console.error = originalError;
  }
});
