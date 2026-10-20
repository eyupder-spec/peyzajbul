// How to run: deno test --allow-env supabase/functions
import { assertEquals, assertFalse } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  createCoinCheckoutHandler,
  getSiteUrl,
  type CheckoutDeps,
  type StripeLike,
} from "./checkout.ts";

type Row = Record<string, unknown>;

const USER = { id: "20000000-0000-4000-8000-000000000002", email: "owner@example.com" };
const FIRM = {
  id: "30000000-0000-4000-8000-000000000003",
  company_name: "Yeşil Bahçe Peyzaj",
  email: "firma@example.com",
  stripe_customer_id: null as string | null,
};

const PLANS: Row[] = [
  { id: "starter", kind: "coin_pack", name: "Başlangıç", coins: 50, billing_interval: null, unit_amount_minor: 5000, currency: "usd", stripe_price_id: null, active: true },
  { id: "advantage", kind: "coin_pack", name: "Avantaj", coins: 220, billing_interval: null, unit_amount_minor: 20000, currency: "usd", stripe_price_id: null, active: false },
  { id: "pro", kind: "coin_pack", name: "Pro", coins: 600, billing_interval: null, unit_amount_minor: 60000, currency: "try", stripe_price_id: null, active: true },
  { id: "ultra", kind: "coin_pack", name: "Ultra", coins: 1300, billing_interval: null, unit_amount_minor: 100000, currency: "usd", stripe_price_id: "price_override_test", active: true },
  { id: "monthly", kind: "pro_sub", name: "Premium Aylık", coins: null, billing_interval: "month", unit_amount_minor: 1500, currency: "usd", stripe_price_id: null, active: true },
];

// Yalnizca kullanilan sorgu zincirini taklit eden minimal sahte istemci
function fakeAdmin(tables: Record<string, Row[]>, updates: Array<{ table: string; patch: Row; filters: Array<[string, unknown]> }>) {
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
      if (this.patch) {
        updates.push({ table: this.table, patch: this.patch, filters: this.filters });
        return Promise.resolve({ data: null, error: null }).then(resolve);
      }
      return Promise.resolve({ data: this.rows(), error: null }).then(resolve);
    }
  }
  return { from: (table: string) => new Query(table) } as unknown as SupabaseClient;
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
  options: { env?: Record<string, string>; firms?: Row[]; user?: typeof USER | null; missingCustomers?: string[]; sessionError?: Error } = {},
) {
  const sessions: Array<Record<string, unknown>> = [];
  const customers: Array<Record<string, unknown>> = [];
  const updates: Array<{ table: string; patch: Row; filters: Array<[string, unknown]> }> = [];
  const env: Record<string, string> = options.env ?? { SITE_URL: "https://www.peyzajbul.com" };

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
    authClient: {
      auth: {
        getUser: () =>
          Promise.resolve(
            options.user === null
              ? { data: { user: null }, error: { message: "invalid" } }
              : { data: { user: options.user ?? USER }, error: null },
          ),
      },
    } as unknown as CheckoutDeps["authClient"],
    admin: fakeAdmin({ pricing_plans: PLANS, firms: options.firms ?? [{ ...FIRM, user_id: USER.id }] }, updates),
    stripe,
    env: (name) => env[name],
  };

  return { handler: createCoinCheckoutHandler(deps), sessions, customers, updates };
}

function request(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://example.test/create-coin-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer token", ...headers },
    body: JSON.stringify(body),
  });
}

Deno.test("unknown or inactive package returns plan_unavailable and makes no Stripe call", async () => {
  for (const packageId of ["does-not-exist", "advantage", "monthly", ""]) {
    const { handler, sessions, customers } = setup();
    const response = await handler(request({ package_id: packageId }));
    assertEquals(response.status, 200, packageId);
    assertEquals(await response.json(), { error: "Paket bulunamadı veya şu an satışta değil", code: "plan_unavailable" });
    assertEquals(sessions.length, 0);
    assertEquals(customers.length, 0);
  }
});

Deno.test("missing, empty or non-https SITE_URL fails closed", async () => {
  for (const env of [{} as Record<string, string>, { SITE_URL: "" }, { SITE_URL: "http://www.peyzajbul.com" }, { SITE_URL: "not a url" }]) {
    const { handler, sessions, customers } = setup({ env });
    const response = await handler(request({ package_id: "starter" }));
    assertEquals(response.status, 500);
    assertEquals((await response.json()).code, "site_url_missing");
    assertEquals(sessions.length, 0);
    assertEquals(customers.length, 0);
  }
  assertEquals(getSiteUrl(() => "https://www.peyzajbul.com/"), "https://www.peyzajbul.com");
});

Deno.test("success and cancel urls come from SITE_URL even when an evil Origin header is sent", async () => {
  const { handler, sessions } = setup();
  const response = await handler(
    request({ package_id: "starter" }, { Origin: "https://evil.example", Referer: "https://evil.example/x" }),
  );
  assertEquals(response.status, 200);
  assertEquals(await response.json(), { url: "https://checkout.stripe.test/session" });

  const session = sessions[0];
  assertEquals(session.success_url, "https://www.peyzajbul.com/firma/jeton?success=true&session_id={CHECKOUT_SESSION_ID}");
  assertEquals(session.cancel_url, "https://www.peyzajbul.com/firma/jeton");
  assertFalse(JSON.stringify(session).includes("evil.example"));
});

