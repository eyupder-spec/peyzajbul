// How to run: deno test --allow-env supabase/functions
import { assertEquals, assertFalse } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createExpireHandler, timingSafeEqual } from "./handler.ts";

const SERVICE_KEY = "service-role-key-fixture";
const CRON_SECRET = "cron-secret-fixture";

function setup(rpcResult: { data: unknown; error: { message: string } | null } = { data: 3, error: null }) {
  const calls: string[] = [];
  const admin = {
    rpc: (fn: string) => {
      calls.push(fn);
      return Promise.resolve(rpcResult);
    },
  } as unknown as SupabaseClient;
  const handler = createExpireHandler({
    admin,
    serviceRoleKey: SERVICE_KEY,
    cronSecret: CRON_SECRET,
    now: () => new Date("2026-10-21T00:10:00.000Z"),
  });
  return { handler, calls };
}

Deno.test("requests without the service key or cron secret get 401 and never reach the database", async () => {
  const { handler, calls } = setup();
  const rejected: Array<Record<string, string>> = [
    {},
    { Authorization: "Bearer wrong" },
    { Authorization: "Bearer " },
    { "x-cron-secret": "wrong" },
    { Authorization: `Bearer ${SERVICE_KEY}x` },
  ];
  for (const headers of rejected) {
    const response = await handler(new Request("https://example.test/expire-premiums", { method: "POST", headers }));
    assertEquals(response.status, 401, JSON.stringify(headers));
  }
  assertEquals(calls.length, 0);
});

Deno.test("an unset CRON_SECRET never authorizes an empty header", async () => {
  const handler = createExpireHandler({
    admin: { rpc: () => Promise.resolve({ data: 1, error: null }) } as unknown as SupabaseClient,
    serviceRoleKey: SERVICE_KEY,
    cronSecret: undefined,
    now: () => new Date(),
  });
  const response = await handler(new Request("https://example.test/expire-premiums", { method: "POST", headers: { "x-cron-secret": "" } }));
  assertEquals(response.status, 401);
});

Deno.test("the service role key or the cron secret runs expire_premiums and returns only counts", async () => {
  const accepted: Array<Record<string, string>> = [{ Authorization: `Bearer ${SERVICE_KEY}` }, { "x-cron-secret": CRON_SECRET }];
  for (const headers of accepted) {
    const { handler, calls } = setup();
    const response = await handler(new Request("https://example.test/expire-premiums", { method: "POST", headers }));
    assertEquals(response.status, 200);
    assertEquals(await response.json(), { success: true, expired_count: 3, checked_at: "2026-10-21T00:10:00.000Z" });
    assertEquals(calls, ["expire_premiums"]);
    assertEquals(response.headers.get("Access-Control-Allow-Origin"), null);
  }
});

Deno.test("a database error returns a generic 500", async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const { handler } = setup({ data: null, error: { message: "relation firms is broken" } });
    const response = await handler(
      new Request("https://example.test/expire-premiums", { method: "POST", headers: { Authorization: `Bearer ${SERVICE_KEY}` } }),
    );
    assertEquals(response.status, 500);
    assertFalse((await response.text()).includes("relation"));
  } finally {
    console.error = originalError;
  }
});

Deno.test("timingSafeEqual compares by value", () => {
  assertEquals(timingSafeEqual("abc", "abc"), true);
  assertEquals(timingSafeEqual("abc", "abd"), false);
  assertEquals(timingSafeEqual("abc", "abcd"), false);
  assertEquals(timingSafeEqual("", ""), true);
});
