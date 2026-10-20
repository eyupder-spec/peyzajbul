// How to run: deno test --allow-env supabase/functions
import { assertEquals, assertFalse } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createPremiumCheckoutHandler, type CheckoutDeps, type StripeLike } from "./checkout.ts";

type Row = Record<string, unknown>;

const USER = { id: "20000000-0000-4000-8000-000000000002", email: "owner@example.com" };
const FIRM = {
  id: "30000000-0000-4000-8000-000000000003",
  user_id: USER.id,
  company_name: "Yeşil Bahçe Peyzaj",
  email: "firma@example.com",
  stripe_customer_id: "cus_existing" as string | null,
};

const PLANS: Row[] = [
  { id: "monthly", kind: "pro_sub", name: "Premium Aylık", coins: null, billing_interval: "month", unit_amount_minor: 60000, currency: "try", stripe_price_id: null, active: true },
  { id: "yearly", kind: "pro_sub", name: "Premium Yıllık", coins: null, billing_interval: "year", unit_amount_minor: 600000, currency: "try", stripe_price_id: "price_yearly_override", active: true },
  { id: "founder", kind: "pro_sub", name: "Kurucu Üye", coins: null, billing_interval: "year", unit_amount_minor: 290000, currency: "try", stripe_price_id: null, active: true },
  { id: "retired", kind: "pro_sub", name: "Eski", coins: null, billing_interval: "month", unit_amount_minor: 1000, currency: "usd", stripe_price_id: null, active: false },
  { id: "starter", kind: "coin_pack", name: "Başlangıç", coins: 50, billing_interval: null, unit_amount_minor: 5000, currency: "usd", stripe_price_id: null, active: true },
];

type Update = { table: string; patch: Row; filters: Array<[string, unknown]> };
type RpcResult = { data: unknown; error: { message: string } | null };

function fakeAdmin(tables: Record<string, Row[]>, updates: Update[], rpcCalls: string[] = [], rpcResult?: RpcResult) {
  class Query {
    private filters: Array<[string, unknown]> = [];
    private patch: Row | null = null;
    constructor(private table: string) {}
    select(_columns?: string) {
      return this;
    }
    eq(column: string, value: unknown) {
      this.filters.push([column, value]);
      return this;
    }
    limit(_count: number) {
      return this;
    }
    update(patch: Row) {
      this.patch = patch;
      return this;
    }
    private rows(): Row[] {
      return (tables[this.table] ?? []).filter((row) => this.filters.every(([column, value]) => row[column] === value));
    }
    maybeSingle() {
      return Promise.resolve({ data: this.rows()[0] ?? null, error: null });
    }
    // deno-lint-ignore no-explicit-any
    then(resolve: (value: { data: Row[] | null; error: null }) => any) {
      if (this.patch) updates.push({ table: this.table, patch: this.patch, filters: this.filters });
      return Promise.resolve({ data: this.patch ? null : this.rows(), error: null }).then(resolve);
    }
  }
  return {
    from: (table: string) => new Query(table),
    rpc: (fn: string) => {
      rpcCalls.push(fn);
      return Promise.resolve(rpcResult ?? { data: null, error: { message: `unexpected rpc ${fn}` } });
    },
  } as unknown as SupabaseClient;
}

// Stripe'in "No such customer" hatasi (kayitli musteri bu hesapta/modda yok)
function missingCustomerError(id: string): Error {
  return Object.assign(new Error(`No such customer: '${id}'`), {
    type: "StripeInvalidRequestError",
    code: "resource_missing",
    param: "customer",
  });
}

function setup(
  options: {
    subscription?: Row | null;
    firms?: Row[];
    siteUrl?: string;
    missingCustomers?: string[];
    sessionError?: Error;
    plans?: Row[];
    founderSlots?: RpcResult;
  } = {},
) {
  const sessions: Array<Record<string, unknown>> = [];
  const customers: Array<Record<string, unknown>> = [];
  const updates: Update[] = [];
  const rpcCalls: string[] = [];

  const stripe: StripeLike = {
    createCustomer: (params) => {
      customers.push(params as Record<string, unknown>);
      return Promise.resolve({ id: "cus_new" });
    },
    createCheckoutSession: (params) => {
      if (options.sessionError) return Promise.reject(options.sessionError);
      if (options.missingCustomers?.includes(String(params.customer))) {
        return Promise.reject(missingCustomerError(String(params.customer)));
      }
      sessions.push(params as unknown as Record<string, unknown>);
      return Promise.resolve({ url: "https://checkout.stripe.test/session" });
    },
  };

  const deps: CheckoutDeps = {
    authClient: { auth: { getUser: () => Promise.resolve({ data: { user: USER }, error: null }) } } as unknown as CheckoutDeps["authClient"],
    admin: fakeAdmin({
      pricing_plans: options.plans ?? PLANS,
      firms: options.firms ?? [FIRM],
      firm_subscriptions: options.subscription ? [options.subscription] : [],
    }, updates, rpcCalls, options.founderSlots),
    stripe,
    env: (name) => (name === "SITE_URL" ? options.siteUrl ?? "https://www.peyzajbul.com" : undefined),
  };

  return { handler: createPremiumCheckoutHandler(deps), sessions, customers, updates, rpcCalls };
}