Deno.test("TRY price_data amount and currency are copied from the pricing row", async () => {
  const { handler, sessions } = setup();
  const response = await handler(request({ package_id: "pro" }));
  assertEquals(response.status, 200);

  const session = sessions[0] as Record<string, unknown>;
  assertEquals(session.mode, "payment");
  assertEquals(session.line_items, [
    {
      price_data: {
        currency: "try",
        unit_amount: 60000,
        product_data: { name: "Pro - 600 jeton" },
      },
      quantity: 1,
    },
  ]);
  assertEquals(session.metadata, {
    kind: "coin_pack",
    firm_id: FIRM.id,
    firm_user_id: USER.id,
    package_id: "pro",
    plan_id: "pro",
    coins: "600",
  });
  assertEquals(session.client_reference_id, FIRM.id);
  assertEquals(session.billing_address_collection, "required");
  assertEquals(session.tax_id_collection, { enabled: true });
});

Deno.test("a pricing row with stripe_price_id uses that price instead of price_data", async () => {
  const { handler, sessions } = setup();
  await handler(request({ package_id: "ultra" }));
  assertEquals((sessions[0] as Record<string, unknown>).line_items, [{ price: "price_override_test", quantity: 1 }]);
});

Deno.test("a user without exactly one firm gets firm_required", async () => {
  for (const firms of [[], [{ ...FIRM, user_id: USER.id }, { ...FIRM, id: "other", user_id: USER.id }]]) {
    const { handler, sessions } = setup({ firms });
    const response = await handler(request({ package_id: "starter" }));
    assertEquals(response.status, 200);
    assertEquals(await response.json(), { error: "Önce firma hesabınızı tamamlayın", code: "firm_required" });
    assertEquals(sessions.length, 0);
  }
});

Deno.test("the Stripe customer is created once, stored on the firm, and reused afterwards", async () => {
  const first = setup();
  await first.handler(request({ package_id: "starter" }));
  assertEquals(first.customers.length, 1);
  assertEquals(first.customers[0].metadata, { firm_id: FIRM.id, supabase_user_id: USER.id });
  assertEquals(first.updates, [{ table: "firms", patch: { stripe_customer_id: "cus_new" }, filters: [["id", FIRM.id]] }]);
  assertEquals((first.sessions[0] as Record<string, unknown>).customer, "cus_new");

  const returning = setup({ firms: [{ ...FIRM, user_id: USER.id, stripe_customer_id: "cus_existing" }] });
  await returning.handler(request({ package_id: "starter" }));
  assertEquals(returning.customers.length, 0);
  assertEquals((returning.sessions[0] as Record<string, unknown>).customer, "cus_existing");
});

Deno.test("a stored customer unknown to Stripe is replaced once and the session is retried", async () => {
  const { handler, sessions, customers, updates } = setup({
    firms: [{ ...FIRM, user_id: USER.id, stripe_customer_id: "cus_test_mode" }],
    missingCustomers: ["cus_test_mode"],
  });
  const response = await handler(request({ package_id: "starter" }));
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
      firms: [{ ...FIRM, user_id: USER.id, stripe_customer_id: "cus_existing" }],
      sessionError: Object.assign(new Error("rate limited"), { code: "rate_limit" }),
    });
    const response = await handler(request({ package_id: "starter" }));
    assertEquals(response.status, 500);
    assertEquals(customers.length, 0);
    assertEquals(sessions.length, 0);
    assertEquals(updates.length, 0);
  } finally {
    console.error = originalError;
  }
});

Deno.test("a missing or invalid session returns 401", async () => {
  const noHeader = setup();
  const response = await noHeader.handler(
    new Request("https://example.test/create-coin-checkout", { method: "POST", body: JSON.stringify({ package_id: "starter" }) }),
  );
  assertEquals(response.status, 401);

  const invalid = setup({ user: null });
  const response2 = await invalid.handler(request({ package_id: "starter" }));
  assertEquals(response2.status, 401);
  assertEquals(invalid.sessions.length, 0);
});

Deno.test("a Stripe failure returns a generic 500 and does not leak details", async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    // Musteri olusturma asamasinda Stripe hatasi
    const deps: CheckoutDeps = {
      authClient: { auth: { getUser: () => Promise.resolve({ data: { user: USER }, error: null }) } } as unknown as CheckoutDeps["authClient"],
      admin: fakeAdmin({ pricing_plans: PLANS, firms: [{ ...FIRM, user_id: USER.id }] }, []),
      stripe: {
        createCustomer: () => Promise.reject(new Error("sk_live_secret exploded")),
        createCheckoutSession: () => Promise.reject(new Error("unreachable")),
      },
      env: () => "https://www.peyzajbul.com",
    };
    const failing = createCoinCheckoutHandler(deps);
    const response = await failing(request({ package_id: "starter" }));
    assertEquals(response.status, 500);
    const text = await response.text();
    assertFalse(text.includes("sk_live_secret"));
  } finally {
    console.error = originalError;
  }
});
