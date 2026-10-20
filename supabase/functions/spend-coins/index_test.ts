// How to run: deno test --allow-env supabase/functions
import { assert, assertEquals, assertFalse, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  buildLeadEmail,
  createSpendHandler,
  escapeHtml,
  type EmailMessage,
  RPC_ERROR_MESSAGES,
} from "./handler.ts";

const LEAD_ID = "10000000-0000-4000-8000-000000000001";
const USER_ID = "20000000-0000-4000-8000-000000000002";

interface FakeOptions {
  rpcResult?: { data: unknown; error: { message: string; code?: string } | null };
  lead?: Record<string, unknown> | null;
  user?: { id: string } | null;
}

function setup(options: FakeOptions = {}) {
  const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const emails: EmailMessage[] = [];

  const admin = {
    rpc: (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      return Promise.resolve(options.rpcResult ?? { data: { new_balance: 80, company_name: "Yeşil Bahçe" }, error: null });
    },
    from: (_table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({
              data: options.lead === undefined
                ? { email: "ev@example.com", full_name: "Ayşe", service_type: "Bahçe", city: "İzmir" }
                : options.lead,
              error: null,
            }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;

  const authClient = {
    auth: {
      getUser: (_token: string) =>
        Promise.resolve(
          options.user === null
            ? { data: { user: null }, error: { message: "invalid jwt" } }
            : { data: { user: options.user ?? { id: USER_ID } }, error: null },
        ),
    },
  } as unknown as Pick<SupabaseClient, "auth">;

  const handler = createSpendHandler({
    authClient,
    admin,
    sendEmail: (message) => {
      emails.push(message);
      return Promise.resolve();
    },
  });

  return { handler, rpcCalls, emails };
}

function request(body: unknown, headers: Record<string, string> = { Authorization: "Bearer token" }): Request {
  return new Request("https://example.test/spend-coins", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

Deno.test("every purchase_lead error code maps to its Turkish message with HTTP 200", async () => {
  const expected: Record<string, string> = {
    sold_out: "Bu müşteri adayı satış limitine ulaştı (Maksimum 3 firma satın alabilir).",
    already_purchased: "Bu lead zaten satın alınmış",
    insufficient_balance: "Yetersiz jeton bakiyesi",
    firm_not_found: "Firma bulunamadı veya henüz onaylanmadı",
    lead_unavailable: "Bu müşteri adayı şu anda satın alınamaz",
  };
  assertEquals(RPC_ERROR_MESSAGES, expected);

  for (const [code, message] of Object.entries(expected)) {
    const { handler, emails } = setup({ rpcResult: { data: null, error: { message: code } } });
    const response = await handler(request({ lead_id: LEAD_ID }));
    assertEquals(response.status, 200, code);
    assertEquals(await response.json(), { success: false, error: message, code });
    assertEquals(emails.length, 0, "no email on a failed purchase");
  }
});

Deno.test("unknown RPC error returns a generic 500 without leaking SQL text", async () => {
  const errors: unknown[][] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => errors.push(args);
  try {
    const { handler } = setup({
      rpcResult: {
        data: null,
        error: { message: 'duplicate key value violates unique constraint "lead_purchases_lead_firm_uniq"', code: "23505" },
      },
    });
    const response = await handler(request({ lead_id: LEAD_ID }));
    assertEquals(response.status, 500);
    const text = await response.text();
    assertEquals(JSON.parse(text), { error: "İşlem tamamlanamadı, lütfen tekrar deneyin" });
    assertFalse(text.includes("lead_purchases"), "SQL text must not reach the client");
    assert(errors.length > 0, "the failure is logged server-side");
  } finally {
    console.error = originalError;
  }
});

Deno.test("missing or invalid session returns 401 Oturum gerekli", async () => {
  const noHeader = setup();
  const r1 = await noHeader.handler(request({ lead_id: LEAD_ID }, {}));
  assertEquals(r1.status, 401);
  assertEquals(await r1.json(), { error: "Oturum gerekli" });
  assertEquals(noHeader.rpcCalls.length, 0);

  const badToken = setup({ user: null });
  const r2 = await badToken.handler(request({ lead_id: LEAD_ID }));
  assertEquals(r2.status, 401);
  assertEquals(await r2.json(), { error: "Oturum gerekli" });
  assertEquals(badToken.rpcCalls.length, 0);
});

Deno.test("invalid lead_id is rejected before any RPC call", async () => {
  const { handler, rpcCalls } = setup();
  const response = await handler(request({ lead_id: "not-a-uuid" }));
  assertEquals(response.status, 400);
  assertEquals(rpcCalls.length, 0);
});

Deno.test("success keeps the {success, new_balance} contract and calls the RPC with the session user", async () => {
  const { handler, rpcCalls, emails } = setup();
  const response = await handler(request({ lead_id: LEAD_ID }));
  assertEquals(response.status, 200);
  assertEquals(await response.json(), { success: true, new_balance: 80 });
  assertEquals(rpcCalls, [{ fn: "purchase_lead", args: { p_uid: USER_ID, p_lead: LEAD_ID } }]);
  assertEquals(emails.length, 1);
  assertEquals(emails[0].to, "ev@example.com");
  assertStringIncludes(emails[0].html, "talebinizle ilgilenmek üzere sizinle iletişime geçebilir");
  assertFalse(emails[0].html.includes("gün içerisinde"));
});

Deno.test("an email failure never fails a completed purchase", async () => {
  const errors: unknown[][] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => errors.push(args);
  try {
    const admin = {
      rpc: () => Promise.resolve({ data: { new_balance: 5, company_name: "Firma" }, error: null }),
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.reject(new Error("boom")) }) }),
      }),
    } as unknown as SupabaseClient;
    const handler = createSpendHandler({
      authClient: { auth: { getUser: () => Promise.resolve({ data: { user: { id: USER_ID } }, error: null }) } } as unknown as Pick<SupabaseClient, "auth">,
      admin,
      sendEmail: () => Promise.resolve(),
    });
    const response = await handler(request({ lead_id: LEAD_ID }));
    assertEquals(response.status, 200);
    assertEquals(await response.json(), { success: true, new_balance: 5 });
  } finally {
    console.error = originalError;
  }
});

Deno.test("escapeHtml neutralizes script tags and quotes", () => {
  const escaped = escapeHtml('<script>alert("x")</script>');
  assertFalse(escaped.includes("<script>"));
  assertEquals(escaped, "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  assertEquals(escapeHtml(null), "");
  assertEquals(escapeHtml("a & b's"), "a &amp; b&#39;s");
});

Deno.test("lead email escapes full_name, company_name, service_type and city", () => {
  const { html } = buildLeadEmail(
    { full_name: "<script>alert(1)</script>", service_type: "<img src=x onerror=1>", city: "<b>İzmir</b>" },
    "<i>Firma</i>",
  );
  assertFalse(html.includes("<script>"));
  assertFalse(html.includes("<img"));
  assertFalse(html.includes("<b>İzmir"));
  assertFalse(html.includes("<i>Firma"));
  assertStringIncludes(html, "&lt;script&gt;");
});