function founderSlots(remaining: number): RpcResult {
  return { data: { cap: 25, taken: 25 - Math.max(remaining, 0), remaining: Math.max(remaining, 0) }, error: null };
}

function request(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://example.test/create-premium-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer token", ...headers },
    body: JSON.stringify(body),
  });
}

Deno.test("subscription session carries plan metadata on the subscription and uses SITE_URL", async () => {
  const { handler, sessions } = setup();
  const response = await handler(request({ plan: "monthly" }, { Origin: "https://evil.example" }));
  assertEquals(response.status, 200);
  assertEquals(await response.json(), { url: "https://checkout.stripe.test/session" });

  const session = sessions[0];
  const metadata = { kind: "pro_sub", firm_id: FIRM.id, firm_user_id: USER.id, plan: "monthly", plan_id: "monthly" };
  assertEquals(session.mode, "subscription");
  assertEquals(session.metadata, metadata);
  assertEquals(session.subscription_data, { metadata });
  assertEquals(session.allow_promotion_codes, true);
  assertEquals(session.customer, "cus_existing");
  assertEquals(session.client_reference_id, FIRM.id);
  assertEquals(session.success_url, "https://www.peyzajbul.com/firma/premium?success=true");
  assertEquals(session.cancel_url, "https://www.peyzajbul.com/firma/premium");
  assertFalse(JSON.stringify(session).includes("evil.example"));
  assertEquals(session.line_items, [
    {
      price_data: {
        currency: "try",
        unit_amount: 60000,
        recurring: { interval: "month" },
        product_data: { name: "Premium Aylık" },
      },
      quantity: 1,
    },
  ]);
});

Deno.test("a plan with stripe_price_id uses that price", async () => {
  const { handler, sessions } = setup();
  await handler(request({ plan: "yearly" }));
  assertEquals((sessions[0] as Record<string, unknown>).line_items, [{ price: "price_yearly_override", quantity: 1 }]);
});

Deno.test("unknown, inactive or coin-pack plans return plan_unavailable without a Stripe call", async () => {
  for (const plan of ["weekly", "retired", "starter", ""]) {
    const { handler, sessions, customers } = setup();
    const response = await handler(request({ plan }));
    assertEquals(response.status, 200, plan);
    assertEquals((await response.json()).code, "plan_unavailable");
    assertEquals(sessions.length, 0);
    assertEquals(customers.length, 0);
  }
});

Deno.test("an existing active, trialing or past_due subscription is refused", async () => {
  for (const status of ["active", "trialing", "past_due"]) {
    const { handler, sessions } = setup({ subscription: { firm_id: FIRM.id, status } });
    const response = await handler(request({ plan: "monthly" }));
    assertEquals(response.status, 200, status);
    assertEquals(await response.json(), { error: "Zaten aktif bir aboneliğiniz var", code: "already_subscribed" });
    assertEquals(sessions.length, 0);
  }

  const canceled = setup({ subscription: { firm_id: FIRM.id, status: "canceled" } });
  const response = await canceled.handler(request({ plan: "monthly" }));
  assertEquals((await response.json()).url, "https://checkout.stripe.test/session");
});

Deno.test("a user without exactly one firm gets firm_required", async () => {
  const { handler, sessions } = setup({ firms: [] });
  const response = await handler(request({ plan: "monthly" }));
  assertEquals(await response.json(), { error: "Önce firma hesabınızı tamamlayın", code: "firm_required" });
  assertEquals(sessions.length, 0);
});

Deno.test("missing SITE_URL fails closed", async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const { handler, sessions } = setup({ siteUrl: "" });
    const response = await handler(request({ plan: "monthly" }));
    assertEquals(response.status, 500);
    assertEquals(sessions.length, 0);
  } finally {
    console.error = originalError;
  }
});

Deno.test("a new Stripe customer is created when the firm has none", async () => {
  const { handler, customers, sessions } = setup({ firms: [{ ...FIRM, stripe_customer_id: null }] });
  await handler(request({ plan: "monthly" }));
  assertEquals(customers.length, 1);
  assertEquals((sessions[0] as Record<string, unknown>).customer, "cus_new");
});

Deno.test("a stored customer unknown to Stripe is replaced once and the session is retried", async () => {
  const { handler, sessions, customers, updates } = setup({
    firms: [{ ...FIRM, stripe_customer_id: "cus_test_mode" }],
    missingCustomers: ["cus_test_mode"],
  });
  const response = await handler(request({ plan: "monthly" }));
  assertEquals(response.status, 200);
  assertEquals(await response.json(), { url: "https://checkout.stripe.test/session" });

  assertEquals(customers.length, 1);
  assertEquals(sessions.length, 1);
  assertEquals((sessions[0] as Record<string, unknown>).customer, "cus_new");
  assertEquals(updates, [{ table: "firms", patch: { stripe_customer_id: "cus_new" }, filters: [["id", FIRM.id]] }]);
});

Deno.test("other Stripe errors on a stored customer are not retried and stay generic", async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const { handler, sessions, customers, updates } = setup({
      sessionError: Object.assign(new Error("rate limited"), { code: "rate_limit" }),
    });
    const response = await handler(request({ plan: "monthly" }));
    assertEquals(response.status, 500);
    assertEquals(customers.length, 0);
    assertEquals(sessions.length, 0);
    assertEquals(updates.length, 0);
  } finally {
    console.error = originalError;
  }
});

Deno.test("founder plan is accepted while slots remain, keeps the 2.900 TL yearly price and carries the plan id", async () => {
  const { handler, sessions, customers, rpcCalls } = setup({ founderSlots: founderSlots(1) });
  const response = await handler(request({ plan: "founder" }));
  assertEquals(response.status, 200);
  assertEquals(await response.json(), { url: "https://checkout.stripe.test/session" });
  assertEquals(rpcCalls, ["get_founder_slots"]);
  assertEquals(customers.length, 0);

  const session = sessions[0];
  const metadata = { kind: "pro_sub", firm_id: FIRM.id, firm_user_id: USER.id, plan: "founder", plan_id: "founder" };
  assertEquals(session.metadata, metadata);
  assertEquals(session.subscription_data, { metadata });
  assertEquals(session.line_items, [
    {
      price_data: {
        currency: "try",
        unit_amount: 290000,
        recurring: { interval: "year" },
        product_data: { name: "Kurucu Üye" },
      },
      quantity: 1,
    },
  ]);
});

Deno.test("founder plan is refused with founder_sold_out when no slot remains, without any Stripe call", async () => {
  for (const remaining of [0, -3]) {
    const { handler, sessions, customers, updates, rpcCalls } = setup({
      firms: [{ ...FIRM, stripe_customer_id: null }],
      founderSlots: { data: { cap: 25, taken: 25, remaining }, error: null },
    });
    const response = await handler(request({ plan: "founder" }));
    assertEquals(response.status, 200, String(remaining));
    assertEquals(await response.json(), {
      error: "Kurucu Üye kontenjanı doldu. Aylık veya Yıllık Pro planını seçebilirsiniz.",
      code: "founder_sold_out",
    });
    assertEquals(rpcCalls, ["get_founder_slots"]);
    assertEquals(sessions.length, 0);
    assertEquals(customers.length, 0);
    assertEquals(updates.length, 0);
  }
});

Deno.test("founder plan is refused as plan_unavailable while its pricing_plans row is inactive, even with free slots", async () => {
  const plans = PLANS.map((plan) => (plan.id === "founder" ? { ...plan, active: false } : plan));
  const { handler, sessions, customers, rpcCalls } = setup({ plans, founderSlots: founderSlots(25) });
  const response = await handler(request({ plan: "founder" }));
  assertEquals(response.status, 200);
  assertEquals((await response.json()).code, "plan_unavailable");
  assertEquals(rpcCalls.length, 0);
  assertEquals(sessions.length, 0);
  assertEquals(customers.length, 0);
});

Deno.test("an existing subscriber is told about the subscription, not about the founder quota", async () => {
  const { handler, sessions, rpcCalls } = setup({
    subscription: { firm_id: FIRM.id, status: "active" },
    founderSlots: founderSlots(0),
  });
  const response = await handler(request({ plan: "founder" }));
  assertEquals((await response.json()).code, "already_subscribed");
  assertEquals(rpcCalls.length, 0);
  assertEquals(sessions.length, 0);
});

Deno.test("founder quota lookup failures fail closed instead of selling an unchecked slot", async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const results: RpcResult[] = [
      { data: null, error: { message: "function public.get_founder_slots() does not exist" } },
      { data: null, error: null },
      { data: { cap: 25, taken: 3 }, error: null },
    ];
    for (const founderSlots of results) {
      const { handler, sessions, customers } = setup({ founderSlots });
      const response = await handler(request({ plan: "founder" }));
      assertEquals(response.status, 500);
      assertEquals(await response.json(), { error: "Ödeme başlatılamadı, lütfen tekrar deneyin" });
      assertEquals(sessions.length, 0);
      assertEquals(customers.length, 0);
    }
  } finally {
    console.error = originalError;
  }
});

Deno.test("monthly and yearly plans never read the founder quota", async () => {
  for (const plan of ["monthly", "yearly"]) {
    const { handler, sessions, rpcCalls } = setup();
    const response = await handler(request({ plan }));
    assertEquals(response.status, 200, plan);
    assertEquals(rpcCalls.length, 0, plan);
    assertEquals(sessions.length, 1, plan);
  }
});
